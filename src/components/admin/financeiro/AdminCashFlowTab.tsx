import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrencyBRL } from "@/lib/format";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wallet,
  Receipt,
  Factory,
  ArrowDownCircle,
  ArrowUpCircle,
} from "lucide-react";

import {
  format,
  startOfMonth,
  endOfMonth,
  endOfDay,
  subMonths,
  parseISO,
  startOfDay,
} from "date-fns";
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

const isCanceled = (status: any) => String(status ?? "").toLowerCase().trim() === "cancelado";

const getPeriodDates = (period: Period) => {
  const now = new Date();
  let start: Date;
  let end = endOfMonth(now);

  switch (period) {
    case "current":
      start = startOfMonth(now);
      end = endOfMonth(now);
      break;
    case "last":
      start = startOfMonth(subMonths(now, 1));
      end = endOfMonth(subMonths(now, 1));
      break;
    case "last3":
      start = startOfMonth(subMonths(now, 2));
      end = endOfMonth(now);
      break;
    case "last6":
      start = startOfMonth(subMonths(now, 5));
      end = endOfMonth(now);
      break;
    case "year":
      start = new Date(now.getFullYear(), 0, 1);
      end = endOfMonth(now);
      break;
    default:
      start = startOfMonth(now);
      end = endOfMonth(now);
  }

  return { start, end };
};

// ===== Tipos (bem práticos) =====
type ARPaymentRow = {
  id: string;
  amount: number;
  received_at: string;
  reference: string | null;
  installment_id: string;
  ar_payment_methods?: { name: string } | null;
  ar_installments?: {
    id: string;
    installment_no: number;
    due_date: string;
    invoice_id: string;
    ar_invoices?: {
      id: string;
      description: string;
      order_id: string | null;
      customer_id: string;
      ar_customers?: { name: string } | null;
    } | null;
  } | null;
};

type ARInstallmentViewRow = {
  id: string;
  invoice_id: string;
  installment_no: number;
  due_date: string;
  amount: number;
  status: string | null;
  paid_amount: number;
  open_amount: number;
};

type APPaymentRow = {
  id: string;
  amount: number;
  paid_at: string;
  reference: string | null;
  installment_id: string;
  ap_payment_methods?: { name: string } | null;
  ap_installments?: {
    id: string;
    installment_no: number;
    due_date: string;
    bill_id: string;
    ap_bills?: {
      id: string;
      description: string;
      vendor_id: string;
      ap_vendors?: { name: string } | null;
    } | null;
  } | null;
};

type APInstallmentViewRow = {
  id: string;
  bill_id: string;
  installment_no: number;
  due_date: string;
  amount: number;
  status: string | null;
  paid_amount: number;
  open_amount: number;
};

