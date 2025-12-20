import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Package2,
  Factory,
  TrendingUp,
  DollarSign,
  ArrowDown,
  ArrowUp,
  Layers,
  Users,
  Crown,
  Clock,
  ShoppingBag,
  Wallet,
  Receipt,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrencyBRL } from '@/lib/format';

type LowStockItem = {
  id: string;
  name: string;
  current_quantity: number;
  minimum_stock: number;
  unit: string;
};

type TopProduct = { name: string; value: number; extra?: string };
type CategoryCount = { category: string; count: number };

type DashboardData = {
  // Produção
  lowStockItems: LowStockItem[];
  productsByCategory: CategoryCount[];
  topCostProducts: TopProduct[];
  topSoldProducts: TopProduct[];

  // Financeiro
  cashBalance: number | null; // saldo do mês (caixa)
  avgTicket: number | null; // ticket médio do mês (AR recebido)
  marginPct: number | null; // margem do mês (receita - CPV) / receita

  // Aventureiros
  avgXpPerUser: number | null;
  titleDistribution: Array<{ title: string; count: number }>;
  avgTenureDays: number | null;

  // Básicos
  totalProducts: number;
  totalRawMaterials: number;
  monthlyBatches: number;
};

const safeNumber = (n: any) => {
  const v = typeof n === 'number' ? n : parseFloat(String(n ?? '0').replace(',', '.'));
  return Number.isFinite(v) ? v : 0;
};

