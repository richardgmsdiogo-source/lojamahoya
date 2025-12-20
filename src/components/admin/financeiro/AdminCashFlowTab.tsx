import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrencyBRL } from "@/lib/format";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, DollarSign, Wallet, Receipt, Factory, ArrowDownCircle, ArrowUpCircle } from "lucide-react";

import { format, startOfMonth, endOfMonth, subMonths, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

type Period = "current" | "last" | "last3" | "last6" | "year";

const safeNum = (v: any) => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "0").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

const safeDate = (iso: any) => {
  try {
    if (!iso) return null;
    return parseISO(String(iso));
  } catch {
    return null;
  }
};

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

export function AdminCashFlowTab() {
  const [period, setPeriod] = useState<Period>("current");
  const { start, end } = getPeriodDates(period);

  // toggles: usar legado como complemento (sem duplicar)
  const [includeLegacyOrders, setIncludeLegacyOrders] = useState(true);
  const [includeLegacyExpenses, setIncludeLegacyExpenses] = useState(true);
  const [includeLegacyMaterialPurchases, setIncludeLegacyMaterialPurchases] = useState(true);

  const startISO = start.toISOString();
  const endISO = end.toISOString();
  const startDate = format(start, "yyyy-MM-dd");
  const endDate = format(end, "yyyy-MM-dd");

  // ===========================
  // AR: Recebimentos (Caixa)
  // ===========================
  const { data: arPayments = [] } = useQuery({
    queryKey: ["cashflow-ar-payments", period],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ar_payments")
        .select(
          `
          id,
          amount,
          received_at,
          reference,
          installment_id,
          ar_payment_methods(name),
          ar_installments(
            id,
            installment_no,
            due_date,
            invoice_id,
            ar_invoices(
              id,
              description,
              order_id,
              customer_id,
              ar_customers(name)
            )
          )
        `
        )
        .gte("received_at", startISO)
        .lte("received_at", endISO)
        .order("received_at", { ascending: false });

      // se ainda não existir, não quebra sua tela:
      if (error) return [];
      return data ?? [];
    },
  });

  // AR: Parcelas (Previsto / A receber no período)
  const { data: arInstallmentsView = [] } = useQuery({
    queryKey: ["cashflow-ar-installments", period],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ar_installments_view")
        .select(
          `
          id,
          invoice_id,
          installment_no,
          due_date,
          amount,
          status,
          received_amount,
          open_amount
        `
        )
        .gte("due_date", startDate)
        .lte("due_date", endDate)
        .order("due_date", { ascending: true });

      if (error) return [];
      return data ?? [];
    },
  });

  // ===========================
  // AP: Pagamentos (Caixa)
  // ===========================
  const { data: apPayments = [] } = useQuery({
    queryKey: ["cashflow-ap-payments", period],
    queryFn: async () => {
      // AP: ajuste aqui se seu schema tiver nomes diferentes
      const { data, error } = await supabase
        .from("ap_payments") // AP:
        .select(
          `
          id,
          amount,
          paid_at,
          reference,
          installment_id,
          ap_payment_methods(name),
          ap_installments(
            id,
            installment_no,
            due_date,
            bill_id,
            ap_bills(
              id,
              description,
              supplier_id,
              ap_suppliers(name)
            )
          )
        `
        )
        .gte("paid_at", startISO) // AP: paid_at
        .lte("paid_at", endISO)
        .order("paid_at", { ascending: false });

      if (error) return [];
      return data ?? [];
    },
  });

  // AP: Parcelas (Previsto / A pagar no período)
  const { data: apInstallmentsView = [] } = useQuery({
    queryKey: ["cashflow-ap-installments", period],
    queryFn: async () => {
      // AP: se você ainda não criou a view do AP, crie (igual AR) ou mude pra ap_installments + join payments
      const { data, error } = await supabase
        .from("ap_installments_view") // AP:
        .select(
          `
          id,
          bill_id,
          installment_no,
          due_date,
          amount,
          status,
          paid_amount,
          open_amount
        `
        )
        .gte("due_date", startDate)
        .lte("due_date", endDate)
        .order("due_date", { ascending: true });

      if (error) return [];
      return data ?? [];
    },
  });

  // ===========================
  // LEGADO (opcional / complemento)
  // ===========================

  // Orders (legado): cuidado para não duplicar se já existir AR invoice ligado ao order_id
  const { data: orders = [] } = useQuery({
    queryKey: ["cashflow-orders-legacy", period],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_number, total, created_at, payment_status")
        .gte("created_at", startISO)
        .lte("created_at", endISO)
        .order("created_at", { ascending: false });

      if (error) return [];
      return data ?? [];
    },
    enabled: includeLegacyOrders,
  });

  // Expenses (legado)
  const { data: expenses = [] } = useQuery({
    queryKey: ["cashflow-expenses-legacy", period],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("id, description, amount, expense_date")
        .gte("expense_date", startDate)
        .lte("expense_date", endDate)
        .order("expense_date", { ascending: false });

      if (error) return [];
      return data ?? [];
    },
    enabled: includeLegacyExpenses,
  });

  // Movimentos de insumo (legado) — compras “entrada” como saída de caixa (se ainda usa isso)
  const { data: movements = [] } = useQuery({
    queryKey: ["cashflow-movements-legacy", period],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("raw_material_movements")
        .select("id, created_at, movement_type, quantity, total_cost, cost_per_unit_at_time, raw_materials(name)")
        .gte("created_at", startISO)
        .lte("created_at", endISO)
        .order("created_at", { ascending: false });

      if (error) return [];
      return data ?? [];
    },
    enabled: includeLegacyMaterialPurchases,
  });

  // Produção (CPV custo médio) - informativo, NÃO é caixa
  const { data: batches = [] } = useQuery({
    queryKey: ["cashflow-batches", period],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("production_batches")
        .select("id, created_at, quantity_produced, total_cost, unit_cost, status, status_new, products(name)")
        .gte("created_at", startISO)
        .lte("created_at", endISO)
        .order("created_at", { ascending: false });

      if (error) return [];
      return data ?? [];
    },
  });

  // ===========================
  // CÁLCULOS
  // ===========================
  const summary = useMemo(() => {
    // AR caixa
    const receivedCash = arPayments.reduce((s: number, p: any) => s + safeNum(p.amount), 0);

    // AR previsto (somente saldo em aberto no período)
    const arDueOpen = arInstallmentsView
      .filter((i: any) => String(i.status ?? "").toLowerCase() !== "cancelado")
      .reduce((s: number, i: any) => s + safeNum(i.open_amount), 0);

    // AP caixa
    const paidCash = apPayments.reduce((s: number, p: any) => s + safeNum(p.amount), 0);

    // AP previsto
    const apDueOpen = apInstallmentsView
      .filter((i: any) => String(i.status ?? "").toLowerCase() !== "cancelado")
      .reduce((s: number, i: any) => s + safeNum(i.open_amount), 0);

    // LEGADO (sem duplicar orders com AR)
    const linkedOrderIds = new Set<string>();
    for (const pay of arPayments) {
      const orderId = pay?.ar_installments?.ar_invoices?.order_id;
      if (orderId) linkedOrderIds.add(String(orderId));
    }

    const legacyOrdersPaid = includeLegacyOrders
      ? orders
          .filter((o: any) => String(o.payment_status).toLowerCase() === "pago")
          .filter((o: any) => !linkedOrderIds.has(String(o.id))) // evita duplicar
          .reduce((s: number, o: any) => s + safeNum(o.total), 0)
      : 0;

    const legacyOrdersPending = includeLegacyOrders
      ? orders
          .filter((o: any) => String(o.payment_status).toLowerCase() === "aguardando")
          .filter((o: any) => !linkedOrderIds.has(String(o.id)))
          .reduce((s: number, o: any) => s + safeNum(o.total), 0)
      : 0;

    const legacyExpenses = includeLegacyExpenses ? expenses.reduce((s: number, e: any) => s + safeNum(e.amount), 0) : 0;

    const legacyMaterialPurchases = includeLegacyMaterialPurchases
      ? movements
          .filter((m: any) => String(m.movement_type).toLowerCase() === "entrada")
          .reduce((s: number, m: any) => {
            const totalCost = m.total_cost != null ? safeNum(m.total_cost) : safeNum(m.quantity) * safeNum(m.cost_per_unit_at_time);
            return s + totalCost;
          }, 0)
      : 0;

    // CPV (informativo)
    const cpvAvgCost = batches
      .filter((b: any) => {
        const s = String(b.status ?? "").toLowerCase();
        const sn = String(b.status_new ?? "").toLowerCase();
        return s !== "estornado" && sn !== "estornado";
      })
      .reduce((s: number, b: any) => s + safeNum(b.total_cost), 0);

    // Caixa “real”
    const inflowsCash = receivedCash + legacyOrdersPaid;
    const outflowsCash = paidCash + legacyExpenses + legacyMaterialPurchases;
    const netCashFlow = inflowsCash - outflowsCash;

    return {
      receivedCash,
      arDueOpen,

      paidCash,
      apDueOpen,

      legacyOrdersPaid,
      legacyOrdersPending,
      legacyExpenses,
      legacyMaterialPurchases,

      inflowsCash,
      outflowsCash,
      netCashFlow,

      cpvAvgCost,
    };
  }, [
    arPayments,
    arInstallmentsView,
    apPayments,
    apInstallmentsView,
    includeLegacyOrders,
    includeLegacyExpenses,
    includeLegacyMaterialPurchases,
    orders,
    expenses,
    movements,
    batches,
  ]);

  // ===========================
  // UI
  // ===========================
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Fluxo de Caixa</h2>
          <p className="text-sm text-muted-foreground">
            Base principal: <strong>Contas a Receber/Pagar</strong>. Produção (CPV) é informativo (não-caixa).
          </p>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
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

          {/* toggles simples (sem componente extra) */}
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={includeLegacyOrders ? "default" : "outline"}
              className="cursor-pointer select-none"
              onClick={() => setIncludeLegacyOrders((v) => !v)}
              title="Inclui pedidos pagos/aguardando como legado (sem duplicar se já houver AR vinculado)"
            >
              Pedidos (legado): {includeLegacyOrders ? "ON" : "OFF"}
            </Badge>

            <Badge
              variant={includeLegacyExpenses ? "default" : "outline"}
              className="cursor-pointer select-none"
              onClick={() => setIncludeLegacyExpenses((v) => !v)}
              title="Inclui expenses como saída (legado)"
            >
              Despesas (legado): {includeLegacyExpenses ? "ON" : "OFF"}
            </Badge>

            <Badge
              variant={includeLegacyMaterialPurchases ? "default" : "outline"}
              className="cursor-pointer select-none"
              onClick={() => setIncludeLegacyMaterialPurchases((v) => !v)}
              title="Inclui compras via raw_material_movements (legado)"
            >
              Compras (legado): {includeLegacyMaterialPurchases ? "ON" : "OFF"}
            </Badge>
          </div>
        </div>
      </div>

      {/* Cards (Caixa + Previsto) */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Entradas (Caixa)</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrencyBRL(summary.inflowsCash)}</div>
            <p className="text-xs text-muted-foreground">
              AR recebido {formatCurrencyBRL(summary.receivedCash)}
              {includeLegacyOrders ? ` + pedidos legado ${formatCurrencyBRL(summary.legacyOrdersPaid)}` : ""}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">A Receber (Previsto)</CardTitle>
            <Wallet className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{formatCurrencyBRL(summary.arDueOpen)}</div>
            <p className="text-xs text-muted-foreground">Saldo das parcelas no período</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Saídas (Caixa)</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrencyBRL(summary.outflowsCash)}</div>
            <p className="text-xs text-muted-foreground">
              AP pago {formatCurrencyBRL(summary.paidCash)}
              {includeLegacyExpenses ? ` + despesas ${formatCurrencyBRL(summary.legacyExpenses)}` : ""}
              {includeLegacyMaterialPurchases ? ` + compras ${formatCurrencyBRL(summary.legacyMaterialPurchases)}` : ""}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">A Pagar (Previsto)</CardTitle>
            <Receipt className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{formatCurrencyBRL(summary.apDueOpen)}</div>
            <p className="text-xs text-muted-foreground">Saldo das parcelas no período</p>
          </CardContent>
        </Card>

        {/* Informativo: CPV */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">CPV (custo médio)</CardTitle>
            <Factory className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrencyBRL(summary.cpvAvgCost)}</div>
            <p className="text-xs text-muted-foreground">Informativo (DRE)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Saldo (Caixa)</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${summary.netCashFlow >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatCurrencyBRL(summary.netCashFlow)}
            </div>
            <p className="text-xs text-muted-foreground">Entradas - Saídas</p>
          </CardContent>
        </Card>
      </div>

      {/* Listas */}
      <div className="grid gap-4 md:grid-cols-4">
        {/* Recebimentos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ArrowUpCircle className="h-4 w-4 text-green-600" />
              Recebimentos (AR)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {arPayments.slice(0, 10).map((p: any) => {
                const d = safeDate(p.received_at);
                const cust = p?.ar_installments?.ar_invoices?.ar_customers?.name ?? "Cliente";
                const desc = p?.ar_installments?.ar_invoices?.description ?? "Recebimento";
                const method = p?.ar_payment_methods?.name ? ` • ${p.ar_payment_methods.name}` : "";
                return (
                  <div key={p.id} className="flex items-center justify-between border-b pb-2">
                    <div>
                      <p className="font-medium">{cust}</p>
                      <p className="text-xs text-muted-foreground">
                        {desc}
                        {method}
                        {" • "}
                        {d ? format(d, "dd/MM/yyyy", { locale: ptBR }) : "--"}
                      </p>
                    </div>
                    <span className="font-medium text-green-600">+{formatCurrencyBRL(p.amount)}</span>
                  </div>
                );
              })}
              {arPayments.length === 0 && <p className="text-muted-foreground text-sm">Nenhum recebimento no período</p>}
            </div>
          </CardContent>
        </Card>

        {/* Pagamentos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ArrowDownCircle className="h-4 w-4 text-red-600" />
              Pagamentos (AP)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {apPayments.slice(0, 10).map((p: any) => {
                const d = safeDate(p.paid_at); // AP: paid_at
                const supp = p?.ap_installments?.ap_bills?.ap_suppliers?.name ?? "Fornecedor";
                const desc = p?.ap_installments?.ap_bills?.description ?? "Pagamento";
                const method = p?.ap_payment_methods?.name ? ` • ${p.ap_payment_methods.name}` : "";
                return (
                  <div key={p.id} className="flex items-center justify-between border-b pb-2">
                    <div>
                      <p className="font-medium">{supp}</p>
                      <p className="text-xs text-muted-foreground">
                        {desc}
                        {method}
                        {" • "}
                        {d ? format(d, "dd/MM/yyyy", { locale: ptBR }) : "--"}
                      </p>
                    </div>
                    <span className="font-medium text-red-600">-{formatCurrencyBRL(p.amount)}</span>
                  </div>
                );
              })}
              {apPayments.length === 0 && <p className="text-muted-foreground text-sm">Nenhum pagamento no período</p>}
            </div>
          </CardContent>
        </Card>

        {/* A receber previsto */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Wallet className="h-4 w-4 text-yellow-600" />
              Previsto (A Receber)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {arInstallmentsView
                .filter((i: any) => String(i.status ?? "").toLowerCase() !== "cancelado")
                .filter((i: any) => safeNum(i.open_amount) > 0)
                .slice(0, 10)
                .map((i: any) => {
                  const d = safeDate(i.due_date);
                  return (
                    <div key={i.id} className="flex items-center justify-between border-b pb-2">
                      <div>
                        <p className="font-medium">Parcela {i.installment_no}</p>
                        <p className="text-xs text-muted-foreground">
                          Venc: {d ? format(d, "dd/MM/yyyy", { locale: ptBR }) : "--"}
                        </p>
                      </div>
                      <span className="font-medium text-yellow-700">{formatCurrencyBRL(i.open_amount)}</span>
                    </div>
                  );
                })}
              {arInstallmentsView.filter((i: any) => String(i.status ?? "").toLowerCase() !== "cancelado" && safeNum(i.open_amount) > 0).length === 0 && (
                <p className="text-muted-foreground text-sm">Nada a receber no período</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* A pagar previsto */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Receipt className="h-4 w-4 text-yellow-600" />
              Previsto (A Pagar)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {apInstallmentsView
                .filter((i: any) => String(i.status ?? "").toLowerCase() !== "cancelado")
                .filter((i: any) => safeNum(i.open_amount) > 0)
                .slice(0, 10)
                .map((i: any) => {
                  const d = safeDate(i.due_date);
                  return (
                    <div key={i.id} className="flex items-center justify-between border-b pb-2">
                      <div>
                        <p className="font-medium">Parcela {i.installment_no}</p>
                        <p className="text-xs text-muted-foreground">
                          Venc: {d ? format(d, "dd/MM/yyyy", { locale: ptBR }) : "--"}
                        </p>
                      </div>
                      <span className="font-medium text-yellow-700">{formatCurrencyBRL(i.open_amount)}</span>
                    </div>
                  );
                })}
              {apInstallmentsView.filter((i: any) => String(i.status ?? "").toLowerCase() !== "cancelado" && safeNum(i.open_amount) > 0).length === 0 && (
                <p className="text-muted-foreground text-sm">Nada a pagar no período</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="text-xs text-muted-foreground">
        Obs.: Para ficar “contábil perfeito”, o ideal é: <strong>compras de insumo</strong> e <strong>despesas</strong> gerarem títulos no AP automaticamente.
        Por enquanto, os toggles permitem usar o legado como complemento sem quebrar seu fluxo.
      </div>
    </div>
  );
}
