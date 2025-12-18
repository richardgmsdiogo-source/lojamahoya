import { useEffect, useState } from 'react';
import { 
  AlertTriangle, 
  Package2, 
  Factory, 
  TrendingUp, 
  DollarSign,
  ArrowDown,
  ArrowUp
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrencyBRL } from '@/lib/format';

interface DashboardData {
  lowStockItems: Array<{ id: string; name: string; current_quantity: number; minimum_stock: number; unit: string }>;
  recentBatches: Array<{ id: string; product_name: string; quantity_produced: number; total_cost: number; created_at: string }>;
  totalRawMaterials: number;
  totalProducts: number;
  monthlyBatches: number;
  averageProductCost: number;
  topCostProducts: Array<{ name: string; total_cost: number }>;
}

export const AdminDashboard = () => {
  const [data, setData] = useState<DashboardData>({
    lowStockItems: [],
    recentBatches: [],
    totalRawMaterials: 0,
    totalProducts: 0,
    monthlyBatches: 0,
    averageProductCost: 0,
    topCostProducts: []
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const [
        { data: batches },
        { count: rawMaterialsCount },
        { count: productsCount },
        { data: recipes },
      ] = await Promise.all([
        supabase
          .from('production_batches')
          .select(`
            id,
            quantity_produced,
            total_cost,
            created_at,
            products!inner(name)
          `)
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase.from('raw_materials').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('products').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase
          .from('recipes')
          .select('total_cost, products!inner(name)')
          .eq('is_active', true)
          .order('total_cost', { ascending: false })
          .limit(5)
      ]);

      // Get low stock items separately
      const { data: lowStockItems } = await supabase
        .from('raw_materials')
        .select('id, name, current_quantity, minimum_stock, unit')
        .eq('is_active', true);

      const filteredLowStock = lowStockItems?.filter(
        item => item.current_quantity <= item.minimum_stock
      ) || [];

      // Get monthly batches count
      const { count: monthlyCount } = await supabase
        .from('production_batches')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed')
        .gte('created_at', startOfMonth.toISOString());

      // Calculate average recipe cost
      const { data: allRecipes } = await supabase
        .from('recipes')
        .select('total_cost')
        .eq('is_active', true);
      
      const avgCost = allRecipes && allRecipes.length > 0
        ? allRecipes.reduce((acc, r) => acc + (r.total_cost || 0), 0) / allRecipes.length
        : 0;

      setData({
        lowStockItems: filteredLowStock,
        recentBatches: batches?.map(b => ({
          id: b.id,
          product_name: (b.products as any)?.name || 'Produto',
          quantity_produced: b.quantity_produced,
          total_cost: b.total_cost,
          created_at: b.created_at || ''
        })) || [],
        totalRawMaterials: rawMaterialsCount || 0,
        totalProducts: productsCount || 0,
        monthlyBatches: monthlyCount || 0,
        averageProductCost: avgCost,
        topCostProducts: recipes?.map(r => ({
          name: (r.products as any)?.name || 'Produto',
          total_cost: r.total_cost
        })) || []
      });

      setIsLoading(false);
    };

    fetchDashboardData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Carregando dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="font-title text-2xl text-primary">Dashboard</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Matérias-primas
            </CardTitle>
            <Package2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalRawMaterials}</div>
            <p className="text-xs text-muted-foreground">itens cadastrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Produtos
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalProducts}</div>
            <p className="text-xs text-muted-foreground">ativos no catálogo</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Lotes no Mês
            </CardTitle>
            <Factory className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.monthlyBatches}</div>
            <p className="text-xs text-muted-foreground">produções realizadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Custo Médio
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrencyBRL(data.averageProductCost)}
            </div>
            <p className="text-xs text-muted-foreground">por receita ativa</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Alerts */}
        <Card className={data.lowStockItems.length > 0 ? "border-destructive/50" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className={data.lowStockItems.length > 0 ? "h-5 w-5 text-destructive" : "h-5 w-5 text-muted-foreground"} />
              Alertas de Estoque Baixo
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.lowStockItems.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                Nenhum item abaixo do estoque mínimo
              </p>
            ) : (
              <div className="space-y-3">
                {data.lowStockItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-2 rounded bg-destructive/10">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Mínimo: {item.minimum_stock} {item.unit}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant="destructive" className="flex items-center gap-1">
                        <ArrowDown className="h-3 w-3" />
                        {item.current_quantity} {item.unit}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Cost Products */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ArrowUp className="h-5 w-5 text-muted-foreground" />
              Produtos com Maior Custo
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.topCostProducts.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                Nenhuma receita cadastrada
              </p>
            ) : (
              <div className="space-y-3">
                {data.topCostProducts.map((product, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded bg-muted/50">
                    <span className="font-medium">{product.name}</span>
                    <Badge variant="secondary">
                      {formatCurrencyBRL(product.total_cost)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Batches */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Factory className="h-5 w-5 text-muted-foreground" />
            Produções Recentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.recentBatches.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              Nenhuma produção registrada
            </p>
          ) : (
            <div className="space-y-2">
              {data.recentBatches.map((batch) => (
                <div key={batch.id} className="flex items-center justify-between p-3 rounded bg-muted/50">
                  <div>
                    <p className="font-medium">{batch.product_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(batch.created_at).toLocaleDateString('pt-BR', { 
                        day: '2-digit', 
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{batch.quantity_produced} un.</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrencyBRL(batch.total_cost)}
                    </p>
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
