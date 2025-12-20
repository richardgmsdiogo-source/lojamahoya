import { useState, useEffect, useMemo } from 'react';
import { Package, Plus, Factory, Search, Pencil, Trash2, CheckCircle, Clock, XCircle, Truck } from 'lucide-react';
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
import { formatCurrencyBRL, formatQuantityBR } from '@/lib/format';

type InternalOrderStatus = 'pendente' | 'produzindo' | 'concluido' | 'entregue' | 'cancelado';

const STATUS_CONFIG: Record<InternalOrderStatus, { label: string; icon: React.ComponentType<any>; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pendente: { label: 'Pendente', icon: Clock, variant: 'outline' },
  produzindo: { label: 'Produzindo', icon: Factory, variant: 'secondary' },
  concluido: { label: 'Concluído', icon: CheckCircle, variant: 'default' },
  entregue: { label: 'Entregue', icon: Truck, variant: 'default' },
  cancelado: { label: 'Cancelado', icon: XCircle, variant: 'destructive' }
};

interface InternalOrder {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  product_id: string;
  quantity: number;
  due_date: string | null;
  notes: string | null;
  status: InternalOrderStatus;
  production_batch_id: string | null;
  total_cost: number;
  unit_cost: number;
  created_at: string;
  products: { name: string } | null;
}

interface ProductWithRecipe {
  id: string;
  name: string;
  has_active_recipe: boolean;
  recipe_id: string | null;
}

interface SimulationResult {
  valid: boolean;
  items: Array<{
    raw_material_id: string;
    name: string;
    required: number;
    available: number;
    unit: string;
    sufficient: boolean;
  }>;
  totalCost: number;
  unitCost: number;
}

type RpcResult = { success: boolean; error?: string; batch_id?: string; total_cost?: number; unit_cost?: number };

