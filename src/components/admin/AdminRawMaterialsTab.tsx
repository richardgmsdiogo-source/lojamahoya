import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Eye, EyeOff, History, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { formatCostPerUnit, formatNumberBR } from '@/lib/format';

type RawMaterial = Database['public']['Tables']['raw_materials']['Row'];
type RawMaterialCategory = Database['public']['Enums']['raw_material_category'];
type MeasurementUnit = Database['public']['Enums']['measurement_unit'];

// ⚠️ Alinha com sua tabela real (raw_material_movements):
// - quantity (numeric) pode ser negativo (saídas)
// - cost_per_unit_at_time existe
// - NÃO existe total_value e unit_cost na sua base atual
type MovementRow = {
  id: string;
  raw_material_id: string;
  movement_type: 'entrada' | 'ajuste' | 'perda';
  quantity: number;
  cost_per_unit_at_time: number;
  balance_before: number;
  balance_after: number;
  notes?: string | null;
  created_at?: string | null;
};

const CATEGORIES: { value: RawMaterialCategory; label: string }[] = [
  { value: 'base', label: 'Base' },
  { value: 'essencia', label: 'Essência' },
  { value: 'fixador', label: 'Fixador' },
  { value: 'corante', label: 'Corante' },
  { value: 'frasco', label: 'Frasco' },
  { value: 'rotulo', label: 'Rótulo' },
  { value: 'caixa', label: 'Caixa' },
  { value: 'outro', label: 'Outro' },
];

const UNITS: { value: MeasurementUnit; label: string }[] = [
  { value: 'ml', label: 'Mililitro (ml)' },
  { value: 'l', label: 'Litro (L)' },
  { value: 'g', label: 'Grama (g)' },
  { value: 'kg', label: 'Quilograma (kg)' },
  { value: 'unidade', label: 'Unidade' },
];

