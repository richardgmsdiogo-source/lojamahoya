import { useEffect, useMemo, useState } from 'react';
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

type MeasurementUnit = Database['public']['Enums']['measurement_unit'];

type Product = Database['public']['Tables']['products']['Row'];

type RawMaterialLite = {
  id: string;
  name: string;
  unit: MeasurementUnit;
  avg_cost_per_unit: number; // custo médio por UNIDADE BASE (ml/g/un)
};

type RecipeItemRow = {
  id: string;
  recipe_id: string;
  raw_material_id: string;
  quantity: number;
  unit: MeasurementUnit;
  cost_at_creation: number | null;
  raw_materials: {
    id: string;
    name: string;
    unit: MeasurementUnit;
    avg_cost_per_unit: number;
  } | null;
};

type RecipeRow = {
  id: string;
  product_id: string;
  notes: string | null;
  version: number;
  total_cost: number | null; // snapshot na criação/última edição
  is_active: boolean;
  created_at: string;
  products: { name: string } | null;
  recipe_items: RecipeItemRow[];
};

const UNITS: { value: MeasurementUnit; label: string }[] = [
  { value: 'ml', label: 'ml' },
  { value: 'l', label: 'L' },
  { value: 'g', label: 'g' },
  { value: 'kg', label: 'kg' },
  { value: 'unidade', label: 'un' },
];