const safeNum = (v: any) => {
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

const toBaseQty = (qty: number, unit: string): number => {
  if (unit === 'l') return qty * 1000;
  if (unit === 'kg') return qty * 1000;
  return qty;
};

const baseUnitLabel = (unit: string): string => {
  if (unit === 'l') return 'ml';
  if (unit === 'kg') return 'g';
  return unit;
};

export const AdminInternalOrdersTab = () => {
  const { toast } = useToast();
  const [orders, setOrders] = useState<InternalOrder[]>([]);
  const [products, setProducts] = useState<ProductWithRecipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  const [isOpen, setIsOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<InternalOrder | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<InternalOrder | null>(null);
  const [produceDialog, setProduceDialog] = useState<InternalOrder | null>(null);
  
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    product_id: '',
    quantity: '',
    due_date: '',
    notes: ''
  });

  const fetchData = async () => {
    setIsLoading(true);

    const [ordersRes, prodsRes] = await Promise.all([
      supabase
        .from('internal_orders')
        .select('*, products(name)')
        .order('created_at', { ascending: false }),
      
      supabase
        .from('products')
        .select(`
          id, 
          name,
          recipes!inner(id, is_active)
        `)
        .eq('is_active', true)
        .eq('recipes.is_active', true)
    ]);

    if (ordersRes.error) {
      toast({ title: 'Erro', description: ordersRes.error.message, variant: 'destructive' });
      setOrders([]);
    } else {
      setOrders((ordersRes.data as any) || []);
    }

    if (prodsRes.error) {
      console.error(prodsRes.error);
      setProducts([]);
    } else {
      const prods = (prodsRes.data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        has_active_recipe: true,
        recipe_id: p.recipes?.[0]?.id || null
      }));
      setProducts(prods);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const resetForm = () => {
    setFormData({
      customer_name: '',
      customer_phone: '',
      customer_email: '',
      product_id: '',
      quantity: '',
      due_date: '',
      notes: ''
    });
    setEditingOrder(null);
  };

  const openEdit = (order: InternalOrder) => {
    setEditingOrder(order);
    setFormData({
      customer_name: order.customer_name,
      customer_phone: order.customer_phone || '',
      customer_email: order.customer_email || '',
      product_id: order.product_id,
      quantity: String(order.quantity),
      due_date: order.due_date || '',
      notes: order.notes || ''
    });
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.customer_name.trim()) {
      toast({ title: 'Atenção', description: 'Informe o nome do cliente.', variant: 'destructive' });
      return;
    }

    if (!formData.product_id) {
      toast({ title: 'Atenção', description: 'Selecione um produto.', variant: 'destructive' });
      return;
    }

    const qty = parseInt(formData.quantity);
    if (!qty || qty <= 0) {
      toast({ title: 'Atenção', description: 'Informe uma quantidade válida.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        customer_name: formData.customer_name.trim(),
        customer_phone: formData.customer_phone.trim() || null,
        customer_email: formData.customer_email.trim() || null,
        product_id: formData.product_id,
        quantity: qty,
        due_date: formData.due_date || null,
        notes: formData.notes.trim() || null
      };

      if (editingOrder) {
        const { error } = await supabase
          .from('internal_orders')
          .update(payload as any)
          .eq('id', editingOrder.id);
        
        if (error) throw error;
        toast({ title: 'Atualizado', description: 'Encomenda atualizada.' });
      } else {
        const { error } = await supabase
          .from('internal_orders')
          .insert(payload as any);
        
        if (error) throw error;
        toast({ title: 'Criado', description: 'Encomenda registrada.' });
      }

      setIsOpen(false);
      resetForm();
      fetchData();
    } catch (err: any) {
      toast({ title: 'Erro', description: err?.message || 'Falha ao salvar.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (order: InternalOrder) => {
    try {
      const { error } = await supabase
        .from('internal_orders')
        .delete()
        .eq('id', order.id);
      
      if (error) throw error;
      toast({ title: 'Excluído', description: 'Encomenda removida.' });
      setDeleteDialog(null);
      fetchData();
    } catch (err: any) {
      toast({ title: 'Erro', description: err?.message || 'Falha ao excluir.', variant: 'destructive' });
    }
  };

  const simulateProduction = async (order: InternalOrder) => {
    const prod = products.find(p => p.id === order.product_id);
    if (!prod || !prod.recipe_id) {
      toast({ title: 'Erro', description: 'Produto sem receita ativa.', variant: 'destructive' });
      return;
    }

    // Fetch recipe items with raw materials
    const { data: recipeItems, error } = await supabase
      .from('recipe_items')
      .select(`
        raw_material_id,
        quantity,
        unit,
        raw_materials(id, name, current_quantity, cost_per_unit, unit)
      `)
      .eq('recipe_id', prod.recipe_id);

    if (error || !recipeItems) {
      toast({ title: 'Erro', description: 'Falha ao carregar receita.', variant: 'destructive' });
      return;
    }

    const items: SimulationResult['items'] = recipeItems.map((it: any) => {
      const mat = it.raw_materials;
      if (!mat) return null;

      const requiredPerUnit = toBaseQty(safeNum(it.quantity), it.unit);
      const totalRequired = requiredPerUnit * order.quantity;
      const available = safeNum(mat.current_quantity);

      return {
        raw_material_id: it.raw_material_id,
        name: mat.name,
        required: totalRequired,
        available,
        unit: baseUnitLabel(mat.unit),
        sufficient: available >= totalRequired
      };
    }).filter(Boolean);

    const totalCost = recipeItems.reduce((acc: number, it: any) => {
      const mat = it.raw_materials;
      if (!mat) return acc;
      const requiredBase = toBaseQty(safeNum(it.quantity), it.unit) * order.quantity;
      return acc + requiredBase * safeNum(mat.cost_per_unit);
    }, 0);

    const valid = items.every(i => i?.sufficient);

    setSimulation({
      valid,
      items: items as SimulationResult['items'],
      totalCost,
      unitCost: totalCost / order.quantity
    });

    setProduceDialog(order);
  };

  const handleProduce = async () => {
    if (!produceDialog || !simulation?.valid) return;

    const prod = products.find(p => p.id === produceDialog.product_id);
    if (!prod?.recipe_id) {
      toast({ title: 'Erro', description: 'Receita não encontrada.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase.rpc('create_production_batch', {
      p_recipe_id: prod.recipe_id,
      p_quantity: produceDialog.quantity,
      p_notes: `Encomenda: ${produceDialog.customer_name}`,
      p_user_id: user?.id || null,
      p_initial_status: 'concluido'
    });

    const result = data as RpcResult | null;

    if (error || !result?.success) {
      toast({
        title: 'Erro',
        description: result?.error || error?.message || 'Erro ao produzir.',
        variant: 'destructive'
      });
      setIsSubmitting(false);
      return;
    }

    // Update internal order with production batch
    await supabase
      .from('internal_orders')
      .update({
        status: 'concluido',
        production_batch_id: result.batch_id,
        total_cost: result.total_cost,
        unit_cost: result.unit_cost
      } as any)
      .eq('id', produceDialog.id);

    toast({
      title: 'Produzido!',
      description: `${produceDialog.quantity} unidades produzidas e adicionadas ao estoque.`
    });

    setProduceDialog(null);
    setSimulation(null);
    setIsSubmitting(false);
    fetchData();
  };

  const updateStatus = async (order: InternalOrder, newStatus: InternalOrderStatus) => {
    try {
      const { error } = await supabase
        .from('internal_orders')
        .update({ status: newStatus } as any)
        .eq('id', order.id);
      
      if (error) throw error;
      toast({ title: 'Atualizado', description: `Status: ${STATUS_CONFIG[newStatus].label}` });
      fetchData();
    } catch (err: any) {
      toast({ title: 'Erro', description: err?.message || 'Falha ao atualizar.', variant: 'destructive' });
    }
  };

  const filteredOrders = orders.filter(o => {
    const matchesSearch = 
      o.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.products?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingCount = orders.filter(o => o.status === 'pendente').length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar encomendas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-[200px]"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                <SelectItem key={key} value={key}>{config.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Encomenda
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingOrder ? 'Editar' : 'Nova'} Encomenda</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Cliente *</Label>
                <Input
                  value={formData.customer_name}
                  onChange={(e) => setFormData(p => ({ ...p, customer_name: e.target.value }))}
                  placeholder="Nome do cliente"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Telefone</Label>
                  <Input
                    value={formData.customer_phone}
                    onChange={(e) => setFormData(p => ({ ...p, customer_phone: e.target.value }))}
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={formData.customer_email}
                    onChange={(e) => setFormData(p => ({ ...p, customer_email: e.target.value }))}
                    placeholder="email@exemplo.com"
                  />
                </div>
              </div>

              <div>
                <Label>Produto *</Label>
                <Select
                  value={formData.product_id}
                  onValueChange={(v) => setFormData(p => ({ ...p, product_id: v }))}
                  disabled={!!editingOrder}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o produto" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {products.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Nenhum produto com receita ativa. Crie uma receita primeiro.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Quantidade *</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.quantity}
                    onChange={(e) => setFormData(p => ({ ...p, quantity: e.target.value }))}
                    placeholder="Ex: 10"
                  />
                </div>
                <div>
                  <Label>Prazo de Entrega</Label>
                  <Input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData(p => ({ ...p, due_date: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label>Observações</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Instruções especiais, detalhes..."
                  rows={2}
                />
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Salvando...' : editingOrder ? 'Atualizar' : 'Criar Encomenda'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {pendingCount > 0 && (
        <Card className="border-yellow-500/20 bg-yellow-500/5">
          <CardContent className="py-3">
            <p className="text-sm text-yellow-600 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              {pendingCount} encomenda(s) pendente(s) aguardando produção
            </p>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhuma encomenda encontrada.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => {
            const StatusIcon = STATUS_CONFIG[order.status].icon;
            const canProduce = order.status === 'pendente';
            const canDeliver = order.status === 'concluido';
            
            return (
              <Card key={order.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{order.customer_name}</span>
                        <Badge variant={STATUS_CONFIG[order.status].variant} className="gap-1">
                          <StatusIcon className="h-3 w-3" />
                          {STATUS_CONFIG[order.status].label}
                        </Badge>
                        {order.due_date && (
                          <span className="text-xs text-muted-foreground">
                            Prazo: {new Date(order.due_date).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {order.quantity}x {order.products?.name || 'Produto'}
                        {order.total_cost > 0 && (
                          <span className="ml-2">• Custo: {formatCurrencyBRL(order.total_cost)}</span>
                        )}
                      </p>
                      {order.notes && (
                        <p className="text-xs text-muted-foreground">{order.notes}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Criado em: {new Date(order.created_at).toLocaleString('pt-BR')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {canProduce && (
                        <Button size="sm" onClick={() => simulateProduction(order)} className="gap-1">
                          <Factory className="h-4 w-4" />
                          Produzir
                        </Button>
                      )}
                      {canDeliver && (
                        <Button size="sm" variant="outline" onClick={() => updateStatus(order, 'entregue')} className="gap-1">
                          <Truck className="h-4 w-4" />
                          Entregar
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" onClick={() => openEdit(order)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setDeleteDialog(order)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Encomenda?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. A encomenda será removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteDialog && handleDelete(deleteDialog)}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Produce Dialog */}
      <Dialog open={!!produceDialog} onOpenChange={() => { setProduceDialog(null); setSimulation(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Produzir Encomenda</DialogTitle>
          </DialogHeader>

          {produceDialog && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{produceDialog.customer_name}</p>
                <p className="text-sm text-muted-foreground">
                  {produceDialog.quantity}x {produceDialog.products?.name}
                </p>
              </div>

              {simulation && (
                <>
                  <div className="space-y-2">
                    <Label>Consumo de Matérias-Primas</Label>
                    <div className="space-y-1">
                      {simulation.items.map((item, idx) => (
                        <div key={idx} className={`flex justify-between text-sm p-2 rounded ${item.sufficient ? 'bg-green-500/10' : 'bg-destructive/10'}`}>
                          <span>{item.name}</span>
                          <span>
                            {formatQuantityBR(item.required, item.unit)} {item.unit}
                            <span className="text-muted-foreground ml-1">
                              (disp: {formatQuantityBR(item.available, item.unit)})
                            </span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-3 bg-muted rounded-lg space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>Custo Total:</span>
                      <span className="font-medium">{formatCurrencyBRL(simulation.totalCost)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Custo Unitário:</span>
                      <span>{formatCurrencyBRL(simulation.unitCost)}</span>
                    </div>
                  </div>

                  {!simulation.valid && (
                    <p className="text-destructive text-sm">
                      Estoque insuficiente para produzir. Verifique as matérias-primas.
                    </p>
                  )}

                  <Button 
                    onClick={handleProduce} 
                    className="w-full" 
                    disabled={!simulation.valid || isSubmitting}
                  >
                    {isSubmitting ? 'Produzindo...' : 'Confirmar Produção'}
                  </Button>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
