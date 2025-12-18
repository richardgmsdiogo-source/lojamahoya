import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrencyBRL } from "@/lib/format";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, DollarSign, Package, Wallet, Receipt } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

type Period = "current" | "last" | "last3" | "last6" | "year";

const getPeriodDates = (period: Period) => {
  const now = new Date();
  let start: Date;
  let end = endOfMonth(now);

  switch (period) {
    case "current":
      start = startOfMonth(now);
      break;
    case "last":
      start = startOfMonth(subMonths(now, 1));
      end = endOfMonth(subMonths(now, 1));
      break;
    case "last3":
      start = startOfMonth(subMonths(now, 2));
      break;
    case "last6":
      start = startOfMonth(subMonths(now, 5));
      break;
    case "year":
      start = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      start = startOfMonth(now);
  }

  return { start, end };
};

export function AdminFinanceiroTab() {
  const [period, setPeriod] = useState<Period>("current");
  const { start, end } = getPeriodDates(period);

  // Fetch orders for revenue
  const { data: orders = [] } = useQuery({
    queryKey: ["finance-orders", period],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString())
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Fetch raw material movements for costs
  const { data: movements = [] } = useQuery({
    queryKey: ["finance-movements", period],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("raw_material_movements")
        .select("*, raw_materials(name)")
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString())
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Fetch production batches for production costs
  const { data: batches = [] } = useQuery({
    queryKey: ["finance-batches", period],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("production_batches")
        .select("*, products(name)")
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString())
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Fetch expenses for operational costs
  const { data: expenses = [] } = useQuery({
    queryKey: ["finance-expenses", period],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .gte("expense_date", format(start, "yyyy-MM-dd"))
        .lte("expense_date", format(end, "yyyy-MM-dd"))
        .order("expense_date", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Calculate totals
  const totalRevenue = orders
    .filter((o) => o.payment_status === "pago")
    .reduce((sum, o) => sum + Number(o.total), 0);

  const pendingRevenue = orders
    .filter((o) => o.payment_status === "aguardando")
    .reduce((sum, o) => sum + Number(o.total), 0);

  const materialCosts = movements
    .filter((m) => m.movement_type === "entrada")
    .reduce((sum, m) => sum + Number(m.quantity) * Number(m.cost_per_unit_at_time), 0);

  const productionCosts = batches
    .filter((b) => b.status !== "estornado")
    .reduce((sum, b) => sum + Number(b.total_cost), 0);

  const operationalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  const grossProfit = totalRevenue - productionCosts;
  const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

  const netProfit = grossProfit - operationalExpenses;
  const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Financeiro</h2>
        <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="current">Mês Atual</SelectItem>
            <SelectItem value="last">Mês Anterior</SelectItem>
            <SelectItem value="last3">Últimos 3 Meses</SelectItem>
            <SelectItem value="last6">Últimos 6 Meses</SelectItem>
            <SelectItem value="year">Este Ano</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="fluxo" className="space-y-4">
        <TabsList>
          <TabsTrigger value="fluxo">Fluxo de Caixa</TabsTrigger>
          <TabsTrigger value="dre">DRE</TabsTrigger>
        </TabsList>

        <TabsContent value="fluxo" className="space-y-4">
          <CashFlowView
            orders={orders}
            movements={movements}
            expenses={expenses}
            totalRevenue={totalRevenue}
            pendingRevenue={pendingRevenue}
            materialCosts={materialCosts}
            operationalExpenses={operationalExpenses}
          />
        </TabsContent>

        <TabsContent value="dre" className="space-y-4">
          <DREView
            totalRevenue={totalRevenue}
            productionCosts={productionCosts}
            grossProfit={grossProfit}
            grossMargin={grossMargin}
            operationalExpenses={operationalExpenses}
            netProfit={netProfit}
            netMargin={netMargin}
            batches={batches}
            expenses={expenses}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CashFlowView({
  orders,
  movements,
  expenses,
  totalRevenue,
  pendingRevenue,
  materialCosts,
  operationalExpenses,
}: {
  orders: any[];
  movements: any[];
  expenses: any[];
  totalRevenue: number;
  pendingRevenue: number;
  materialCosts: number;
  operationalExpenses: number;
}) {
  const totalOutflows = materialCosts + operationalExpenses;
  const netCashFlow = totalRevenue - totalOutflows;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Entradas</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrencyBRL(totalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground">Pedidos pagos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">A Receber</CardTitle>
            <Wallet className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {formatCurrencyBRL(pendingRevenue)}
            </div>
            <p className="text-xs text-muted-foreground">Aguardando pagamento</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Materiais</CardTitle>
            <Package className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrencyBRL(materialCosts)}
            </div>
            <p className="text-xs text-muted-foreground">Compra de materiais</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Despesas</CardTitle>
            <Receipt className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrencyBRL(operationalExpenses)}
            </div>
            <p className="text-xs text-muted-foreground">Operacionais</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Saldo</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netCashFlow >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatCurrencyBRL(netCashFlow)}
            </div>
            <p className="text-xs text-muted-foreground">Fluxo líquido</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              Entradas Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {orders
                .filter((o) => o.payment_status === "pago")
                .slice(0, 10)
                .map((order) => (
                  <div key={order.id} className="flex items-center justify-between border-b pb-2">
                    <div>
                      <p className="font-medium">Pedido #{order.order_number}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(order.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>
                    <span className="font-medium text-green-600">
                      +{formatCurrencyBRL(order.total)}
                    </span>
                  </div>
                ))}
              {orders.filter((o) => o.payment_status === "pago").length === 0 && (
                <p className="text-muted-foreground text-sm">Nenhuma entrada no período</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-4 w-4 text-red-600" />
              Compras de Materiais
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {movements
                .filter((m) => m.movement_type === "entrada")
                .slice(0, 10)
                .map((mov) => (
                  <div key={mov.id} className="flex items-center justify-between border-b pb-2">
                    <div>
                      <p className="font-medium">{mov.raw_materials?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(mov.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>
                    <span className="font-medium text-red-600">
                      -{formatCurrencyBRL(mov.quantity * mov.cost_per_unit_at_time)}
                    </span>
                  </div>
                ))}
              {movements.filter((m) => m.movement_type === "entrada").length === 0 && (
                <p className="text-muted-foreground text-sm">Nenhuma compra no período</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Receipt className="h-4 w-4 text-red-600" />
              Despesas Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {expenses
                .slice(0, 10)
                .map((expense) => (
                  <div key={expense.id} className="flex items-center justify-between border-b pb-2">
                    <div>
                      <p className="font-medium">{expense.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(expense.expense_date), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>
                    <span className="font-medium text-red-600">
                      -{formatCurrencyBRL(expense.amount)}
                    </span>
                  </div>
                ))}
              {expenses.length === 0 && (
                <p className="text-muted-foreground text-sm">Nenhuma despesa no período</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

const EXPENSE_CATEGORIES: Record<string, string> = {
  aluguel: "Aluguel",
  energia: "Energia",
  agua: "Água",
  internet: "Internet/Telefone",
  marketing: "Marketing",
  transporte: "Transporte/Frete",
  manutencao: "Manutenção",
  impostos: "Impostos/Taxas",
  salarios: "Salários",
  software: "Software/Assinaturas",
  outros: "Outros",
};

function DREView({
  totalRevenue,
  productionCosts,
  grossProfit,
  grossMargin,
  operationalExpenses,
  netProfit,
  netMargin,
  batches,
  expenses,
}: {
  totalRevenue: number;
  productionCosts: number;
  grossProfit: number;
  grossMargin: number;
  operationalExpenses: number;
  netProfit: number;
  netMargin: number;
  batches: any[];
  expenses: any[];
}) {
  // Group expenses by category
  const expensesByCategory = expenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + Number(e.amount);
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* DRE Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Demonstração do Resultado</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b">
              <span className="font-medium">Receita Bruta</span>
              <span className="text-lg font-bold">{formatCurrencyBRL(totalRevenue)}</span>
            </div>

            <div className="flex justify-between items-center py-3 border-b text-red-600">
              <span className="font-medium">(-) Custo dos Produtos Vendidos (CPV)</span>
              <span className="text-lg font-bold">{formatCurrencyBRL(productionCosts)}</span>
            </div>

            <div className="flex justify-between items-center py-3 border-b bg-muted/50 px-2 rounded">
              <span className="font-bold">Lucro Bruto</span>
              <div className="text-right">
                <span className={`text-lg font-bold ${grossProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatCurrencyBRL(grossProfit)}
                </span>
                <p className="text-xs text-muted-foreground">
                  Margem: {grossMargin.toFixed(1)}%
                </p>
              </div>
            </div>

            <div className="flex justify-between items-center py-3 border-b text-red-600">
              <span className="font-medium">(-) Despesas Operacionais</span>
              <span className="text-lg font-bold">{formatCurrencyBRL(operationalExpenses)}</span>
            </div>

            <div className="flex justify-between items-center py-3 border-b-2 border-primary bg-primary/5 px-2 rounded">
              <span className="font-bold text-lg">Lucro Líquido</span>
              <div className="text-right">
                <span className={`text-xl font-bold ${netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatCurrencyBRL(netProfit)}
                </span>
                <p className="text-sm text-muted-foreground">
                  Margem Líquida: {netMargin.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Operational Expenses Breakdown */}
      {Object.keys(expensesByCategory).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Despesas Operacionais por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(expensesByCategory)
                .sort((a, b) => (b[1] as number) - (a[1] as number))
                .map(([category, value]) => (
                  <div key={category} className="flex justify-between items-center p-2 bg-muted/50 rounded">
                    <span className="text-sm">{EXPENSE_CATEGORIES[category] || category}</span>
                    <span className="font-medium text-red-600">-{formatCurrencyBRL(value as number)}</span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Production Costs Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Custos de Produção por Produto
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {batches
              .filter((b) => b.status !== "estornado")
              .map((batch) => (
                <div key={batch.id} className="flex items-center justify-between border-b pb-2">
                  <div>
                    <p className="font-medium">{batch.products?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {batch.quantity_produced} un × {formatCurrencyBRL(batch.unit_cost)}/un
                    </p>
                  </div>
                  <span className="font-medium">{formatCurrencyBRL(batch.total_cost)}</span>
                </div>
              ))}
            {batches.filter((b) => b.status !== "estornado").length === 0 && (
              <p className="text-muted-foreground text-sm">Nenhuma produção no período</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Margin Indicator */}
      <Card>
        <CardHeader>
          <CardTitle>Indicador de Margem Líquida</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>0%</span>
              <span>25%</span>
              <span>50%</span>
            </div>
            <div className="h-4 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  netMargin >= 25 ? "bg-green-500" : netMargin >= 10 ? "bg-yellow-500" : "bg-red-500"
                }`}
                style={{ width: `${Math.min(100, Math.max(0, netMargin * 2))}%` }}
              />
            </div>
            <p className="text-center text-sm text-muted-foreground">
              {netMargin >= 25
                ? "Margem líquida saudável"
                : netMargin >= 10
                ? "Margem líquida moderada"
                : "Margem líquida baixa - revisar custos"}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