const safeNum = (v: any) => {
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

// Converte L->ml e kg->g (base)
const toBaseQty = (qty: number, unit: MeasurementUnit) => {
  if (unit === 'l') return qty * 1000;
  if (unit === 'kg') return qty * 1000;
  return qty;
};

export const AdminRecipesTab = () => {
  const { toast } = useToast();

  const [recipes, setRecipes] = useState<RecipeRow[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterialLite[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<RecipeRow | null>(null);

  const [formData, setFormData] = useState({
    product_id: '',
    notes: '',
    items: [] as Array<{
      raw_material_id: string;
      quantity: string;
      unit: MeasurementUnit;
    }>,
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [recipesRes, prodsRes, matsRes] = await Promise.all([
        supabase
          .from('recipes')
          .select(
            `
            id,
            product_id,
            notes,
            version,
            total_cost,
            is_active,
            created_at,
            products(name),
            recipe_items(
              id,
              recipe_id,
              raw_material_id,
              quantity,
              unit,
              cost_at_creation,
              raw_materials(
                id,
                name,
                unit,
                avg_cost_per_unit
              )
            )
          `
          )
          .order('created_at', { ascending: false }),

        supabase.from('products').select('*').eq('is_active', true).order('name'),

        supabase
          .from('raw_materials')
          .select('id, name, unit, avg_cost_per_unit')
          .eq('is_active', true)
          .order('name'),
      ]);

      if (recipesRes.error) throw recipesRes.error;
      if (prodsRes.error) throw prodsRes.error;
      if (matsRes.error) throw matsRes.error;

      setRecipes((recipesRes.data as any) ?? []);
      setProducts(prodsRes.data ?? []);
      setRawMaterials(
        ((matsRes.data ?? []) as any[]).map((m) => ({
          id: m.id,
          name: m.name,
          unit: m.unit,
          avg_cost_per_unit: safeNum(m.avg_cost_per_unit),
        }))
      );
    } catch (err: any) {
      console.error(err);
      toast({
        title: 'Erro',
        description: err?.message || 'Falha ao carregar dados.',
        variant: 'destructive',
      });
      setRecipes([]);
      setProducts([]);
      setRawMaterials([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => {
    setFormData({ product_id: '', notes: '', items: [] });
    setEditingRecipe(null);
  };

  const openEdit = (recipe: RecipeRow) => {
    setEditingRecipe(recipe);
    setFormData({
      product_id: recipe.product_id,
      notes: recipe.notes || '',
      items: (recipe.recipe_items || []).map((it) => ({
        raw_material_id: it.raw_material_id,
        quantity: String(it.quantity ?? ''),
        unit: it.unit,
      })),
    });
    setIsOpen(true);
  };

  const addItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, { raw_material_id: '', quantity: '', unit: 'ml' as MeasurementUnit }],
    }));
  };

  const removeItem = (index: number) => {
    setFormData((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  };

  const updateItem = (index: number, field: 'raw_material_id' | 'quantity' | 'unit', value: string) => {
    setFormData((prev) => {
      const items = [...prev.items];
      (items[index] as any) = { ...items[index], [field]: value };

      // se escolher matéria-prima, por padrão puxa a unidade dela
      if (field === 'raw_material_id') {
        const mat = rawMaterials.find((m) => m.id === value);
        if (mat) items[index] = { ...items[index], unit: mat.unit };
      }

      return { ...prev, items };
    });
  };

  const calcItemCostUsingAvg = (raw_material_id: string, quantityStr: string, unit: MeasurementUnit) => {
    const qty = safeNum(quantityStr);
    if (!raw_material_id || qty <= 0) return 0;

    const mat = rawMaterials.find((m) => m.id === raw_material_id);
    if (!mat) return 0;

    const baseQty = toBaseQty(qty, unit);
    const avg = safeNum(mat.avg_cost_per_unit);
    return baseQty * avg;
  };

  // custo do formulário (ao vivo)
  const totalCostLive = useMemo(() => {
    return formData.items.reduce((acc, it) => acc + calcItemCostUsingAvg(it.raw_material_id, it.quantity, it.unit), 0);
  }, [formData.items, rawMaterials]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.product_id) {
      toast({ title: 'Atenção', description: 'Selecione um produto.', variant: 'destructive' });
      return;
    }
    if (!formData.items.length) {
      toast({ title: 'Atenção', description: 'Adicione ao menos 1 componente.', variant: 'destructive' });
      return;
    }

    // valida itens
    for (const it of formData.items) {
      const qty = safeNum(it.quantity);
      if (!it.raw_material_id || qty <= 0) {
        toast({ title: 'Atenção', description: 'Há itens sem matéria-prima ou com quantidade inválida.', variant: 'destructive' });
        return;
      }
    }

    const { data: auth } = await supabase.auth.getUser();
    const userId = auth?.user?.id ?? null;

    try {
      if (editingRecipe) {
        // remove itens antigos
        const delRes = await supabase.from('recipe_items').delete().eq('recipe_id', editingRecipe.id);
        if (delRes.error) throw delRes.error;

        // atualiza receita (snapshot)
        const upRes = await supabase
          .from('recipes')
          .update({
            notes: formData.notes.trim() ? formData.notes.trim() : null,
            total_cost: totalCostLive,
          })
          .eq('id', editingRecipe.id);

        if (upRes.error) throw upRes.error;

        // insere itens novos (snapshot por item)
        for (const it of formData.items) {
          const qty = safeNum(it.quantity);
          const baseQty = toBaseQty(qty, it.unit);

          const mat = rawMaterials.find((m) => m.id === it.raw_material_id);
          const avg = safeNum(mat?.avg_cost_per_unit);
          const costAtCreation = baseQty * avg;

          const ins = await supabase.from('recipe_items').insert({
            recipe_id: editingRecipe.id,
            raw_material_id: it.raw_material_id,
            quantity: qty,
            unit: it.unit,
            cost_at_creation: costAtCreation,
          } as any);

          if (ins.error) throw ins.error;
        }

        toast({ title: 'Atualizado', description: 'Receita atualizada com sucesso.' });
      } else {
        // versão = quantidade de versões existentes + 1
        const cntRes = await supabase
          .from('recipes')
          .select('*', { count: 'exact', head: true })
          .eq('product_id', formData.product_id);

        if (cntRes.error) throw cntRes.error;
        const nextVersion = (cntRes.count || 0) + 1;

        // cria receita
        const newRes = await supabase
          .from('recipes')
          .insert({
            product_id: formData.product_id,
            notes: formData.notes.trim() ? formData.notes.trim() : null,
            version: nextVersion,
            total_cost: totalCostLive, // snapshot
            created_by: userId,
            is_active: false,
          } as any)
          .select()
          .single();

        if (newRes.error) throw newRes.error;
        const newRecipe = newRes.data as any;
        if (!newRecipe?.id) throw new Error('Falha ao obter ID da nova receita.');

        // itens
        for (const it of formData.items) {
          const qty = safeNum(it.quantity);
          const baseQty = toBaseQty(qty, it.unit);

          const mat = rawMaterials.find((m) => m.id === it.raw_material_id);
          const avg = safeNum(mat?.avg_cost_per_unit);
          const costAtCreation = baseQty * avg;

          const ins = await supabase.from('recipe_items').insert({
            recipe_id: newRecipe.id,
            raw_material_id: it.raw_material_id,
            quantity: qty,
            unit: it.unit,
            cost_at_creation: costAtCreation,
          } as any);

          if (ins.error) throw ins.error;
        }

        toast({ title: 'Criado', description: 'Receita criada com sucesso.' });
      }

      setIsOpen(false);
      resetForm();
      fetchData();
    } catch (err: any) {
      console.error(err);
      toast({
        title: 'Erro',
        description: err?.message || 'Falha ao salvar receita.',
        variant: 'destructive',
      });
    }
  };

  const setActive = async (recipe: RecipeRow) => {
    try {
      const off = await supabase.from('recipes').update({ is_active: false }).eq('product_id', recipe.product_id);
      if (off.error) throw off.error;

      const on = await supabase.from('recipes').update({ is_active: true }).eq('id', recipe.id);
      if (on.error) throw on.error;

      toast({ title: 'Ativado', description: 'Receita marcada como ativa.' });
      fetchData();
    } catch (err: any) {
      toast({ title: 'Erro', description: err?.message || 'Falha ao ativar receita.', variant: 'destructive' });
    }
  };

  const deleteRecipe = async (id: string) => {
    try {
      const delItems = await supabase.from('recipe_items').delete().eq('recipe_id', id);
      if (delItems.error) throw delItems.error;

      const del = await supabase.from('recipes').delete().eq('id', id);
      if (del.error) throw del.error;

      toast({ title: 'Excluído', description: 'Receita excluída.' });
      fetchData();
    } catch (err: any) {
      const code = err?.code;
      if (code === '23503') {
        toast({
          title: 'Não é possível excluir',
          description: 'Esta receita está vinculada a lotes de produção. Crie uma nova versão em vez de excluir.',
          variant: 'destructive',
        });
      } else {
        toast({ title: 'Erro', description: err?.message || 'Erro ao excluir receita.', variant: 'destructive' });
      }
    }
  };

  // custo "atual" da receita baseado no avg_cost_per_unit atual de cada matéria-prima
  const calcRecipeLiveCost = (r: RecipeRow) => {
    const items = r.recipe_items || [];
    return items.reduce((acc, it) => {
      const matAvg = safeNum(it.raw_materials?.avg_cost_per_unit);
      const baseQty = toBaseQty(safeNum(it.quantity), it.unit);
      return acc + baseQty * matAvg;
    }, 0);
  };

  const recipesByProduct = useMemo(() => {
    return recipes.reduce((acc, r) => {
      const name = r.products?.name || 'Sem produto';
      if (!acc[name]) acc[name] = [];
      acc[name].push(r);
      return acc;
    }, {} as Record<string, RecipeRow[]>);
  }, [recipes]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="font-title text-xl">Receitas / Fichas Técnicas</h2>

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
                  onValueChange={(v) => setFormData((p) => ({ ...p, product_id: v }))}
                  disabled={!!editingRecipe}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o produto" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Observações</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
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
                    {formData.items.map((it, idx) => {
                      const itemCost = calcItemCostUsingAvg(it.raw_material_id, it.quantity, it.unit);
                      const mat = rawMaterials.find((m) => m.id === it.raw_material_id);
                      const avg = safeNum(mat?.avg_cost_per_unit);

                      return (
                        <div key={idx} className="flex gap-2 items-end p-3 bg-muted/50 rounded-lg">
                          <div className="flex-1">
                            <Label className="text-xs">Matéria-prima</Label>
                            <Select value={it.raw_material_id} onValueChange={(v) => updateItem(idx, 'raw_material_id', v)}>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                              <SelectContent>
                                {rawMaterials.map((m) => (
                                  <SelectItem key={m.id} value={m.id}>
                                    {m.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {!!it.raw_material_id && avg <= 0 && (
                              <p className="text-xs text-destructive mt-1">
                                ⚠️ Custo médio (avg_cost_per_unit) está 0 — a receita ficará R$ 0,00 até você registrar entradas com valor.
                              </p>
                            )}
                          </div>

                          <div className="w-24">
                            <Label className="text-xs">Qtd</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={it.quantity}
                              onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                            />
                          </div>

                          <div className="w-20">
                            <Label className="text-xs">Unid</Label>
                            <Select value={it.unit} onValueChange={(v) => updateItem(idx, 'unit', v)}>
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
                          </div>

                          <div className="w-28 text-right">
                            <Label className="text-xs">Custo</Label>
                            <p className="text-sm font-medium py-2">{formatCurrencyBRL(itemCost)}</p>
                          </div>

                          <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(idx)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="p-4 bg-primary/10 rounded-lg">
                <p className="text-lg font-bold text-primary">Custo Total (médio atual): {formatCurrencyBRL(totalCostLive)}</p>
                <p className="text-sm text-muted-foreground">Calculado pelo avg_cost_per_unit atual das matérias-primas</p>
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
            <p className="text-center text-muted-foreground">Nenhuma receita cadastrada</p>
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
                {productRecipes.map((r) => {
                  const liveCost = calcRecipeLiveCost(r);
                  const snapshot = safeNum(r.total_cost);

                  return (
                    <div
                      key={r.id}
                      className={`p-4 rounded-lg ${r.is_active ? 'bg-primary/10 border border-primary/30' : 'bg-muted/50'}`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Versão {r.version}</span>
                            {r.is_active && <Badge variant="default">Ativa</Badge>}
                          </div>

                          <p className="text-sm text-muted-foreground mt-1">
                            <span className="mr-3">
                              Custo (médio atual): <strong>{formatCurrencyBRL(liveCost)}</strong>
                            </span>
                          </p>

                          {r.notes && <p className="text-xs text-muted-foreground mt-1">{r.notes}</p>}

                          <div className="mt-2 text-xs text-muted-foreground">
                            {(r.recipe_items || []).map((it, i) => (
                              <span key={it.id}>
                                {it.raw_materials?.name}: {formatQuantityBR(it.quantity, it.unit)} {it.unit}
                                {i < (r.recipe_items?.length || 0) - 1 ? ' | ' : ''}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          {!r.is_active && (
                            <Button variant="outline" size="icon" onClick={() => setActive(r)} title="Tornar ativa">
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          <Button variant="outline" size="icon" onClick={() => openEdit(r)} title="Editar">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="destructive" size="icon" onClick={() => deleteRecipe(r.id)} title="Excluir">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
