import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Building2, TrendingDown } from "lucide-react";
import { formatCurrencyBRL } from "@/lib/format";
import { format, parseISO, differenceInMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

const CATEGORIES = [
  { value: "equipamento", label: "Equipamento" },
  { value: "moveis", label: "Móveis" },
  { value: "informatica", label: "Informática" },
  { value: "veiculo", label: "Veículo" },
  { value: "maquinario", label: "Maquinário" },
  { value: "outros", label: "Outros" },
];

type FixedAsset = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  purchase_date: string | null;
  purchase_value: number;
  current_value: number;
  useful_life_months: number | null;
  depreciation_rate: number | null;
  location: string | null;
  serial_number: string | null;
  supplier: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string | null;
};

type AssetFormData = {
  name: string;
  description?: string;
  category: string;
  purchase_date?: string;
  purchase_value: number;
  current_value: number;
  useful_life_months?: number;
  location?: string;
  serial_number?: string;
  supplier?: string;
  notes?: string;
  is_active: boolean;
};

export function AdminImobilizadoTab() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<FixedAsset | null>(null);
  const queryClient = useQueryClient();

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ["fixed-assets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fixed_assets")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as FixedAsset[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (asset: AssetFormData) => {
      const { error } = await supabase.from("fixed_assets").insert([asset]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fixed-assets"] });
      toast.success("Ativo cadastrado com sucesso!");
      setIsOpen(false);
    },
    onError: () => toast.error("Erro ao cadastrar ativo"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...asset }: Partial<FixedAsset> & { id: string }) => {
      const { error } = await supabase.from("fixed_assets").update(asset).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fixed-assets"] });
      toast.success("Ativo atualizado!");
      setIsOpen(false);
      setEditingAsset(null);
    },
    onError: () => toast.error("Erro ao atualizar ativo"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("fixed_assets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fixed-assets"] });
      toast.success("Ativo removido!");
    },
    onError: () => toast.error("Erro ao remover ativo"),
  });

  // Calculate totals
  const totalPurchaseValue = assets.reduce((sum, a) => sum + Number(a.purchase_value), 0);
  const totalCurrentValue = assets.reduce((sum, a) => sum + Number(a.current_value), 0);
  const totalDepreciation = totalPurchaseValue - totalCurrentValue;

  const calculateDepreciation = (asset: FixedAsset) => {
    if (!asset.purchase_date || !asset.useful_life_months) return asset.purchase_value;
    const months = differenceInMonths(new Date(), parseISO(asset.purchase_date));
    const monthlyDep = asset.purchase_value / asset.useful_life_months;
    const depreciated = Math.min(months * monthlyDep, asset.purchase_value);
    return Math.max(0, asset.purchase_value - depreciated);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Imobilizado</h2>
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) setEditingAsset(null); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Novo Ativo</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingAsset ? "Editar Ativo" : "Novo Ativo"}</DialogTitle>
            </DialogHeader>
            <AssetForm
              asset={editingAsset}
              onSubmit={(data) => {
                if (editingAsset) {
                  updateMutation.mutate({ id: editingAsset.id, ...data });
                } else {
                  createMutation.mutate(data);
                }
              }}
              isLoading={createMutation.isPending || updateMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Valor de Aquisição</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrencyBRL(totalPurchaseValue)}</div>
            <p className="text-xs text-muted-foreground">{assets.length} ativos cadastrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Valor Atual</CardTitle>
            <Building2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{formatCurrencyBRL(totalCurrentValue)}</div>
            <p className="text-xs text-muted-foreground">Após depreciação</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Depreciação Total</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{formatCurrencyBRL(totalDepreciation)}</div>
            <p className="text-xs text-muted-foreground">
              {totalPurchaseValue > 0 ? ((totalDepreciation / totalPurchaseValue) * 100).toFixed(1) : 0}% do valor original
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Assets Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Data Aquisição</TableHead>
                <TableHead className="text-right">Valor Aquisição</TableHead>
                <TableHead className="text-right">Valor Atual</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">Carregando...</TableCell>
                </TableRow>
              ) : assets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhum ativo cadastrado
                  </TableCell>
                </TableRow>
              ) : (
                assets.map((asset) => (
                  <TableRow key={asset.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{asset.name}</p>
                        {asset.serial_number && (
                          <p className="text-xs text-muted-foreground">S/N: {asset.serial_number}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {CATEGORIES.find((c) => c.value === asset.category)?.label || asset.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {asset.purchase_date
                        ? format(parseISO(asset.purchase_date), "dd/MM/yyyy", { locale: ptBR })
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrencyBRL(asset.purchase_value)}</TableCell>
                    <TableCell className="text-right">{formatCurrencyBRL(asset.current_value)}</TableCell>
                    <TableCell>
                      <Badge variant={asset.is_active ? "default" : "secondary"}>
                        {asset.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => { setEditingAsset(asset); setIsOpen(true); }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm("Remover este ativo?")) {
                              deleteMutation.mutate(asset.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function AssetForm({
  asset,
  onSubmit,
  isLoading,
}: {
  asset: FixedAsset | null;
  onSubmit: (data: AssetFormData) => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState({
    name: asset?.name || "",
    description: asset?.description || "",
    category: asset?.category || "outros",
    purchase_date: asset?.purchase_date || "",
    purchase_value: asset?.purchase_value || 0,
    current_value: asset?.current_value || 0,
    useful_life_months: asset?.useful_life_months || 60,
    location: asset?.location || "",
    serial_number: asset?.serial_number || "",
    supplier: asset?.supplier || "",
    notes: asset?.notes || "",
    is_active: asset?.is_active ?? true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Nome *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Categoria</Label>
          <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="purchase_date">Data de Aquisição</Label>
          <Input
            id="purchase_date"
            type="date"
            value={formData.purchase_date}
            onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="purchase_value">Valor de Aquisição *</Label>
          <Input
            id="purchase_value"
            type="number"
            step="0.01"
            value={formData.purchase_value}
            onChange={(e) => setFormData({ ...formData, purchase_value: parseFloat(e.target.value) || 0 })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="current_value">Valor Atual</Label>
          <Input
            id="current_value"
            type="number"
            step="0.01"
            value={formData.current_value}
            onChange={(e) => setFormData({ ...formData, current_value: parseFloat(e.target.value) || 0 })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="useful_life_months">Vida Útil (meses)</Label>
          <Input
            id="useful_life_months"
            type="number"
            value={formData.useful_life_months}
            onChange={(e) => setFormData({ ...formData, useful_life_months: parseInt(e.target.value) || 60 })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="serial_number">Número de Série</Label>
          <Input
            id="serial_number"
            value={formData.serial_number}
            onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="supplier">Fornecedor</Label>
          <Input
            id="supplier"
            value={formData.supplier}
            onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="location">Localização</Label>
          <Input
            id="location"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Observações</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={2}
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Salvando..." : asset ? "Atualizar" : "Cadastrar"}
        </Button>
      </div>
    </form>
  );
}