const safeNum = (v: any) => {
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

const toBaseQty = (qty: number, unit: MeasurementUnit) => {
  if (unit === 'l') return qty * 1000;
  if (unit === 'kg') return qty * 1000;
  return qty;
};

const baseUnitLabel = (unit: MeasurementUnit) => (unit === 'l' ? 'ml' : unit === 'kg' ? 'g' : unit);

const movementLabel = (t: MovementRow['movement_type']) => {
  if (t === 'entrada') return 'Entrada (compra)';
  if (t === 'ajuste') return 'Ajuste (inventário/correção)';
  if (t === 'perda') return 'Perda';
  return t;
};

export const AdminRawMaterialsTab = () => {
  
  const { toast } = useToast();

  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [movements, setMovements] = useState<MovementRow[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<RawMaterial | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  const [isOpen, setIsOpen] = useState(false);
  const [isMovementOpen, setIsMovementOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const [editingMaterial, setEditingMaterial] = useState<RawMaterial | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // ✅ Cadastro: só o “registro” do item
  const [formData, setFormData] = useState({
    name: '',
    category: 'outro' as RawMaterialCategory,
    unit: 'ml' as MeasurementUnit,
    minimum_stock: '',
    is_active: true,
  });

  // ✅ Movimentação: tipo + direção (no ajuste) + quantidade + valor + observações
  // Observação importante:
  // - Sua tabela não tem total_value; então vamos guardar o "Valor (R$)" dentro de notes
  //   no formato: "R$ 123.45 | ...".
  const [movementData, setMovementData] = useState({
    type: 'entrada' as 'entrada' | 'ajuste' | 'perda',
    direction: 'add' as 'add' | 'remove',
    quantity: '',
    total_value: '',
    notes: '',
  });

  const fetchMaterials = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from('raw_materials').select('*').order('name');

    if (error) {
      toast({ title: 'Erro', description: error.message || 'Erro ao carregar matérias-primas.', variant: 'destructive' });
      setMaterials([]);
    } else {
      setMaterials(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchMaterials();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => {
    setFormData({
      name: '',
      category: 'outro',
      unit: 'ml',
      minimum_stock: '',
      is_active: true,
    });
    setEditingMaterial(null);
  };

  const openEdit = (material: RawMaterial) => {
    setEditingMaterial(material);
    setFormData({
      name: material.name,
      category: material.category,
      unit: material.unit,
      minimum_stock: String(material.minimum_stock ?? 0),
      is_active: material.is_active,
    });
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      name: formData.name.trim(),
      category: formData.category,
      unit: formData.unit,
      minimum_stock: safeNum(formData.minimum_stock),
      is_active: formData.is_active,
    };

    if (!payload.name) {
      toast({ title: 'Atenção', description: 'Informe o nome da matéria-prima.', variant: 'destructive' });
      return;
    }

    if (editingMaterial) {
      const { error } = await supabase.from('raw_materials').update(payload).eq('id', editingMaterial.id);
      if (error) {
        toast({ title: 'Erro', description: error.message || 'Erro ao atualizar matéria-prima.', variant: 'destructive' });
        return;
      }
      toast({ title: 'Atualizado', description: 'Matéria-prima atualizada com sucesso.' });
    } else {
      // ✅ NÃO tente inserir cost_per_unit: na sua tabela ela é GENERATED ALWAYS
      const { error } = await supabase.from('raw_materials').insert({
        ...payload,
        current_quantity: 0,
      });

      if (error) {
        toast({ title: 'Erro', description: error.message || 'Erro ao criar matéria-prima.', variant: 'destructive' });
        return;
      }
      toast({ title: 'Criado', description: 'Matéria-prima criada com sucesso.' });
    }

    setIsOpen(false);
    resetForm();
    fetchMaterials();
  };

  const deleteMaterial = async (id: string) => {
    const { error } = await supabase.from('raw_materials').delete().eq('id', id);

    if (error) {
      if ((error as any).code === '23503') {
        toast({
          title: 'Não é possível excluir',
          description: 'Esta matéria-prima está vinculada. Desative em vez de excluir.',
          variant: 'destructive',
        });
      } else {
        toast({ title: 'Erro', description: error.message || 'Erro ao excluir matéria-prima.', variant: 'destructive' });
      }
      return;
    }

    toast({ title: 'Excluído', description: 'Matéria-prima excluída.' });
    fetchMaterials();
  };

  const toggleActive = async (material: RawMaterial) => {
    const { error } = await supabase.from('raw_materials').update({ is_active: !material.is_active }).eq('id', material.id);
    if (error) {
      toast({ title: 'Erro', description: error.message || 'Erro ao atualizar status.', variant: 'destructive' });
      return;
    }
    fetchMaterials();
  };

  const openMovement = (material: RawMaterial) => {
    setSelectedMaterial(material);
    setMovementData({
      type: 'entrada',
      direction: 'add',
      quantity: '',
      total_value: '',
      notes: '',
    });
    setIsMovementOpen(true);
  };

  const handleMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMaterial) return;

    // ✅ aceita negativo no input e converte em “ação”
    // regra:
    // - entrada sempre soma
    // - perda sempre subtrai
    // - ajuste: sinal define add/remove (negativo => remove)
    const qtyRaw = safeNum(movementData.quantity);
    if (qtyRaw === 0) {
      toast({ title: 'Erro', description: 'Quantidade inválida.', variant: 'destructive' });
      return;
    }

    const qtyAbs = Math.abs(qtyRaw);
    const baseQtyAbs = toBaseQty(qtyAbs, selectedMaterial.unit);

    // Total value (opcional), obrigatório para compra (entrada)
    const totalValue = movementData.total_value.trim() ? safeNum(movementData.total_value) : 0;

    // Decide direção efetiva
    let effectiveDirection: 'add' | 'remove' = 'add';

    if (movementData.type === 'perda') {
      effectiveDirection = 'remove';
    } else if (movementData.type === 'entrada') {
      effectiveDirection = 'add';
    } else {
      // ajuste
      // se usuário digitou negativo, entende como remover
      // senão usa o select
      effectiveDirection = qtyRaw < 0 ? 'remove' : movementData.direction;
    }

    // Entrada pode ser sem custo (não altera custo médio)
    if (movementData.type === 'entrada' && totalValue < 0) {
      toast({ title: 'Erro', description: 'Valor (R$) não pode ser negativo.', variant: 'destructive' });
      return;
    }


    // saldo
    const balanceBefore = safeNum(selectedMaterial.current_quantity);
    const signedQty = effectiveDirection === 'remove' ? -baseQtyAbs : baseQtyAbs;
    const balanceAfter = balanceBefore + signedQty;

    if (balanceAfter < 0) {
      toast({
        title: 'Estoque insuficiente',
        description: 'Essa saída deixaria o estoque negativo.',
        variant: 'destructive',
      });
      return;
    }

    // custo unitário “no momento”
    // Como sua tabela raw_materials não tem custo médio editável (cost_per_unit é GENERATED),
    // vamos registrar no movimento:
    // - se for entrada e tiver valor, calcula unitário = totalValue / qty
    // - senão, guarda 0 (ou você pode guardar o cost_per_unit gerado atual)
    const unitCostAtTime =
      movementData.type === 'entrada' && totalValue > 0 && baseQtyAbs > 0 ? totalValue / baseQtyAbs : 0;

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr) {
      toast({ title: 'Erro', description: authErr.message || 'Falha ao obter usuário.', variant: 'destructive' });
      return;
    }
    const userId = authData?.user?.id ?? null;

    // notes: embute valor (já que sua tabela não tem total_value)
    const notesParts: string[] = [];
    if (totalValue > 0) notesParts.push(`R$ ${totalValue.toFixed(2)}`);
    if (movementData.notes.trim()) notesParts.push(movementData.notes.trim());
    const finalNotes = notesParts.length ? notesParts.join(' | ') : null;


    // custo médio atual do item (se não existir, assume 0)
    const avgBefore = safeNum((selectedMaterial as any).avg_cost_per_unit);

    // custo médio novo (por padrão, mantém o mesmo)
    let avgAfter = avgBefore;

    // Só recalcula em ENTRADA com valor > 0
    if (movementData.type === 'entrada' && totalValue > 0 && signedQty > 0) {
      // unitCostAtTime já está em R$ por unidade BASE (ml/g/unidade)
      const unitCost = unitCostAtTime;

      // média ponderada: (estoque_antigo*custo_antigo + entrada*custo_entrada) / estoque_novo
      avgAfter = ((balanceBefore * avgBefore) + (signedQty * unitCost)) / balanceAfter;
    }

    // 1) registra movimento
    const { error: moveErr } = await supabase.from('raw_material_movements').insert({
      raw_material_id: selectedMaterial.id,
      movement_type: movementData.type,
      quantity: signedQty,
      cost_per_unit_at_time: unitCostAtTime,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      notes: finalNotes,
      user_id: userId,
    } as any);

    if (moveErr) {
      toast({ title: 'Erro ao registrar movimentação', description: moveErr.message, variant: 'destructive' });
      return;
    }

    // 2) atualiza saldo do material
    const { error: matErr } = await supabase
      .from('raw_materials')
      .update({
        current_quantity: balanceAfter,
        avg_cost_per_unit: avgAfter, // 👈 salva custo médio
      })
      .eq('id', selectedMaterial.id);

    if (matErr) {
      toast({
        title: 'Erro',
        description: `Movimento salvo, mas falhou ao atualizar o saldo do item: ${matErr.message}`,
        variant: 'destructive',
      });
      return;
    }

    toast({ title: 'Registrado', description: 'Movimentação registrada com sucesso.' });
    setIsMovementOpen(false);
    setSelectedMaterial(null);
    fetchMaterials();
  };

  const openHistory = async (material: RawMaterial) => {
    setSelectedMaterial(material);
    setIsHistoryOpen(true);

    const { data, error } = await supabase
      .from('raw_material_movements')
      .select('id, raw_material_id, movement_type, quantity, cost_per_unit_at_time, balance_before, balance_after, notes, created_at')
      .eq('raw_material_id', material.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      toast({ title: 'Erro', description: error.message || 'Erro ao buscar histórico.', variant: 'destructive' });
      setMovements([]);
      return;
    }

    setMovements((data || []) as any);
  };

  const filteredMaterials = useMemo(() => {
    return materials.filter((m) => {
      const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = filterCategory === 'all' || m.category === filterCategory;
      return matchesSearch && matchesCategory;
    });
  }, [materials, searchTerm, filterCategory]);

  const catLabel = (cat: RawMaterialCategory) => CATEGORIES.find((c) => c.value === cat)?.label || cat;

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-1 w-full sm:w-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar matéria-prima..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-44">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Cadastro */}
        <Dialog
          open={isOpen}
          onOpenChange={(open) => {
            setIsOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Matéria-prima
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingMaterial ? 'Editar' : 'Nova'} Matéria-prima</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Nome *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Água de Lençóis"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Categoria</Label>
                  <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v as any })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Unidade</Label>
                  <Select value={formData.unit} onValueChange={(v) => setFormData({ ...formData, unit: v as any })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {UNITS.map((u) => (
                        <SelectItem key={u.value} value={u.value}>
                          {u.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Unidade base: <strong>{baseUnitLabel(formData.unit)}</strong>
                  </p>
                </div>
              </div>

              <div>
                <Label>Estoque mínimo (alerta)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.minimum_stock}
                  onChange={(e) => setFormData({ ...formData, minimum_stock: e.target.value })}
                  placeholder="Ex: 200"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Em unidade base ({baseUnitLabel(formData.unit)})
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Switch checked={formData.is_active} onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })} />
                <Label>Material ativo</Label>
              </div>

              <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                <strong>Obs:</strong> Quantidade e valor entram somente em <strong>Movimentação de Estoque</strong>.
              </div>

              <Button type="submit" className="w-full">
                {editingMaterial ? 'Atualizar' : 'Criar'} Matéria-prima
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Movimentação */}
      <Dialog open={isMovementOpen} onOpenChange={setIsMovementOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Movimentação de Estoque</DialogTitle>
          </DialogHeader>

          {selectedMaterial && (
            <form onSubmit={handleMovement} className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{selectedMaterial.name}</p>
                <p className="text-sm text-muted-foreground">
                  Saldo atual: <strong>{formatNumberBR(selectedMaterial.current_quantity)}</strong> {baseUnitLabel(selectedMaterial.unit)}
                </p>
              </div>

              <div>
                <Label>Tipo</Label>
                <Select value={movementData.type} onValueChange={(v) => setMovementData({ ...movementData, type: v as any })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entrada">Entrada (compra)</SelectItem>
                    <SelectItem value="ajuste">Ajuste (inventário/correção)</SelectItem>
                    <SelectItem value="perda">Perda</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {movementData.type === 'ajuste' && (
                <div>
                  <Label>Direção do ajuste</Label>
                  <Select value={movementData.direction} onValueChange={(v) => setMovementData({ ...movementData, direction: v as any })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="remove">Diminuir</SelectItem>
                      <SelectItem value="add">Aumentar</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Dica: se digitar quantidade negativa, vira <strong>Diminuir</strong> automaticamente.
                  </p>
                </div>
              )}

              <div>
                <Label>Quantidade *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={movementData.quantity}
                  onChange={(e) => setMovementData({ ...movementData, quantity: e.target.value })}
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Em {UNITS.find((u) => u.value === selectedMaterial.unit)?.label} (será convertido para {baseUnitLabel(selectedMaterial.unit)})
                </p>
              </div>

              <div>
                <Label>Valor (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={movementData.total_value}
                  onChange={(e) => setMovementData({ ...movementData, total_value: e.target.value })}
                  placeholder="Obrigatório para Entrada (compra)"
                />
              </div>

              <div>
                <Label>Observações</Label>
                <Input
                  value={movementData.notes}
                  onChange={(e) => setMovementData({ ...movementData, notes: e.target.value })}
                  placeholder="Ex: Compra fornecedor X / Ajuste inventário"
                />
              </div>

              <Button type="submit" className="w-full">
                Registrar Movimentação
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Histórico */}
      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Histórico de Movimentações</DialogTitle>
          </DialogHeader>

          {selectedMaterial && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{selectedMaterial.name}</p>
                <p className="text-sm text-muted-foreground">
                  Saldo atual: <strong>{formatNumberBR(selectedMaterial.current_quantity)}</strong> {baseUnitLabel(selectedMaterial.unit)}
                </p>
              </div>

              {movements.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">Nenhuma movimentação registrada</p>
              ) : (
                <div className="space-y-2">
                  {movements.map((mov) => {
                    const isOut = (mov.quantity ?? 0) < 0;
                    return (
                      <div key={mov.id} className="p-3 rounded-lg bg-muted/50 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <Badge variant={isOut ? 'secondary' : 'default'}>{movementLabel(mov.movement_type)}</Badge>
                          <span className="text-xs text-muted-foreground">{new Date(mov.created_at || '').toLocaleString('pt-BR')}</span>
                        </div>

                        <p className="text-sm">
                          Quantidade: <strong>{formatNumberBR(mov.quantity)}</strong> | Saldo: {formatNumberBR(mov.balance_before)} →{' '}
                          <strong>{formatNumberBR(mov.balance_after)}</strong>
                        </p>

                        <p className="text-xs text-muted-foreground">
                          Custo unit. no momento:{' '}
                          <strong>R$ {formatCostPerUnit(mov.cost_per_unit_at_time || 0, baseUnitLabel(selectedMaterial.unit))}</strong>
                        </p>

                        {mov.notes && <p className="text-xs text-muted-foreground">{mov.notes}</p>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Lista */}
      <Card>
        <CardHeader>
          <CardTitle>Matérias-primas ({filteredMaterials.length})</CardTitle>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <p className="text-center text-muted-foreground py-8">Carregando...</p>
          ) : filteredMaterials.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhuma matéria-prima encontrada</p>
          ) : (
            <div className="space-y-2">
              {filteredMaterials.map((m) => {
                const isLow = (m.current_quantity ?? 0) <= (m.minimum_stock ?? 0);
                const unitBase = baseUnitLabel(m.unit);

                // cost_per_unit na sua tabela é GENERATED (purchase_cost / purchase_quantity)
                // então aqui é "custo de compra padrão", não custo médio real.
                const avg = safeNum((m as any).avg_cost_per_unit);

                return (
                  <div
                    key={m.id}
                    className={`flex items-center justify-between p-4 rounded-lg ${
                      m.is_active ? (isLow ? 'bg-destructive/10 border border-destructive/30' : 'bg-muted/50') : 'bg-muted/30 opacity-60'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium">{m.name}</p>
                        <Badge variant="outline" className="text-xs">
                          {catLabel(m.category)}
                        </Badge>
                        {isLow && m.is_active && (
                          <Badge variant="destructive" className="text-xs">
                            Estoque baixo
                          </Badge>
                        )}
                      </div>

                      <div className="text-sm text-muted-foreground mt-1 flex flex-wrap gap-x-4 gap-y-1">
                        <span>
                          Estoque: <strong>{formatNumberBR(m.current_quantity)}</strong> {unitBase}
                        </span>
                        <span>
                          Custo médio: <strong>R$ {formatCostPerUnit(avg, unitBase)}</strong>
                        </span>
                        <span>
                          Mínimo: <strong>{formatNumberBR(m.minimum_stock)}</strong> {unitBase}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2 ml-4">
                      <Button variant="outline" size="icon" onClick={() => openMovement(m)} title="Movimentar">
                        <Plus className="h-4 w-4" />
                      </Button>

                      <Button variant="outline" size="icon" onClick={() => openHistory(m)} title="Histórico">
                        <History className="h-4 w-4" />
                      </Button>

                      <Button variant="outline" size="icon" onClick={() => toggleActive(m)} title={m.is_active ? 'Desativar' : 'Ativar'}>
                        {m.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </Button>

                      <Button variant="outline" size="icon" onClick={() => openEdit(m)} title="Editar">
                        <Pencil className="h-4 w-4" />
                      </Button>

                      <Button variant="destructive" size="icon" onClick={() => deleteMaterial(m.id)} title="Excluir">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
