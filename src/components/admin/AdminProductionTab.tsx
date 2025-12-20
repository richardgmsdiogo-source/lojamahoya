import { useState, useEffect, useMemo } from 'react';
import { Factory, Play, Search, AlertTriangle, Check, Trash2, Clock, CheckCircle, XCircle, Ban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { formatCurrencyBRL, formatQuantityBR } from '@/lib/format';

type MeasurementUnit = Database['public']['Enums']['measurement_unit'];

type ProductionStatus = 'produzindo' | 'concluido' | 'perda' | 'estornado';

const STATUS_CONFIG: Record<
  ProductionStatus,
  { label: string; icon: React.ComponentType<any>; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  produzindo: { label: 'Produzindo', icon: Clock, variant: 'outline' },
  concluido: { label: 'Concluído', icon: CheckCircle, variant: 'default' },
  perda: { label: 'Perda', icon: XCircle, variant: 'destructive' },
  estornado: { label: 'Estornado', icon: Ban, variant: 'secondary' }
};

type ProductionBatch = Database['public']['Tables']['production_batches']['Row'] & {
  products: { name: string } | null;
  recipes: { version: number } | null;
  production_batch_items: Array<{
    raw_material_id: string;
    quantity_consumed: number;
    unit: string;
    cost_per_unit: number; // snapshot salvo no lote (ok)
    total_cost: number; // snapshot salvo no lote (ok)
    raw_materials: { name: string } | null;
  }>;
};

type RecipeWithItems = {
  id: string;
  product_id: string;
  version: number;
  is_active?: boolean;
  products: { id: string; name: string } | null;
  recipe_items: Array<{
    raw_material_id: string;
    quantity: number;
    unit: MeasurementUnit;
    raw_materials: {
      id: string;
      name: string;
      current_quantity: number;
      cost_per_unit: number | null;
      unit: MeasurementUnit;
    } | null;
  }>;
};

interface SimulationResult {
  valid: boolean;
  items: Array<{
    raw_material_id: string;
    name: string;
    required: number;
    available: number;
    unit: string;
    cost_per_unit: number; // avg_cost_per_unit
    total_cost: number;
    sufficient: boolean;
    balance_after: number;
    avg_is_zero: boolean;
  }>;
  totalCost: number;
  unitCost: number;
}

type RpcResult = { success: boolean; error?: string; batch_id?: string; new_status?: string; total_cost?: number; unit_cost?: number };

const safeNum = (v: any) => {
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

// Converte L->ml e kg->g
const toBaseQty = (qty: number, unit: MeasurementUnit | string): number => {
  if (unit === 'l') return qty * 1000;
  if (unit === 'kg') return qty * 1000;
  return qty;
};

const baseUnitLabel = (unit: MeasurementUnit | string): string => {
  if (unit === 'l') return 'ml';
  if (unit === 'kg') return 'g';
  return String(unit);
};

export const AdminProductionTab = () => {
  const [batches, setBatches] = useState<ProductionBatch[]>([]);
  const [activeRecipes, setActiveRecipes] = useState<RecipeWithItems[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProduceOpen, setIsProduceOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [produceData, setProduceData] = useState({
    recipe_id: '',
    quantity: '',
    notes: '',
    initial_status: 'produzindo' as ProductionStatus
  });

  const [simulation, setSimulation] = useState<SimulationResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [statusChangeDialog, setStatusChangeDialog] = useState<{ batch: ProductionBatch; newStatus: ProductionStatus } | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<ProductionBatch | null>(null);

  const { toast } = useToast();

  const fetchData = async () => {
    setIsLoading(true);

    const [{ data: batchesData, error: batchesErr }, { data: recipesData, error: recipesErr }] = await Promise.all([
      supabase
        .from('production_batches')
        .select(`
          id,
          product_id,
          recipe_id,
          quantity_produced,
          total_cost,
          unit_cost,
          notes,
          produced_by,
          reversed_at,
          reversed_by,
          created_at,
          status,
          products(name),
          recipes(version),
          production_batch_items(
            raw_material_id,
            quantity_consumed,
            unit,
            cost_per_unit,
            total_cost,
            raw_materials(name)
          )
        `)

        .order('created_at', { ascending: false })
        .limit(50),

      // ✅ receitas ativas com custo médio correto
      supabase
        .from('recipes')
        .select(
          `
          id,
          product_id,
          version,
          is_active,
          products(id, name),
          recipe_items(
            raw_material_id,
            quantity,
            unit,
            raw_materials(
              id,
              name,
              current_quantity,
              cost_per_unit,
              unit
            )
          )
        `
        )
        .eq('is_active', true)
    ]);

    if (batchesErr) {
      toast({ title: 'Erro', description: batchesErr.message || 'Falha ao carregar lotes.', variant: 'destructive' });
      setBatches([]);
    } else {
      setBatches((batchesData as ProductionBatch[]) || []);
    }

    if (recipesErr) {
      toast({ title: 'Erro', description: recipesErr.message || 'Falha ao carregar receitas ativas.', variant: 'destructive' });
      setActiveRecipes([]);
    } else {
      setActiveRecipes((recipesData as any as RecipeWithItems[]) || []);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetProduceForm = () => {
    setProduceData({ recipe_id: '', quantity: '', notes: '', initial_status: 'produzindo' });
    setSimulation(null);
  };

  // ✅ custo “ao vivo” da receita (baseado no avg_cost_per_unit atual)
  const getRecipeLiveUnitCost = (recipe: RecipeWithItems) => {
    const items = recipe.recipe_items || [];
    const total = items.reduce((acc, it) => {
      const mat = it.raw_materials;
      if (!mat) return acc;
      const requiredBase = toBaseQty(safeNum(it.quantity), it.unit);
      const avg = safeNum(mat.cost_per_unit);
      return acc + requiredBase * avg;
    }, 0);

    return total; // custo por 1 unidade do produto
  };

  const selectedRecipe = useMemo(() => {
    return activeRecipes.find((r) => r.id === produceData.recipe_id) || null;
  }, [activeRecipes, produceData.recipe_id]);

  const simulateProduction = () => {
    const recipe = selectedRecipe;
    const qty = Math.floor(safeNum(produceData.quantity));

    if (!recipe || !qty || qty <= 0) {
      setSimulation(null);
      return;
    }

    const items: SimulationResult['items'] = (recipe.recipe_items || [])
      .map((it) => {
        const mat = it.raw_materials;
        if (!mat) return null;

        const requiredPerUnitBase = toBaseQty(safeNum(it.quantity), it.unit);
        const totalRequiredBase = requiredPerUnitBase * qty;

        const availableBase = safeNum(mat.current_quantity);

        // ✅ custo correto
        const costPerUnit = safeNum(mat.cost_per_unit);
        const totalCost = totalRequiredBase * costPerUnit;

        const sufficient = availableBase >= totalRequiredBase;
        const balanceAfter = availableBase - totalRequiredBase;

        return {
          raw_material_id: it.raw_material_id,
          name: mat.name,
          required: totalRequiredBase,
          available: availableBase,
          unit: baseUnitLabel(mat.unit),
          cost_per_unit: costPerUnit,
          total_cost: totalCost,
          sufficient,
          balance_after: balanceAfter,
          avg_is_zero: costPerUnit <= 0
        };
      })
      .filter(Boolean) as SimulationResult['items'];

    const totalCost = items.reduce((acc, i) => acc + i.total_cost, 0);

    // válido = estoque suficiente (custo 0 não bloqueia; só alerta)
    const valid = items.every((i) => i.sufficient);

    setSimulation({
      valid,
      items,
      totalCost,
      unitCost: totalCost / qty
    });
  };

  useEffect(() => {
    if (produceData.recipe_id && produceData.quantity) simulateProduction();
    else setSimulation(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [produceData.recipe_id, produceData.quantity, selectedRecipe]);

  const handleProduce = async () => {
    if (!simulation || !simulation.valid) return;

    // alerta: custo médio 0 em algum insumo (não impede, mas você deve corrigir)
    const anyZero = simulation.items.some((i) => i.avg_is_zero);
    if (anyZero) {
      toast({
        title: 'Atenção',
        description: 'Há insumos com custo médio 0. O custo do lote pode ficar subestimado. Registre entradas com valor para corrigir.',
        variant: 'destructive'
      });
      // se você quiser BLOQUEAR, descomente:
      // return;
    }

    setIsSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    const qty = Math.floor(safeNum(produceData.quantity));

    // RPC atômico (backend precisa calcular custo também usando avg_cost_per_unit)
    const { data, error } = await supabase.rpc('create_production_batch', {
      p_recipe_id: produceData.recipe_id,
      p_quantity: qty,
      p_notes: produceData.notes || null,
      p_user_id: user?.id || null,
      p_initial_status: produceData.initial_status
    });

    setIsSubmitting(false);
    const result = data as RpcResult | null;

    if (error || !result?.success) {
      toast({
        title: 'Erro',
        description: result?.error || error?.message || 'Erro ao criar produção.',
        variant: 'destructive'
      });
      return;
    }

    toast({
      title: 'Produção Registrada',
      description: `${qty} unidades em ${STATUS_CONFIG[produceData.initial_status].label.toLowerCase()}.`
    });

    setIsProduceOpen(false);
    resetProduceForm();
    fetchData();
  };

  const handleStatusChange = async (batch: ProductionBatch, newStatus: ProductionStatus) => {
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase.rpc('change_production_status', {
      p_batch_id: batch.id,
      p_new_status: newStatus,
      p_user_id: user?.id || null
    });

    const result = data as RpcResult | null;

    if (error || !result?.success) {
      toast({
        title: 'Erro',
        description: result?.error || error?.message || 'Erro ao alterar status.',
        variant: 'destructive'
      });
      return;
    }

    toast({ title: 'Status Atualizado', description: `Lote alterado para ${STATUS_CONFIG[newStatus].label}.` });
    setStatusChangeDialog(null);
    fetchData();
  };

  const handleDelete = async (batch: ProductionBatch) => {
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase.rpc('delete_production_batch', {
      p_batch_id: batch.id,
      p_user_id: user?.id || null
    });

    const result = data as RpcResult | null;

    if (error || !result?.success) {
      toast({
        title: 'Erro',
        description: result?.error || error?.message || 'Erro ao excluir lote.',
        variant: 'destructive'
      });
      return;
    }

    toast({ title: 'Excluído', description: 'Lote excluído com sucesso.' });
    setDeleteDialog(null);
    fetchData();
  };

  const getAvailableStatusTransitions = (currentStatus: string): ProductionStatus[] => {
    switch (currentStatus) {
      case 'produzindo':
        return ['concluido', 'perda', 'estornado'];
      case 'concluido':
        return ['perda', 'estornado'];
      case 'perda':
        return ['estornado'];
      default:
        return [];
    }
  };

  const filteredBatches = batches.filter((b) => b.products?.name?.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar lotes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Dialog
          open={isProduceOpen}
          onOpenChange={(open) => {
            setIsProduceOpen(open);
            if (!open) resetProduceForm();
          }}
        >
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Factory className="h-4 w-4" />
              Nova Produção
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Produzir Lote</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label>Produto (com receita ativa) *</Label>
                <Select value={produceData.recipe_id} onValueChange={(v) => setProduceData({ ...produceData, recipe_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o produto" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeRecipes.map((r) => {
                      const liveUnitCost = getRecipeLiveUnitCost(r);
                      return (
                        <SelectItem key={r.id} value={r.id}>
                          {r.products?.name} (v{r.version}) - {formatCurrencyBRL(liveUnitCost)}/un
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Quantidade a Produzir *</Label>
                <Input
                  type="number"
                  min="1"
                  value={produceData.quantity}
                  onChange={(e) => setProduceData({ ...produceData, quantity: e.target.value })}
                  placeholder="Ex: 10"
                />
              </div>

              <div>
                <Label>Status Inicial</Label>
                <Select
                  value={produceData.initial_status}
                  onValueChange={(v: ProductionStatus) => setProduceData({ ...produceData, initial_status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="produzindo">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" /> Produzindo (reserva estoque)
                      </div>
                    </SelectItem>
                    <SelectItem value="concluido">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" /> Concluído (adiciona ao estoque final)
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Observações</Label>
                <Textarea
                  value={produceData.notes}
                  onChange={(e) => setProduceData({ ...produceData, notes: e.target.value })}
                  placeholder="Notas sobre a produção..."
                  rows={2}
                />
              </div>

              {simulation && (
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    {simulation.valid ? <Check className="h-5 w-5 text-green-500" /> : <AlertTriangle className="h-5 w-5 text-destructive" />}
                    Simulação de Produção (custo médio)
                  </h4>

                  {simulation.items.some((i) => i.avg_is_zero) && (
                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm">
                      ⚠️ Existem insumos com <strong>custo médio 0</strong>. Registre uma entrada (compra) com valor para corrigir.
                    </div>
                  )}

                  <div className="space-y-2">
                    {simulation.items.map((item, i) => (
                      <div
                        key={i}
                        className={`p-3 rounded-lg ${item.sufficient ? 'bg-muted/50' : 'bg-destructive/10 border border-destructive/30'}`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-muted-foreground">
                              Necessário: {formatQuantityBR(item.required, item.unit)} {item.unit} | Disponível: {formatQuantityBR(item.available, item.unit)} {item.unit}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Custo médio: <strong>{formatCurrencyBRL(item.cost_per_unit)}</strong> / {item.unit}
                            </p>
                          </div>

                          <div className="text-right">
                            <p className="font-medium">{formatCurrencyBRL(item.total_cost)}</p>
                            {!item.sufficient && (
                              <Badge variant="destructive">
                                Falta {formatQuantityBR(item.required - item.available, item.unit)} {item.unit}
                              </Badge>
                            )}
                            {item.sufficient && (
                              <p className="text-xs text-muted-foreground">
                                Sobra: {formatQuantityBR(item.balance_after, item.unit)} {item.unit}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className={`p-4 rounded-lg ${simulation.valid ? 'bg-primary/10' : 'bg-destructive/10'}`}>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Custo Total do Lote</p>
                        <p className="text-xl font-bold">{formatCurrencyBRL(simulation.totalCost)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Custo por Unidade</p>
                        <p className="text-xl font-bold">{formatCurrencyBRL(simulation.unitCost)}</p>
                      </div>
                    </div>
                  </div>

                  {!simulation.valid && <p className="text-sm text-destructive text-center">Estoque insuficiente para realizar a produção</p>}
                </div>
              )}

              <Button onClick={handleProduce} className="w-full" disabled={!simulation?.valid || isSubmitting}>
                <Play className="h-4 w-4 mr-2" />
                {isSubmitting ? 'Processando...' : 'Confirmar Produção'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Batches List */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Lotes ({filteredBatches.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center text-muted-foreground py-8">Carregando...</p>
          ) : filteredBatches.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhum lote de produção encontrado</p>
          ) : (
            <div className="space-y-3">
              {filteredBatches.map((batch) => {
                const status = (batch.status as ProductionStatus) || 'produzindo';
                const StatusIcon = STATUS_CONFIG[status]?.icon || CheckCircle;
                const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.concluido;
                const availableTransitions = getAvailableStatusTransitions(status);

                return (
                  <div
                    key={batch.id}
                    className={`p-4 rounded-lg ${
                      status === 'estornado' || status === 'perda'
                        ? 'bg-muted/30 opacity-70'
                        : status === 'produzindo'
                        ? 'bg-amber-500/10 border border-amber-500/20'
                        : 'bg-muted/50'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium">{batch.products?.name}</p>
                          <Badge variant={statusConfig.variant} className="gap-1">
                            <StatusIcon className="h-3 w-3" />
                            {statusConfig.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {new Date(batch.created_at || '').toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                          {' | '}Receita v{batch.recipes?.version}
                        </p>
                        <p className="text-xs text-muted-foreground">ID: {batch.id.slice(0, 8)}</p>
                        {batch.notes && <p className="text-xs text-muted-foreground italic">{batch.notes}</p>}

                        <div className="text-xs text-muted-foreground mt-2">
                          Consumo:{' '}
                          {batch.production_batch_items.map((item, i) => (
                            <span key={i}>
                              {item.raw_materials?.name}: {formatQuantityBR(item.quantity_consumed, item.unit)} {item.unit}
                              {i < batch.production_batch_items.length - 1 ? ' | ' : ''}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <div className="text-right">
                          <p className="font-bold text-lg">{batch.quantity_produced} un.</p>
                          <p className="text-sm text-muted-foreground">Total: {formatCurrencyBRL(batch.total_cost)}</p>
                          <p className="text-xs text-muted-foreground">Unitário: {formatCurrencyBRL(batch.unit_cost)}</p>
                        </div>

                        {availableTransitions.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {availableTransitions.map((newStatus) => {
                              const config = STATUS_CONFIG[newStatus];
                              const Icon = config.icon;
                              return (
                                <Button
                                  key={newStatus}
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setStatusChangeDialog({ batch, newStatus })}
                                  className="text-xs"
                                >
                                  <Icon className="h-3 w-3 mr-1" />
                                  {config.label}
                                </Button>
                              );
                            })}
                          </div>
                        )}

                        <Button variant="destructive" size="sm" onClick={() => setDeleteDialog(batch)}>
                          <Trash2 className="h-4 w-4 mr-1" />
                          Excluir
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status Change Confirmation Dialog */}
      <AlertDialog open={!!statusChangeDialog} onOpenChange={() => setStatusChangeDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Alteração de Status</AlertDialogTitle>
            <AlertDialogDescription>
              {statusChangeDialog && (
                <>
                  Deseja alterar o lote <strong>{statusChangeDialog.batch.products?.name}</strong> para{' '}
                  <strong>{STATUS_CONFIG[statusChangeDialog.newStatus].label}</strong>?
                  <br />
                  <br />
                  {statusChangeDialog.newStatus === 'estornado' && (
                    <span className="text-amber-600">Isso irá devolver todos os insumos ao estoque.</span>
                  )}
                  {statusChangeDialog.newStatus === 'perda' && (
                    <span className="text-destructive">Os insumos consumidos NÃO serão devolvidos ao estoque.</span>
                  )}
                  {statusChangeDialog.newStatus === 'concluido' && (
                    <span className="text-green-600">O produto será adicionado ao estoque de produtos acabados.</span>
                  )}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => statusChangeDialog && handleStatusChange(statusChangeDialog.batch, statusChangeDialog.newStatus)}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Lote de Produção</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteDialog && (
                <>
                  Tem certeza que deseja excluir permanentemente o lote <strong>{deleteDialog.products?.name}</strong> ({deleteDialog.quantity_produced}{' '}
                  unidades)?
                  <br />
                  <br />
                  {deleteDialog.status === 'produzindo' && <span className="text-amber-600">Os insumos reservados serão devolvidos ao estoque.</span>}
                  {deleteDialog.status === 'concluido' && (
                    <span className="text-destructive">
                      O estoque de produtos acabados será ajustado. Considere usar "Estornar" ao invés de excluir.
                    </span>
                  )}
                  {(deleteDialog.status === 'perda' || deleteDialog.status === 'estornado') && (
                    <span className="text-muted-foreground">Este registro será removido permanentemente do histórico.</span>
                  )}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteDialog && handleDelete(deleteDialog)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir Permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