export const AdminDashboard = () => {
  const navigate = useNavigate();

  const [data, setData] = useState<DashboardData>({
    lowStockItems: [],
    productsByCategory: [],
    topCostProducts: [],
    topSoldProducts: [],
    cashBalance: null,
    avgTicket: null,
    marginPct: null,
    avgXpPerUser: null,
    titleDistribution: [],
    avgTenureDays: null,
    totalProducts: 0,
    totalRawMaterials: 0,
    monthlyBatches: 0,
  });

  const [isLoading, setIsLoading] = useState(true);

  const startOfMonthISO = useMemo(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }, []);

  useEffect(() => {
    const fetchDashboard = async () => {
      setIsLoading(true);

      // =========================
      // 1) Produção: Estoque baixo
      // =========================
      const lowStockRes = await supabase
        .from('raw_materials')
        .select('id, name, current_quantity, minimum_stock, unit')
        .eq('is_active', true);

      const lowStockItems =
        (lowStockRes.data || [])
          .filter((x: any) => safeNumber(x.current_quantity) <= safeNumber(x.minimum_stock))
          .sort((a: any, b: any) => safeNumber(a.current_quantity) - safeNumber(b.current_quantity))
          .slice(0, 8) || [];

      // =========================
      // 2) Contadores básicos
      // =========================
      const [rawCountRes, prodCountRes, monthlyBatchesRes] = await Promise.all([
        supabase.from('raw_materials').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('products').select('*', { count: 'exact', head: true }).eq('is_active', true),

        // ✅ lotes "concluídos" (compatível com status/status_new)
        supabase
          .from('production_batches')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', startOfMonthISO)
          .or('status.eq.completed,status.eq.concluido,status_new.eq.concluido'),
      ]);

      // =========================
      // 3) Produtos por categoria (ativos)
      // =========================
      const productsForCategoryRes = await supabase
        .from('products')
        .select('id, is_active, category_id, categories(name)')
        .eq('is_active', true);

      let productsByCategory: CategoryCount[] = [];
      if (!productsForCategoryRes.error && productsForCategoryRes.data) {
        const map = new Map<string, number>();
        for (const p of productsForCategoryRes.data as any[]) {
          const catName = p?.categories?.name || 'Sem categoria';
          map.set(catName, (map.get(catName) || 0) + 1);
        }
        productsByCategory = Array.from(map.entries())
          .map(([category, count]) => ({ category, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 8);
      }

      // =========================
      // 4) Top custo (por custo médio "ao vivo")
      //    - não depende de recipes.total_cost (que pode nem existir)
      // =========================
      let topCostProducts: TopProduct[] = [];
      try {
        const recipesRes = await supabase
          .from('recipes')
          .select(
            `
            id,
            is_active,
            products(name),
            recipe_items(
              quantity,
              unit,
              raw_materials(cost_per_unit)
            )
          `
          )
          .eq('is_active', true)
          .limit(80);

        if (!recipesRes.error && recipesRes.data) {
          const calc = (r: any) => {
            const items = r?.recipe_items || [];
            return items.reduce((sum: number, it: any) => {
              const qty = safeNumber(it?.quantity);
              const avg = safeNumber(it?.raw_materials?.cost_per_unit);
              // aqui você já trabalha em unidade base no estoque (ml/g/un), então mantemos simples
              return sum + qty * avg;
            }, 0);
          };

          topCostProducts = (recipesRes.data as any[])
            .map((r) => ({ name: r?.products?.name || 'Produto', value: calc(r) }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);
        }
      } catch {
        topCostProducts = [];
      }

      // =========================
      // 5) Top vendidos (order_items)
      // =========================
      let topSoldProducts: TopProduct[] = [];
      try {
        const orderItemsRes = await supabase
          .from('order_items')
          .select('quantity, product_id, products(name)')
          .order('created_at', { ascending: false })
          .limit(500);

        if (!orderItemsRes.error && orderItemsRes.data) {
          const agg = new Map<string, { name: string; qty: number }>();
          for (const it of orderItemsRes.data as any[]) {
            const name = it?.products?.name || 'Produto';
            const key = it?.product_id || name;
            const prev = agg.get(key) || { name, qty: 0 };
            prev.qty += safeNumber(it?.quantity);
            agg.set(key, prev);
          }

          topSoldProducts = Array.from(agg.values())
            .sort((a, b) => b.qty - a.qty)
            .slice(0, 5)
            .map((x) => ({ name: x.name, value: x.qty, extra: 'un.' }));
        }
      } catch {
        topSoldProducts = [];
      }

      // =========================
      // 6) Financeiro (AGORA via AR/AP)
      // =========================
      let cashBalance: number | null = null;
      let avgTicket: number | null = null;
      let marginPct: number | null = null;

      // AR recebido no mês (caixa)
      const arPayRes = await supabase
        .from('ar_payments' as any)
        .select('amount, received_at')
        .gte('received_at', startOfMonthISO);

      // AP pago no mês (caixa)
      const apPayRes = await supabase
        .from('ap_payments' as any)
        .select('amount, paid_at')
        .gte('paid_at', startOfMonthISO);

      const arAmounts = (arPayRes.data || []).map((x: any) => safeNumber(x.amount)).filter((v) => v > 0);
      const apAmounts = (apPayRes.data || []).map((x: any) => safeNumber(x.amount)).filter((v) => v > 0);

      if (!arPayRes.error || !apPayRes.error) {
        const inflow = arAmounts.reduce((a, b) => a + b, 0);
        const outflow = apAmounts.reduce((a, b) => a + b, 0);
        cashBalance = inflow - outflow;

        avgTicket = arAmounts.length ? inflow / arAmounts.length : null;
      }

      // CPV do mês (custo médio) — informativo pra margem
      const batchesRes = await supabase
        .from('production_batches')
        .select('total_cost, status, status_new, created_at')
        .gte('created_at', startOfMonthISO);

      const cpvMonth =
        (batchesRes.data || [])
          .filter((b: any) => {
            const s = String(b.status ?? '').toLowerCase();
            const sn = String(b.status_new ?? '').toLowerCase();
            return s !== 'estornado' && sn !== 'estornado' && s !== 'perda' && sn !== 'perda';
          })
          .reduce((sum: number, b: any) => sum + safeNumber(b.total_cost), 0) || 0;

      const revenueMonth = arAmounts.reduce((a, b) => a + b, 0);
      if (revenueMonth > 0) {
        const lucroBruto = revenueMonth - cpvMonth;
        marginPct = (lucroBruto / revenueMonth) * 100;
      } else {
        marginPct = null;
      }

      // =========================
      // 7) Aventureiros (fallback)
      // =========================
      let avgXpPerUser: number | null = null;
      let titleDistribution: Array<{ title: string; count: number }> = [];
      let avgTenureDays: number | null = null;

      try {
        const profilesRes = await supabase.from('profiles').select('xp_total, created_at, title');
        if (!profilesRes.error && profilesRes.data && profilesRes.data.length > 0) {
          const arr = profilesRes.data as any[];

          const xp = arr.map((p) => safeNumber(p.xp_total));
          avgXpPerUser = xp.length ? xp.reduce((a, b) => a + b, 0) / xp.length : null;

          const map = new Map<string, number>();
          for (const p of arr) {
            const t = (p.title || 'Sem título') as string;
            map.set(t, (map.get(t) || 0) + 1);
          }
          titleDistribution = Array.from(map.entries())
            .map(([title, count]) => ({ title, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 6);

          const now = Date.now();
          const days = arr
            .map((p) => {
              const dt = p.created_at ? new Date(p.created_at).getTime() : null;
              if (!dt) return null;
              return (now - dt) / (1000 * 60 * 60 * 24);
            })
            .filter((x) => typeof x === 'number') as number[];

          avgTenureDays = days.length ? days.reduce((a, b) => a + b, 0) / days.length : null;
        }
      } catch {}

      setData({
        lowStockItems: lowStockItems as any,
        productsByCategory,
        topCostProducts,
        topSoldProducts,

        cashBalance,
        avgTicket,
        marginPct,

        avgXpPerUser,
        titleDistribution,
        avgTenureDays,

        totalRawMaterials: rawCountRes.count || 0,
        totalProducts: prodCountRes.count || 0,
        monthlyBatches: monthlyBatchesRes.count || 0,
      });

      setIsLoading(false);
    };

    fetchDashboard();
  }, [startOfMonthISO]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Carregando o Ateliê Arcano...</div>
      </div>
    );
  }

  const fmtMaybe = (v: number | null, kind: 'money' | 'pct' | 'num') => {
    if (v === null || typeof v !== 'number') return 'Não configurado';
    if (kind === 'money') return formatCurrencyBRL(v);
    if (kind === 'pct') return `${v.toFixed(1)}%`;
    return v.toFixed(0);
  };

  const clickable = (path: string) =>
    `cursor-pointer hover:shadow-md transition-shadow` as const;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-title text-2xl text-primary">Ateliê Arcano</h1>
        <p className="text-sm text-muted-foreground">Visão geral do reino: produção, finanças e aventureiros.</p>
      </div>

      {/* =======================
          PRODUÇÃO
      ======================= */}
      <div className="space-y-4">
        <h2 className="font-title text-lg text-primary flex items-center gap-2">
          <Factory className="h-5 w-5" />
          Indicadores de Produção
        </h2>

        {/* KPIs produção */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card onClick={() => navigate('/admin/materias-primas')} className={clickable('/admin/materias-primas')}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Matérias-primas</CardTitle>
              <Package2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.totalRawMaterials}</div>
              <p className="text-xs text-muted-foreground">itens ativos no estoque</p>
            </CardContent>
          </Card>

          <Card onClick={() => navigate('/admin/produtos')} className={clickable('/admin/produtos')}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Produtos ativos</CardTitle>
              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.totalProducts}</div>
              <p className="text-xs text-muted-foreground">no Inventário do Ateliê</p>
            </CardContent>
          </Card>

          <Card onClick={() => navigate('/admin/producao')} className={clickable('/admin/producao')}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Lotes no mês</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.monthlyBatches}</div>
              <p className="text-xs text-muted-foreground">produções concluídas</p>
            </CardContent>
          </Card>
        </div>

        {/* Listas produção */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Estoque baixo */}
          <Card className={data.lowStockItems.length > 0 ? 'border-destructive/50' : ''}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <AlertTriangle
                  className={
                    data.lowStockItems.length > 0 ? 'h-5 w-5 text-destructive' : 'h-5 w-5 text-muted-foreground'
                  }
                />
                Alerta de estoque baixo
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.lowStockItems.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">Nenhum item abaixo do mínimo 🎉</p>
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
                      <Badge variant="destructive" className="flex items-center gap-1">
                        <ArrowDown className="h-3 w-3" />
                        {item.current_quantity} {item.unit}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Produtos por categoria */}
          <Card onClick={() => navigate('/admin/categorias')} className={clickable('/admin/categorias')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Layers className="h-5 w-5 text-muted-foreground" />
                Qtde de produtos ativos por categoria
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.productsByCategory.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">Categorias ainda não conectadas aos produtos.</p>
              ) : (
                <div className="space-y-3">
                  {data.productsByCategory.map((c) => (
                    <div key={c.category} className="flex items-center justify-between p-2 rounded bg-muted/50">
                      <span className="font-medium">{c.category}</span>
                      <Badge variant="secondary">{c.count}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Top custo + Top vendidos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top custo */}
          <Card onClick={() => navigate('/admin/receitas')} className={clickable('/admin/receitas')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ArrowUp className="h-5 w-5 text-muted-foreground" />
                Produtos de maior custo (custo médio)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.topCostProducts.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">Nenhuma receita ativa cadastrada.</p>
              ) : (
                <div className="space-y-3">
                  {data.topCostProducts.map((p, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded bg-muted/50">
                      <span className="font-medium">{p.name}</span>
                      <Badge variant="secondary">{formatCurrencyBRL(p.value)}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top vendidos */}
          <Card onClick={() => navigate('/admin/pedidos')} className={clickable('/admin/pedidos')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-5 w-5 text-muted-foreground" />
                Produtos mais vendidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.topSoldProducts.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  Não consegui ler vendas ainda (verifique <code>orders</code>/<code>order_items</code>).
                </p>
              ) : (
                <div className="space-y-3">
                  {data.topSoldProducts.map((p, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded bg-muted/50">
                      <span className="font-medium">{p.name}</span>
                      <Badge variant="secondary">
                        {p.value} {p.extra || ''}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* =======================
          FINANCEIRO
      ======================= */}
      <div className="space-y-4">
        <h2 className="font-title text-lg text-primary flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Indicadores Financeiros (mês atual)
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card
            onClick={() => navigate('/admin/financeiro/fluxo-caixa')}
            className={clickable('/admin/financeiro/fluxo-caixa')}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Saldo (fluxo de caixa)</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{fmtMaybe(data.cashBalance, 'money')}</div>
              <p className="text-xs text-muted-foreground">AR recebido − AP pago</p>
            </CardContent>
          </Card>

          <Card
            onClick={() => navigate('/admin/financeiro/contas-a-receber')}
            className={clickable('/admin/financeiro/contas-a-receber')}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Contas a Receber</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{fmtMaybe(data.avgTicket, 'money')}</div>
              <p className="text-xs text-muted-foreground">ticket médio (recebimentos)</p>
            </CardContent>
          </Card>

          <Card
            onClick={() => navigate('/admin/financeiro/dre')}
            className={clickable('/admin/financeiro/dre')}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Margem (estimada)</CardTitle>
              <ArrowUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{fmtMaybe(data.marginPct, 'pct')}</div>
              <p className="text-xs text-muted-foreground">receita (AR) vs CPV (lotes)</p>
            </CardContent>
          </Card>

          <Card
            onClick={() => navigate('/admin/financeiro/contas-a-pagar')}
            className={clickable('/admin/financeiro/contas-a-pagar')}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Contas a Pagar</CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Abrir</div>
              <p className="text-xs text-muted-foreground">fornecedores, parcelas e baixas</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* =======================
          AVENTUREIROS
      ======================= */}
      <div className="space-y-4">
        <h2 className="font-title text-lg text-primary flex items-center gap-2">
          <Users className="h-5 w-5" />
          Indicadores de Aventureiros
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">XP médio por aventureiro</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{fmtMaybe(data.avgXpPerUser, 'num')}</div>
              <p className="text-xs text-muted-foreground">média do campo profiles.xp_total</p>
            </CardContent>
          </Card>

          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Crown className="h-5 w-5 text-muted-foreground" />
                Distribuição de títulos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.titleDistribution.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">Sem dados de títulos em <code>profiles</code>.</p>
              ) : (
                <div className="space-y-3">
                  {data.titleDistribution.map((t) => (
                    <div key={t.title} className="flex items-center justify-between p-2 rounded bg-muted/50">
                      <span className="font-medium">{t.title}</span>
                      <Badge variant="secondary">{t.count}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Tempo médio de jornada</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data.avgTenureDays === null ? 'Não configurado' : `${data.avgTenureDays.toFixed(0)} dias`}
              </div>
              <p className="text-xs text-muted-foreground">média desde profiles.created_at</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
