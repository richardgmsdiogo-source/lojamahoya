import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Package, Pencil } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

import { formatCurrencyBRL } from "@/lib/format";

// ===== helpers
const safeNum = (v: any) => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "0").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

// se você usa L/kg, aqui você alinha com a Produção
const toBaseQty = (qty: number, unit: string) => {
  const u = String(unit ?? "").toLowerCase();
  if (u === "l") return qty * 1000;
  if (u === "kg") return qty * 1000;
  return qty;
};

type ProductRow = {
  id: string;
  name: string;
  slug: string | null;
  price: number | null;
  is_active: boolean | null;
  image_url: string | null;
  category: { name: string } | null;
  finished_goods_stock: { current_quantity: number } | null; // normalizado
};

type RecipeActiveRow = {
  product_id: string;
  id: string;
  is_active: boolean;
  version: number | null;
  recipe_items: Array<{
    quantity: number;
    unit: string;
    raw_materials: { avg_cost_per_unit: number | null } | null;
  }>;
};

type LastBatchCostRow = {
  product_id: string;
  unit_cost: number | null;
  total_cost: number | null;
  quantity_produced: number | null;
  created_at: string;
  status_new: string | null;
};

export const AdminFinishedGoodsTab = () => {
  const { toast } = useToast();

  const [editing, setEditing] = useState<null | ProductRow>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [quantity, setQuantity] = useState("");
  const [finalPrice, setFinalPrice] = useState("");

  // 1) Produtos + estoque acabado
  const { data: products = [], refetch: refetchProducts, isLoading } = useQuery({
    queryKey: ["fg-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(`
          id,
          name,
          slug,
          price,
          is_active,
          image_url,
          category:categories(name),
          finished_goods_stock(current_quantity)
        `)
        .order("name");

      if (error) throw error;

      // normaliza relação (array -> 1)
      return (data ?? []).map((p: any) => {
        const rel = p.finished_goods_stock;
        const normalized = Array.isArray(rel) ? (rel[0] ?? null) : (rel ?? null);
        return { ...p, finished_goods_stock: normalized } as ProductRow;
      });
    },
  });

  // 2) Receita ativa (para custo ao vivo)
  const { data: activeRecipes = [] } = useQuery({
    queryKey: ["fg-active-recipes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recipes")
        .select(`
          id,
          product_id,
          is_active,
          version,
          recipe_items(
            quantity,
            unit,
            raw_materials(avg_cost_per_unit)
          )
        `)
        .eq("is_active", true);

      if (error) throw error;
      return (data ?? []) as any as RecipeActiveRow[];
    },
  });

  // 3) Último lote concluído (para custo real)
  const { data: lastBatches = [] } = useQuery({
    queryKey: ["fg-last-batches"],
    queryFn: async () => {
      // pega últimos lotes concluídos (ajuste nomes se necessário)
      const { data, error } = await supabase
        .from("production_batches")
        .select("product_id, unit_cost, total_cost, quantity_produced, created_at, status_new")
        .eq("status_new", "concluido")
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;
      return (data ?? []) as any as LastBatchCostRow[];
    },
  });

  const recipeByProduct = useMemo(() => {
    const m = new Map<string, RecipeActiveRow>();
    for (const r of activeRecipes) m.set(r.product_id, r);
    return m;
  }, [activeRecipes]);

  const lastBatchByProduct = useMemo(() => {
    const m = new Map<string, LastBatchCostRow>();
    for (const b of lastBatches) {
      if (!m.has(b.product_id)) m.set(b.product_id, b); // como já está ordenado desc, o primeiro é o mais recente
    }
    return m;
  }, [lastBatches]);

  const getStock = (p: ProductRow) => safeNum(p.finished_goods_stock?.current_quantity);

  const getLiveRecipeUnitCost = (productId: string) => {
    const r = recipeByProduct.get(productId);
    if (!r) return 0;

    const total = (r.recipe_items ?? []).reduce((acc, it) => {
      const avg = safeNum(it.raw_materials?.avg_cost_per_unit);
      const requiredBase = toBaseQty(safeNum(it.quantity), String(it.unit ?? ""));
      return acc + requiredBase * avg;
    }, 0);

    return total; // custo por 1 unidade do produto (mesma ideia do AdminProductionTab)
  };

  const getUnitCost = (productId: string): { value: number; source: "batch" | "recipe" | "none" } => {
    const last = lastBatchByProduct.get(productId);
    if (last && safeNum(last.unit_cost) > 0) return { value: safeNum(last.unit_cost), source: "batch" };

    const live = getLiveRecipeUnitCost(productId);
    if (live > 0) return { value: live, source: "recipe" };

    return { value: 0, source: "none" };
  };

  const openEdit = (p: ProductRow) => {
    setEditing(p);
    setQuantity(String(getStock(p)));
    setFinalPrice(String(safeNum(p.price)));
    setIsEditOpen(true);
  };

  const save = async () => {
    if (!editing) return;

    const newPrice = safeNum(finalPrice);
    const newQty = Math.max(0, Math.floor(safeNum(quantity)));

    if (newPrice <= 0) {
      toast({ title: "Erro", description: "Preço inválido.", variant: "destructive" });
      return;
    }

    // 1) preço
    const { error: priceErr } = await supabase
      .from("products")
      .update({ price: newPrice, updated_at: new Date().toISOString() })
      .eq("id", editing.id);

    if (priceErr) {
      toast({ title: "Erro", description: "Erro ao atualizar preço: " + priceErr.message, variant: "destructive" });
      return;
    }

    // 2) estoque
    const { error: stockErr } = await supabase
      .from("finished_goods_stock")
      .upsert(
        { product_id: editing.id, current_quantity: newQty, updated_at: new Date().toISOString() },
        { onConflict: "product_id" }
      );

    if (stockErr) {
      toast({ title: "Erro", description: "Erro ao atualizar estoque: " + stockErr.message, variant: "destructive" });
      return;
    }

    toast({ title: "Sucesso", description: "Produto atualizado." });
    setIsEditOpen(false);
    setEditing(null);
    refetchProducts();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Estoque & Preços de Venda ({products.length})
        </CardTitle>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <p className="text-center text-muted-foreground py-8">Carregando...</p>
        ) : products.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Nenhum produto cadastrado</p>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-6 gap-4 p-3 bg-muted rounded-lg font-medium text-sm">
              <span className="col-span-2">Produto</span>
              <span className="text-right">Custo (un)</span>
              <span className="text-right">Preço Venda</span>
              <span className="text-right">Estoque</span>
              <span className="text-right">Ações</span>
            </div>

            {products.map((p) => {
              const stock = getStock(p);
              const unitCost = getUnitCost(p.id);

              return (
                <div
                  key={p.id}
                  className={`grid grid-cols-6 gap-4 p-4 rounded-lg items-center ${
                    p.is_active ? "bg-muted/50" : "bg-muted/30 opacity-60"
                  }`}
                >
                  <div className="col-span-2 flex items-center gap-3 min-w-0">
                    {p.image_url && (
                      <img
                        src={p.image_url}
                        alt={p.name}
                        loading="lazy"
                        className="w-10 h-10 object-cover rounded"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="font-medium truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {p.category?.name ?? "Sem categoria"} •{" "}
                        {unitCost.source === "batch" ? "custo: último lote" : unitCost.source === "recipe" ? "custo: receita" : "custo: n/d"}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <Badge variant="secondary">{formatCurrencyBRL(unitCost.value)}</Badge>
                  </div>

                  <div className="text-right font-medium">{formatCurrencyBRL(safeNum(p.price))}</div>

                  <div className="text-right">
                    <Badge variant="outline">{stock}</Badge>
                  </div>

                  <div className="text-right">
                    <Button size="sm" variant="outline" onClick={() => openEdit(p)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar produto</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label>Estoque (un)</Label>
                <Input type="number" step="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
              </div>

              <div>
                <Label>Preço de venda (R$)</Label>
                <Input type="number" step="0.01" value={finalPrice} onChange={(e) => setFinalPrice(e.target.value)} />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={save}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
