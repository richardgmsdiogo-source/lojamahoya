import { useState, useEffect } from 'react';
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
import { formatCurrencyBRL, formatCostPerUnit, formatNumberBR } from '@/lib/format';

type RawMaterial = Database['public']['Tables']['raw_materials']['Row'];
type RawMaterialCategory = Database['public']['Enums']['raw_material_category'];
type MeasurementUnit = Database['public']['Enums']['measurement_unit'];
type Movement = Database['public']['Tables']['raw_material_movements']['Row'];

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

export const AdminRawMaterialsTab = () => {
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [isMovementOpen, setIsMovementOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<RawMaterial | null>(null);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [editingMaterial, setEditingMaterial] = useState<RawMaterial | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    category: 'outro' as RawMaterialCategory,
    unit: 'ml' as MeasurementUnit,
    purchase_quantity: '',
    purchase_cost: '',
    minimum_stock: '',
    is_active: true
  });

  const [movementData, setMovementData] = useState({
    type: 'entrada' as 'entrada' | 'ajuste' | 'perda',
    quantity: '',
    notes: ''
  });

  const { toast } = useToast();

  const fetchMaterials = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from('raw_materials')
      .select('*')
      .order('name');
    setMaterials(data || []);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchMaterials();
  }, []);

  const resetForm = () => {
    setFormData({
      name: '',
      category: 'outro',
      unit: 'ml',
      purchase_quantity: '',
      purchase_cost: '',
      minimum_stock: '',
      is_active: true
    });
    setEditingMaterial(null);
  };

  const openEdit = (material: RawMaterial) => {
    setEditingMaterial(material);
    setFormData({
      name: material.name,
      category: material.category,
      unit: material.unit,
      purchase_quantity: material.purchase_quantity.toString(),
      purchase_cost: material.purchase_cost.toString(),
      minimum_stock: material.minimum_stock.toString(),
      is_active: material.is_active
    });
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const purchaseQty = parseFloat(formData.purchase_quantity);
    const purchaseCost = parseFloat(formData.purchase_cost);

    const materialData = {
      name: formData.name,
      category: formData.category,
      unit: formData.unit,
      purchase_quantity: purchaseQty,
      purchase_cost: purchaseCost,
      minimum_stock: parseFloat(formData.minimum_stock) || 0,
      is_active: formData.is_active
    };

    if (editingMaterial) {
      const { error } = await supabase
        .from('raw_materials')
        .update(materialData)
        .eq('id', editingMaterial.id);

      if (error) {
        toast({ title: 'Erro', description: 'Erro ao atualizar matéria-prima.', variant: 'destructive' });
      } else {
        toast({ title: 'Atualizado', description: 'Matéria-prima atualizada com sucesso.' });
      }
    } else {
      const { error } = await supabase
        .from('raw_materials')
        .insert({ ...materialData, current_quantity: 0 });

      if (error) {
        toast({ title: 'Erro', description: 'Erro ao criar matéria-prima.', variant: 'destructive' });
      } else {
        toast({ title: 'Criado', description: 'Matéria-prima criada com sucesso.' });
      }
    }

    setIsOpen(false);
    resetForm();
    fetchMaterials();
  };

  const deleteMaterial = async (id: string) => {
    const { error } = await supabase
      .from('raw_materials')
      .delete()
      .eq('id', id);

    if (error) {
      if (error.code === '23503') {
        toast({ 
          title: 'Não é possível excluir', 
          description: 'Esta matéria-prima está vinculada a lotes de produção ou receitas. Desative-a em vez de excluir.',
          variant: 'destructive' 
        });
      } else {
        toast({ title: 'Erro', description: 'Erro ao excluir matéria-prima.', variant: 'destructive' });
      }
    } else {
      toast({ title: 'Excluído', description: 'Matéria-prima excluída.' });
      fetchMaterials();
    }
  };

  const toggleActive = async (material: RawMaterial) => {
    await supabase
      .from('raw_materials')
      .update({ is_active: !material.is_active })
      .eq('id', material.id);
    fetchMaterials();
  };

  const openMovement = (material: RawMaterial) => {
    setSelectedMaterial(material);
    setMovementData({ type: 'entrada', quantity: '', notes: '' });
    setIsMovementOpen(true);
  };

  const handleMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMaterial) return;

    const { data: { user } } = await supabase.auth.getUser();
    
    const quantity = parseFloat(movementData.quantity);
    
    // Convert to base unit if needed
    let baseQty = quantity;
    if (selectedMaterial.unit === 'l') baseQty = quantity * 1000;
    if (selectedMaterial.unit === 'kg') baseQty = quantity * 1000;

    const { error } = await supabase.rpc('update_raw_material_stock', {
      p_raw_material_id: selectedMaterial.id,
      p_quantity: baseQty,
      p_movement_type: movementData.type as any,
      p_notes: movementData.notes || null,
      p_user_id: user?.id || null
    });

    if (error) {
      toast({ title: 'Erro', description: 'Erro ao registrar movimentação.', variant: 'destructive' });
    } else {
      toast({ title: 'Registrado', description: 'Movimentação registrada com sucesso.' });
      setIsMovementOpen(false);
      fetchMaterials();
    }
  };

  const openHistory = async (material: RawMaterial) => {
    setSelectedMaterial(material);
    const { data } = await supabase
      .from('raw_material_movements')
      .select('*')
      .eq('raw_material_id', material.id)
      .order('created_at', { ascending: false })
      .limit(50);
    setMovements(data || []);
    setIsHistoryOpen(true);
  };

  const getUnitLabel = (unit: MeasurementUnit) => {
    const baseUnit = unit === 'l' ? 'ml' : unit === 'kg' ? 'g' : unit;
    return baseUnit;
  };

  const filteredMaterials = materials.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || m.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-1 w-full sm:w-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar matéria-prima..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-40">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {CATEGORIES.map(cat => (
                <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
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
                  <Select 
                    value={formData.category} 
                    onValueChange={(v) => setFormData({ ...formData, category: v as RawMaterialCategory })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Unidade de Medida</Label>
                  <Select 
                    value={formData.unit} 
                    onValueChange={(v) => setFormData({ ...formData, unit: v as MeasurementUnit })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {UNITS.map(u => (
                        <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Quantidade de Compra *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.purchase_quantity}
                    onChange={(e) => setFormData({ ...formData, purchase_quantity: e.target.value })}
                    placeholder="Ex: 1"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Em {UNITS.find(u => u.value === formData.unit)?.label}
                  </p>
                </div>
                <div>
                  <Label>Custo de Compra (R$) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.purchase_cost}
                    onChange={(e) => setFormData({ ...formData, purchase_cost: e.target.value })}
                    placeholder="Ex: 50.00"
                    required
                  />
                </div>
              </div>

              {formData.purchase_quantity && formData.purchase_cost && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm">
                    <strong>Custo por unidade base:</strong>{' '}
                    R$ {formatCostPerUnit(parseFloat(formData.purchase_cost) / (parseFloat(formData.purchase_quantity) * (formData.unit === 'l' || formData.unit === 'kg' ? 1000 : 1)), getUnitLabel(formData.unit))}
                  </p>
                </div>
              )}

              <div>
                <Label>Estoque Mínimo</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.minimum_stock}
                  onChange={(e) => setFormData({ ...formData, minimum_stock: e.target.value })}
                  placeholder="Para alertas"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Em unidade base ({getUnitLabel(formData.unit)})
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label>Material ativo</Label>
              </div>

              <Button type="submit" className="w-full">
                {editingMaterial ? 'Atualizar' : 'Criar'} Matéria-prima
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Movement Dialog */}
      <Dialog open={isMovementOpen} onOpenChange={setIsMovementOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Movimentação de Estoque</DialogTitle>
          </DialogHeader>
          {selectedMaterial && (
            <form onSubmit={handleMovement} className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{selectedMaterial.name}</p>
                <p className="text-sm text-muted-foreground">
                  Estoque atual: {selectedMaterial.current_quantity} {getUnitLabel(selectedMaterial.unit)}
                </p>
              </div>

              <div>
                <Label>Tipo de Movimentação</Label>
                <Select 
                  value={movementData.type} 
                  onValueChange={(v) => setMovementData({ ...movementData, type: v as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entrada">Entrada (compra)</SelectItem>
                    <SelectItem value="ajuste">Ajuste de inventário</SelectItem>
                    <SelectItem value="perda">Perda</SelectItem>
                  </SelectContent>
                </Select>
              </div>

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
                  Em {UNITS.find(u => u.value === selectedMaterial.unit)?.label}
                </p>
              </div>

              <div>
                <Label>Observações</Label>
                <Input
                  value={movementData.notes}
                  onChange={(e) => setMovementData({ ...movementData, notes: e.target.value })}
                  placeholder="Ex: Compra fornecedor X"
                />
              </div>

              <Button type="submit" className="w-full">
                Registrar Movimentação
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Histórico de Movimentações</DialogTitle>
          </DialogHeader>
          {selectedMaterial && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{selectedMaterial.name}</p>
                <p className="text-sm text-muted-foreground">
                  Estoque atual: {selectedMaterial.current_quantity} {getUnitLabel(selectedMaterial.unit)}
                </p>
              </div>

              {movements.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  Nenhuma movimentação registrada
                </p>
              ) : (
                <div className="space-y-2">
                  {movements.map((mov) => (
                    <div key={mov.id} className="p-3 rounded-lg bg-muted/50 space-y-1">
                      <div className="flex items-center justify-between">
                        <Badge variant={
                          mov.movement_type === 'entrada' || mov.movement_type === 'estorno' 
                            ? 'default' 
                            : 'secondary'
                        }>
                          {mov.movement_type}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {new Date(mov.created_at || '').toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <p className="text-sm">
                        Quantidade: <strong>{mov.quantity}</strong> | 
                        Antes: {mov.balance_before} → Depois: {mov.balance_after}
                      </p>
                      {mov.notes && (
                        <p className="text-xs text-muted-foreground">{mov.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Materials List */}
      <Card>
        <CardHeader>
          <CardTitle>Matérias-primas ({filteredMaterials.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center text-muted-foreground py-8">Carregando...</p>
          ) : filteredMaterials.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma matéria-prima encontrada
            </p>
          ) : (
            <div className="space-y-2">
              {filteredMaterials.map((material) => (
                <div 
                  key={material.id}
                  className={`flex items-center justify-between p-4 rounded-lg ${
                    material.is_active 
                      ? material.current_quantity <= material.minimum_stock 
                        ? 'bg-destructive/10 border border-destructive/30'
                        : 'bg-muted/50'
                      : 'bg-muted/30 opacity-60'
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium">{material.name}</p>
                      <Badge variant="outline" className="text-xs">
                        {CATEGORIES.find(c => c.value === material.category)?.label}
                      </Badge>
                      {material.current_quantity <= material.minimum_stock && (
                        <Badge variant="destructive" className="text-xs">
                          Estoque baixo
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1 space-x-4">
                      <span>
                        Estoque: <strong>{formatNumberBR(material.current_quantity)}</strong> {getUnitLabel(material.unit)}
                      </span>
                      <span>
                        Custo: R$ {formatCostPerUnit(material.cost_per_unit || 0, getUnitLabel(material.unit))}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button variant="outline" size="icon" onClick={() => openMovement(material)} title="Movimentação">
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => openHistory(material)} title="Histórico">
                      <History className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => toggleActive(material)}
                      title={material.is_active ? 'Desativar' : 'Ativar'}
                    >
                      {material.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => openEdit(material)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="destructive" size="icon" onClick={() => deleteMaterial(material.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