export function AdminCashFlowTab() {
  const [period, setPeriod] = useState<Period>("current");
  const { start, end } = getPeriodDates(period);

  // toggles legado (complemento)
  const [includeLegacyOrders, setIncludeLegacyOrders] = useState(true);
  const [includeLegacyExpenses, setIncludeLegacyExpenses] = useState(true);
  const [includeLegacyMaterialPurchases, setIncludeLegacyMaterialPurchases] = useState(true);

  // cuidado com corte no fim do mês: usa endOfDay
  const startISO = startOfDay(start).toISOString();
  const endISO = endOfDay(end).toISOString();

  // para colunas DATE (due_date etc)
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

      if (error) {
        console.error("cashflow-ar-payments", error);
        return [] as ARPaymentRow[];
      }
      return (data ?? []) as ARPaymentRow[];
    },
  });

  // ===========================
  // AR: Previsto (parcelas no período)
  // ===========================
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
          paid_amount,
          open_amount
        `
        )
        .gte("due_date", startDate)
        .lte("due_date", endDate)
        .order("due_date", { ascending: true });

      if (error) {
        console.error("cashflow-ar-installments", error);
        return [] as ARInstallmentViewRow[];
      }
      return (data ?? []) as ARInstallmentViewRow[];
    },
  });

  // ===========================
  // AP: Pagamentos (Caixa)
  // ===========================
  const { data: apPayments = [] } = useQuery({
    queryKey: ["cashflow-ap-payments", period],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ap_payments")
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
              vendor_id,
              ap_vendors(name)
            )
          )
        `
        )
        .gte("paid_at", startISO)
        .lte("paid_at", endISO)
        .order("paid_at", { ascending: false });

      if (error) {
        console.error("cashflow-ap-payments", error);
        return [] as APPaymentRow[];
      }
      return (data ?? []) as APPaymentRow[];
    },
  });

  // ===========================
  // AP: Previsto (parcelas no período)
  // ===========================
  const { data: apInstallmentsView = [] } = useQuery({
    queryKey: ["cashflow-ap-installments", period],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ap_installments_view")
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

      if (error) {
        console.error("cashflow-ap-installments", error);
        return [] as APInstallmentViewRow[];
      }
      return (data ?? []) as APInstallmentViewRow[];
    },
  });

  // ===========================
  // LEGADO (opcional)
  // ===========================
  const { data: orders = [] } = useQuery({
    queryKey: ["cashflow-orders-legacy", period],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_number, total, created_at, payment_status")
        .gte("created_at", startISO)
        .lte("created_at", endISO)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("cashflow-orders-legacy", error);
        return [];
      }
      return data ?? [];
    },
    enabled: includeLegacyOrders,
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ["cashflow-expenses-legacy", period],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("id, description, amount, expense_date")
        .gte("expense_date", startDate)
        .lte("expense_date", endDate)
        .order("expense_date", { ascending: false });

      if (error) {
        console.error("cashflow-expenses-legacy", error);
        return [];
      }
      return data ?? [];
    },
    enabled: includeLegacyExpenses,
  });

  const { data: movements = [] } = useQuery({
    queryKey: ["cashflow-movements-legacy", period],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("raw_material_movements")
        .select("id, created_at, movement_type, quantity, total_cost, cost_per_unit_at_time, raw_materials(name)")
        .gte("created_at", startISO)
        .lte("created_at", endISO)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("cashflow-movements-legacy", error);
        return [];
      }
      return data ?? [];
    },
    enabled: includeLegacyMaterialPurchases,
  });

  const { data: batches = [] } = useQuery({
    queryKey: ["cashflow-batches", period],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("production_batches")
        .select("id, created_at, quantity_produced, total_cost, unit_cost, status, status_new, products(name)")
        .gte("created_at", startISO)
        .lte("created_at", endISO)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("cashflow-batches", error);
        return [];
      }
      return data ?? [];
    },
  });

  // ===========================
  // CÁLCULOS
  // ===========================
  const summary = useMemo(() => {
    // AR caixa
    const receivedCash = (arPayments as ARPaymentRow[]).reduce((s, p) => s + safeNum(p.amount), 0);

    // AR previsto: saldo aberto no período
    const arDueOpen = (arInstallmentsView as ARInstallmentViewRow[])
      .filter((i) => !isCanceled(i.status))
      .reduce((s, i) => s + safeNum(i.open_amount), 0);

    // AP caixa
    const paidCash = (apPayments as APPaymentRow[]).reduce((s, p) => s + safeNum(p.amount), 0);

    // AP previsto
    const apDueOpen = (apInstallmentsView as APInstallmentViewRow[])
      .filter((i) => !isCanceled(i.status))
      .reduce((s, i) => s + safeNum(i.open_amount), 0);

    // LEGADO (evitar duplicar orders que já viraram AR via order_id)
    const linkedOrderIds = new Set<string>();
    for (const pay of arPayments as ARPaymentRow[]) {
      const orderId = pay?.ar_installments?.ar_invoices?.order_id;
      if (orderId) linkedOrderIds.add(String(orderId));
    }

    const legacyOrdersPaid = includeLegacyOrders
      ? (orders as any[])
          .filter((o) => String(o.payment_status ?? "").toLowerCase() === "pago")
          .filter((o) => !linkedOrderIds.has(String(o.id)))
          .reduce((s, o) => s + safeNum(o.total), 0)
      : 0;

    const legacyOrdersPending = includeLegacyOrders
      ? (orders as any[])
          .filter((o) => String(o.payment_status ?? "").toLowerCase() === "aguardando")
          .filter((o) => !linkedOrderIds.has(String(o.id)))
          .reduce((s, o) => s + safeNum(o.total), 0)
      : 0;

    const legacyExpenses = includeLegacyExpenses
      ? (expenses as any[]).reduce((s, e) => s + safeNum(e.amount), 0)
      : 0;

    const legacyMaterialPurchases = includeLegacyMaterialPurchases
      ? (movements as any[])
          .filter((m) => String(m.movement_type ?? "").toLowerCase() === "entrada")
          .reduce((s, m) => {
            const totalCost =
              m.total_cost != null
                ? safeNum(m.total_cost)
                : safeNum(m.quantity) * safeNum(m.cost_per_unit_at_time);
            return s + totalCost;
          }, 0)
      : 0;

    // CPV (informativo)
    const cpvTotal = (batches as any[])
      .filter((b) => {
        const s = String(b.status ?? "").toLowerCase();
        const sn = String(b.status_new ?? "").toLowerCase();
        return s !== "estornado" && sn !== "estornado";
      })
      .reduce((s, b) => s + safeNum(b.total_cost), 0);

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

      cpvTotal,
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

      {/* Cards */}
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
            <p className="text-xs text-muted-foreground">Saldo das parcelas com vencimento no período</p>
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
            <p className="text-xs text-muted-foreground">Saldo das parcelas com vencimento no período</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">CPV (informativo)</CardTitle>
            <Factory className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrencyBRL(summary.cpvTotal)}</div>
            <p className="text-xs text-muted-foreground">Não impacta caixa (DRE)</p>
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
        {/* Recebimentos (AR) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ArrowUpCircle className="h-4 w-4 text-green-600" />
              Recebimentos (AR)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {(arPayments as ARPaymentRow[]).slice(0, 10).map((p) => {
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
              {(arPayments as ARPaymentRow[]).length === 0 && (
                <p className="text-muted-foreground text-sm">Nenhum recebimento no período</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pagamentos (AP) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ArrowDownCircle className="h-4 w-4 text-red-600" />
              Pagamentos (AP)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {(apPayments as APPaymentRow[]).slice(0, 10).map((p) => {
                const d = safeDate(p.paid_at);
                const vendor = p?.ap_installments?.ap_bills?.ap_vendors?.name ?? "Fornecedor";
                const desc = p?.ap_installments?.ap_bills?.description ?? "Pagamento";
                const method = p?.ap_payment_methods?.name ? ` • ${p.ap_payment_methods.name}` : "";
                return (
                  <div key={p.id} className="flex items-center justify-between border-b pb-2">
                    <div>
                      <p className="font-medium">{vendor}</p>
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
              {(apPayments as APPaymentRow[]).length === 0 && (
                <p className="text-muted-foreground text-sm">Nenhum pagamento no período</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Previsto (A Receber) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Wallet className="h-4 w-4 text-yellow-600" />
              Previsto (A Receber)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {(arInstallmentsView as ARInstallmentViewRow[])
                .filter((i) => !isCanceled(i.status))
                .filter((i) => safeNum(i.open_amount) > 0)
                .slice(0, 10)
                .map((i) => {
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

              {(arInstallmentsView as ARInstallmentViewRow[]).filter((i) => !isCanceled(i.status) && safeNum(i.open_amount) > 0)
                .length === 0 && <p className="text-muted-foreground text-sm">Nada a receber no período</p>}
            </div>
          </CardContent>
        </Card>

        {/* Previsto (A Pagar) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Receipt className="h-4 w-4 text-yellow-600" />
              Previsto (A Pagar)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {(apInstallmentsView as APInstallmentViewRow[])
                .filter((i) => !isCanceled(i.status))
                .filter((i) => safeNum(i.open_amount) > 0)
                .slice(0, 10)
                .map((i) => {
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

              {(apInstallmentsView as APInstallmentViewRow[]).filter((i) => !isCanceled(i.status) && safeNum(i.open_amount) > 0)
                .length === 0 && <p className="text-muted-foreground text-sm">Nada a pagar no período</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="text-xs text-muted-foreground">
        Obs.: Para ficar “contábil perfeito”, o ideal é: <strong>compras de insumo</strong> e <strong>despesas</strong> gerarem títulos no AP automaticamente.
        Por enquanto, os toggles permitem usar o legado como complemento sem duplicar com o AR/AP.
      </div>
    </div>
  );
}
