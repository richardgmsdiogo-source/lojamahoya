import { useState, useEffect } from 'react';
import { Factory, Play, RotateCcw, Search, AlertTriangle, Check, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { formatCurrencyBRL, formatQuantityBR } from '@/lib/format';

type ProductionBatch = Database['public']['Tables']['production_batches']['Row'] & {
  products: { name: string } | null;
  recipes: { version: number } | null;
  production_batch_items: Array<{
    raw_material_id: string;
    quantity_consumed: number;
    unit: string;
    cost_per_unit: number;
    total_cost: number;
    raw_materials: { name: string } | null;
  }>;
};

type RecipeWithItems = {
  id: string;
  product_id: string;
  version: number;
  total_cost: number;
  products: { id: string; name: string } | null;
  recipe_items: Array<{
    raw_material_id: string;
    quantity: number;
    unit: string;
    raw_materials: { 
      id: string;
      name: string; 
      current_quantity: number; 
      cost_per_unit: number | null;
      unit: string;
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
    cost_per_unit: number;
    total_cost: number;
    sufficient: boolean;
    balance_after: number;
  }>;
  totalCost: number;
  unitCost: number;
}

export const AdminProductionTab = () => {
  const [batches, setBatches] = useState<ProductionBatch[]>([]);
  const [activeRecipes, setActiveRecipes] = useState<RecipeWithItems[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProduceOpen, setIsProduceOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [produceData, setProduceData] = useState({
    recipe_id: '',
    quantity: '',
    notes: ''
  });

  const [simulation, setSimulation] = useState<SimulationResult | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const { toast } = useToast();

  const fetchData = async () => {
    setIsLoading(true);
    const [{ data: batchesData }, { data: recipesData }] = await Promise.all([
      supabase
        .from('production_batches')
        .select(`
          *,
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
      supabase
        .from('recipes')
        .select(`
          id,
          product_id,
          version,
          total_cost,
          products(id, name),
          recipe_items(
            raw_material_id,
            quantity,
            unit,
            raw_materials(id, name, current_quantity, cost_per_unit, unit)
          )
        `)
        .eq('is_active', true)
    ]);

    setBatches(batchesData as ProductionBatch[] || []);
    setActiveRecipes(recipesData as RecipeWithItems[] || []);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const resetProduceForm = () => {
    setProduceData({ recipe_id: '', quantity: '', notes: '' });
    setSimulation(null);
  };

  const convertToBaseUnit = (quantity: number, unit: string): number => {
    if (unit === 'l') return quantity * 1000;
    if (unit === 'kg') return quantity * 1000;
    return quantity;
  };

  const getBaseUnit = (unit: string): string => {
    if (unit === 'l') return 'ml';
    if (unit === 'kg') return 'g';
    return unit;
  };

  const simulateProduction = () => {
    const recipe = activeRecipes.find(r => r.id === produceData.recipe_id);
    const qty = parseInt(produceData.quantity);

    if (!recipe || !qty || qty <= 0) {
      setSimulation(null);
      return;
    }

    setIsSimulating(true);

    const items: SimulationResult['items'] = recipe.recipe_items.map(item => {
      const material = item.raw_materials;
      if (!material) return null;

      const requiredPerUnit = convertToBaseUnit(item.quantity, item.unit);
      const totalRequired = requiredPerUnit * qty;
      const available = material.current_quantity;
      const costPerUnit = material.cost_per_unit || 0;
      const totalCost = totalRequired * costPerUnit;
      const sufficient = available >= totalRequired;
      const balanceAfter = available - totalRequired;

      return {
        raw_material_id: item.raw_material_id,
        name: material.name,
        required: totalRequired,
        available,
        unit: getBaseUnit(material.unit),
        cost_per_unit: costPerUnit,
        total_cost: totalCost,
        sufficient,
        balance_after: balanceAfter
      };
    }).filter(Boolean) as SimulationResult['items'];

    const totalCost = items.reduce((acc, item) => acc + item.total_cost, 0);
    const valid = items.every(item => item.sufficient);

    setSimulation({
      valid,
      items,
      totalCost,
      unitCost: totalCost / qty
    });

    setIsSimulating(false);
  };

  useEffect(() => {
    if (produceData.recipe_id && produceData.quantity) {
      simulateProduction();
    } else {
      setSimulation(null);
    }
  }, [produceData.recipe_id, produceData.quantity]);

  const handleProduce = async () => {
    if (!simulation || !simulation.valid) return;

    const recipe = activeRecipes.find(r => r.id === produceData.recipe_id);
    if (!recipe) return;

    const { data: { user } } = await supabase.auth.getUser();
    const qty = parseInt(produceData.quantity);

    // Create production batch
    const { data: batch, error: batchError } = await supabase
      .from('production_batches')
      .insert({
        product_id: recipe.product_id,
        recipe_id: recipe.id,
        quantity_produced: qty,
        total_cost: simulation.totalCost,
        unit_cost: simulation.unitCost,
        notes: produceData.notes || null,
        produced_by: user?.id,
        status: 'completed'
      })
      .select()
      .single();

    if (batchError || !batch) {
      toast({ title: 'Erro', description: 'Erro ao criar lote de produção.', variant: 'destructive' });
      return;
    }

    // Create batch items and update stock
    for (const item of simulation.items) {
      // Insert batch item
      await supabase.from('production_batch_items').insert({
        batch_id: batch.id,
        raw_material_id: item.raw_material_id,
        quantity_consumed: item.required,
        unit: item.unit as any,
        cost_per_unit: item.cost_per_unit,
        total_cost: item.total_cost
      });

      // Update stock via RPC
      await supabase.rpc('update_raw_material_stock', {
        p_raw_material_id: item.raw_material_id,
        p_quantity: item.required,
        p_movement_type: 'baixa_producao' as any,
        p_reference_id: batch.id,
        p_reference_type: 'production_batch',
        p_notes: `Produção de ${qty} unidades - Lote ${batch.id.slice(0, 8)}`,
        p_user_id: user?.id || null
      });
    }

    // Update finished goods stock
    const { data: existingStock } = await supabase
      .from('finished_goods_stock')
      .select('*')
      .eq('product_id', recipe.product_id)
      .maybeSingle();

    if (existingStock) {
      await supabase
        .from('finished_goods_stock')
        .update({ current_quantity: existingStock.current_quantity + qty })
        .eq('id', existingStock.id);
    } else {
      await supabase
        .from('finished_goods_stock')
        .insert({ product_id: recipe.product_id, current_quantity: qty });
    }

    toast({ title: 'Produção Registrada', description: `${qty} unidades produzidas com sucesso.` });
    setIsProduceOpen(false);
    resetProduceForm();
    fetchData();
  };

  const reverseBatch = async (batch: ProductionBatch) => {
    if (batch.status === 'reversed') {
      toast({ title: 'Erro', description: 'Este lote já foi estornado.', variant: 'destructive' });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();

    // Reverse stock movements
    for (const item of batch.production_batch_items) {
      await supabase.rpc('update_raw_material_stock', {
        p_raw_material_id: item.raw_material_id,
        p_quantity: item.quantity_consumed,
        p_movement_type: 'estorno' as any,
        p_reference_id: batch.id,
        p_reference_type: 'production_batch_reversal',
        p_notes: `Estorno do lote ${batch.id.slice(0, 8)}`,
        p_user_id: user?.id || null
      });
    }

    // Update finished goods stock
    const { data: existingStock } = await supabase
      .from('finished_goods_stock')
      .select('*')
      .eq('product_id', batch.product_id)
      .maybeSingle();

    if (existingStock) {
      await supabase
        .from('finished_goods_stock')
        .update({ 
          current_quantity: Math.max(0, existingStock.current_quantity - batch.quantity_produced) 
        })
        .eq('id', existingStock.id);
    }

    // Mark batch as reversed
    await supabase
      .from('production_batches')
      .update({ 
        status: 'reversed',
        reversed_at: new Date().toISOString(),
        reversed_by: user?.id
      })
      .eq('id', batch.id);

    toast({ title: 'Estornado', description: 'Lote estornado com sucesso.' });
    fetchData();
  };

  const deleteBatch = async (batch: ProductionBatch) => {
    // First delete batch items
    await supabase.from('production_batch_items').delete().eq('batch_id', batch.id);
    
    // Then delete the batch
    const { error } = await supabase.from('production_batches').delete().eq('id', batch.id);
    
    if (error) {
      toast({ title: 'Erro', description: 'Erro ao excluir lote.', variant: 'destructive' });
    } else {
      toast({ title: 'Excluído', description: 'Lote excluído permanentemente.' });
      fetchData();
    }
  };

  const filteredBatches = batches.filter(b => 
    b.products?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        
        <Dialog open={isProduceOpen} onOpenChange={(open) => { setIsProduceOpen(open); if (!open) resetProduceForm(); }}>
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
                <Select 
                  value={produceData.recipe_id} 
                  onValueChange={(v) => setProduceData({ ...produceData, recipe_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o produto" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeRecipes.map(recipe => (
                      <SelectItem key={recipe.id} value={recipe.id}>
                        {recipe.products?.name} (v{recipe.version}) - {formatCurrencyBRL(recipe.total_cost)}/un
                      </SelectItem>
                    ))}
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
                    {simulation.valid ? (
                      <Check className="h-5 w-5 text-green-500" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                    )}
                    Simulação de Produção
                  </h4>

                  <div className="space-y-2">
                    {simulation.items.map((item, i) => (
                      <div 
                        key={i}
                        className={`p-3 rounded-lg ${
                          item.sufficient ? 'bg-muted/50' : 'bg-destructive/10 border border-destructive/30'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-muted-foreground">
                              Necessário: {formatQuantityBR(item.required, item.unit)} {item.unit} | 
                              Disponível: {formatQuantityBR(item.available, item.unit)} {item.unit}
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

                  {!simulation.valid && (
                    <p className="text-sm text-destructive text-center">
                      Estoque insuficiente para realizar a produção
                    </p>
                  )}
                </div>
              )}

              <Button 
                onClick={handleProduce} 
                className="w-full" 
                disabled={!simulation?.valid}
              >
                <Play className="h-4 w-4 mr-2" />
                Confirmar Produção
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
            <p className="text-center text-muted-foreground py-8">
              Nenhum lote de produção encontrado
            </p>
          ) : (
            <div className="space-y-3">
              {filteredBatches.map((batch) => (
                <div 
                  key={batch.id}
                  className={`p-4 rounded-lg ${
                    batch.status === 'reversed' 
                      ? 'bg-muted/30 opacity-60' 
                      : 'bg-muted/50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{batch.products?.name}</p>
                        <Badge variant={batch.status === 'reversed' ? 'secondary' : 'default'}>
                          {batch.status === 'reversed' ? 'Estornado' : 'Concluído'}
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
                      <p className="text-xs text-muted-foreground">
                        ID: {batch.id.slice(0, 8)}
                      </p>
                      {batch.notes && (
                        <p className="text-xs text-muted-foreground italic">{batch.notes}</p>
                      )}
                      <div className="text-xs text-muted-foreground mt-2">
                        Consumo: {batch.production_batch_items.map((item, i) => (
                          <span key={i}>
                            {item.raw_materials?.name}: {formatQuantityBR(item.quantity_consumed, item.unit)} {item.unit}
                            {i < batch.production_batch_items.length - 1 ? ' | ' : ''}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">{batch.quantity_produced} un.</p>
                      <p className="text-sm text-muted-foreground">
                        Total: {formatCurrencyBRL(batch.total_cost)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Unitário: {formatCurrencyBRL(batch.unit_cost)}
                      </p>
                      {batch.status === 'completed' && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-2"
                          onClick={() => reverseBatch(batch)}
                        >
                          <RotateCcw className="h-4 w-4 mr-1" />
                          Estornar
                        </Button>
                      )}
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        className="mt-2"
                        onClick={() => deleteBatch(batch)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Excluir
                      </Button>
                    </div>
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
