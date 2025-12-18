import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Check, X, FileText } from 'lucide-react';
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

type Recipe = Database['public']['Tables']['recipes']['Row'] & {
  products: { name: string } | null;
  recipe_items: Array<{
    id: string;
    quantity: number;
    unit: Database['public']['Enums']['measurement_unit'];
    raw_material_id: string;
    raw_materials: { name: string; cost_per_unit: number | null; unit: string } | null;
  }>;
};

type RawMaterial = Database['public']['Tables']['raw_materials']['Row'];
type Product = Database['public']['Tables']['products']['Row'];
type MeasurementUnit = Database['public']['Enums']['measurement_unit'];

const UNITS: { value: MeasurementUnit; label: string }[] = [
  { value: 'ml', label: 'ml' },
  { value: 'l', label: 'L' },
  { value: 'g', label: 'g' },
  { value: 'kg', label: 'kg' },
  { value: 'unidade', label: 'un' },
];

export const AdminRecipesTab = () => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  
  const [formData, setFormData] = useState({
    product_id: '',
    notes: '',
    items: [] as Array<{
      raw_material_id: string;
      quantity: string;
      unit: MeasurementUnit;
    }>
  });

  const { toast } = useToast();

  const fetchData = async () => {
    setIsLoading(true);
    const [{ data: recipesData }, { data: prods }, { data: mats }] = await Promise.all([
      supabase
        .from('recipes')
        .select(`
          *,
          products(name),
          recipe_items(
            id,
            quantity,
            unit,
            raw_material_id,
            raw_materials(name, cost_per_unit, unit)
          )
        `)
        .order('created_at', { ascending: false }),
      supabase.from('products').select('*').eq('is_active', true).order('name'),
      supabase.from('raw_materials').select('*').eq('is_active', true).order('name')
    ]);

    setRecipes(recipesData as Recipe[] || []);
    setProducts(prods || []);
    setRawMaterials(mats || []);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const resetForm = () => {
    setFormData({
      product_id: '',
      notes: '',
      items: []
    });
    setEditingRecipe(null);
  };

  const openEdit = (recipe: Recipe) => {
    setEditingRecipe(recipe);
    setFormData({
      product_id: recipe.product_id,
      notes: recipe.notes || '',
      items: recipe.recipe_items.map(item => ({
        raw_material_id: item.raw_material_id,
        quantity: item.quantity.toString(),
        unit: item.unit
      }))
    });
    setIsOpen(true);
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { raw_material_id: '', quantity: '', unit: 'ml' as MeasurementUnit }]
    });
  };

  const removeItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index)
    });
  };

  const updateItem = (index: number, field: string, value: string) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ ...formData, items: newItems });
  };

  const calculateItemCost = (raw_material_id: string, quantity: string, unit: MeasurementUnit): number => {
    const material = rawMaterials.find(m => m.id === raw_material_id);
    if (!material || !quantity) return 0;

    let baseQty = parseFloat(quantity);
    if (unit === 'l') baseQty *= 1000;
    if (unit === 'kg') baseQty *= 1000;

    return baseQty * (material.cost_per_unit || 0);
  };

  const totalCost = formData.items.reduce((acc, item) => 
    acc + calculateItemCost(item.raw_material_id, item.quantity, item.unit), 0
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { data: { user } } = await supabase.auth.getUser();

    if (editingRecipe) {
      // Delete old items
      await supabase.from('recipe_items').delete().eq('recipe_id', editingRecipe.id);
      
      // Update recipe
      await supabase
        .from('recipes')
        .update({ 
          notes: formData.notes || null,
          total_cost: totalCost
        })
        .eq('id', editingRecipe.id);

      // Insert new items
      for (const item of formData.items) {
        if (!item.raw_material_id || !item.quantity) continue;
        
        const material = rawMaterials.find(m => m.id === item.raw_material_id);
        let baseQty = parseFloat(item.quantity);
        if (item.unit === 'l') baseQty *= 1000;
        if (item.unit === 'kg') baseQty *= 1000;

        await supabase.from('recipe_items').insert({
          recipe_id: editingRecipe.id,
          raw_material_id: item.raw_material_id,
          quantity: parseFloat(item.quantity),
          unit: item.unit,
          cost_at_creation: baseQty * (material?.cost_per_unit || 0)
        });
      }

      toast({ title: 'Atualizado', description: 'Receita atualizada com sucesso.' });
    } else {
      // Get current version count for product
      const { count } = await supabase
        .from('recipes')
        .select('*', { count: 'exact', head: true })
        .eq('product_id', formData.product_id);

      // Create new recipe
      const { data: newRecipe, error } = await supabase
        .from('recipes')
        .insert({
          product_id: formData.product_id,
          notes: formData.notes || null,
          version: (count || 0) + 1,
          total_cost: totalCost,
          created_by: user?.id,
          is_active: false
        })
        .select()
        .single();

      if (error || !newRecipe) {
        toast({ title: 'Erro', description: 'Erro ao criar receita.', variant: 'destructive' });
        return;
      }

      // Insert items
      for (const item of formData.items) {
        if (!item.raw_material_id || !item.quantity) continue;
        
        const material = rawMaterials.find(m => m.id === item.raw_material_id);
        let baseQty = parseFloat(item.quantity);
        if (item.unit === 'l') baseQty *= 1000;
        if (item.unit === 'kg') baseQty *= 1000;

        await supabase.from('recipe_items').insert({
          recipe_id: newRecipe.id,
          raw_material_id: item.raw_material_id,
          quantity: parseFloat(item.quantity),
          unit: item.unit,
          cost_at_creation: baseQty * (material?.cost_per_unit || 0)
        });
      }

      toast({ title: 'Criado', description: 'Receita criada com sucesso.' });
    }

    setIsOpen(false);
    resetForm();
    fetchData();
  };

  const setActive = async (recipe: Recipe) => {
    // Deactivate all other recipes for this product
    await supabase
      .from('recipes')
      .update({ is_active: false })
      .eq('product_id', recipe.product_id);

    // Activate this one
    await supabase
      .from('recipes')
      .update({ is_active: true })
      .eq('id', recipe.id);

    toast({ title: 'Ativado', description: 'Receita marcada como ativa.' });
    fetchData();
  };

  const deleteRecipe = async (id: string) => {
    await supabase.from('recipe_items').delete().eq('recipe_id', id);
    const { error } = await supabase.from('recipes').delete().eq('id', id);
    
    if (error) {
      if (error.code === '23503') {
        toast({ 
          title: 'Não é possível excluir', 
          description: 'Esta receita está vinculada a lotes de produção. Crie uma nova versão em vez de excluir.',
          variant: 'destructive' 
        });
      } else {
        toast({ title: 'Erro', description: 'Erro ao excluir receita.', variant: 'destructive' });
      }
    } else {
      toast({ title: 'Excluído', description: 'Receita excluída.' });
    }
    fetchData();
  };

  // Group recipes by product
  const recipesByProduct = recipes.reduce((acc, recipe) => {
    const productName = recipe.products?.name || 'Sem produto';
    if (!acc[productName]) acc[productName] = [];
    acc[productName].push(recipe);
    return acc;
  }, {} as Record<string, Recipe[]>);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="font-title text-xl">Receitas / Fichas Técnicas</h2>
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Receita
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingRecipe ? 'Editar' : 'Nova'} Receita</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Produto *</Label>
                <Select 
                  value={formData.product_id} 
                  onValueChange={(v) => setFormData({ ...formData, product_id: v })}
                  disabled={!!editingRecipe}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o produto" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map(prod => (
                      <SelectItem key={prod.id} value={prod.id}>{prod.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Observações</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Instruções de preparo, cuidados, etc."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Componentes da Receita</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addItem}>
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar
                  </Button>
                </div>

                {formData.items.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4 bg-muted/50 rounded">
                    Adicione os componentes da receita
                  </p>
                ) : (
                  <div className="space-y-2">
                    {formData.items.map((item, index) => (
                      <div key={index} className="flex gap-2 items-end p-3 bg-muted/50 rounded-lg">
                        <div className="flex-1">
                          <Label className="text-xs">Matéria-prima</Label>
                          <Select 
                            value={item.raw_material_id} 
                            onValueChange={(v) => updateItem(index, 'raw_material_id', v)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              {rawMaterials.map(mat => (
                                <SelectItem key={mat.id} value={mat.id}>
                                  {mat.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="w-24">
                          <Label className="text-xs">Qtd</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                          />
                        </div>
                        <div className="w-20">
                          <Label className="text-xs">Unid</Label>
                          <Select 
                            value={item.unit} 
                            onValueChange={(v) => updateItem(index, 'unit', v)}
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
                        <div className="w-24 text-right">
                          <Label className="text-xs">Custo</Label>
                          <p className="text-sm font-medium py-2">
                            {formatCurrencyBRL(calculateItemCost(item.raw_material_id, item.quantity, item.unit))}
                          </p>
                        </div>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon"
                          onClick={() => removeItem(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-4 bg-primary/10 rounded-lg">
                <p className="text-lg font-bold text-primary">
                  Custo Total da Receita: {formatCurrencyBRL(totalCost)}
                </p>
                <p className="text-sm text-muted-foreground">
                  Este é o custo para produzir 1 unidade do produto
                </p>
              </div>

              <Button type="submit" className="w-full" disabled={!formData.product_id || formData.items.length === 0}>
                {editingRecipe ? 'Atualizar' : 'Criar'} Receita
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-center text-muted-foreground py-8">Carregando...</p>
      ) : Object.keys(recipesByProduct).length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              Nenhuma receita cadastrada
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(recipesByProduct).map(([productName, productRecipes]) => (
            <Card key={productName}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {productName}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {productRecipes.map((recipe) => (
                  <div 
                    key={recipe.id}
                    className={`p-4 rounded-lg ${
                      recipe.is_active 
                        ? 'bg-primary/10 border border-primary/30' 
                        : 'bg-muted/50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Versão {recipe.version}</span>
                          {recipe.is_active && (
                            <Badge variant="default">Ativa</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Custo: <strong>{formatCurrencyBRL(recipe.total_cost)}</strong>
                        </p>
                        {recipe.notes && (
                          <p className="text-xs text-muted-foreground mt-1">{recipe.notes}</p>
                        )}
                        <div className="mt-2 text-xs text-muted-foreground">
                            {recipe.recipe_items.map((item, i) => (
                              <span key={item.id}>
                                {item.raw_materials?.name}: {formatQuantityBR(item.quantity, item.unit)} {item.unit}
                                {i < recipe.recipe_items.length - 1 ? ' | ' : ''}
                              </span>
                            ))}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {!recipe.is_active && (
                          <Button 
                            variant="outline" 
                            size="icon"
                            onClick={() => setActive(recipe)}
                            title="Tornar ativa"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="outline" size="icon" onClick={() => openEdit(recipe)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="icon" onClick={() => deleteRecipe(recipe.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
