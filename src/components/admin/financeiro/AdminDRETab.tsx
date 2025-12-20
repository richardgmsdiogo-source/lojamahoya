import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrencyBRL } from "@/lib/format";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

import { TrendingUp, Receipt, Factory, Landmark, Percent } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths, differenceInMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

type Period = "current" | "last" | "last3" | "last6" | "year";
type Regime = "competencia" | "caixa";

const safeNum = (v: any) => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "0").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

const isCancelledOrder = (o: any) => {
  const status = String(o?.status ?? o?.order_status ?? "").toLowerCase().trim();
  const paymentStatus = String(o?.payment_status ?? "").toLowerCase().trim();

  if (o?.is_cancelled === true) return true;
  if (o?.cancelled_at) return true;

  const cancelledStatuses = ["cancelado", "cancelled", "canceled", "cancel", "anulado", "void"];
  if (cancelledStatuses.includes(status)) return true;
  if (cancelledStatuses.includes(paymentStatus)) return true;

  return false;
};

const isPaidOrder = (o: any) => String(o?.payment_status ?? "").toLowerCase().trim() === "pago";

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

export const AdminDRETab = () => {
  const [period, setPeriod] = useState<Period>("current");
  const [regime, setRegime] = useState<Regime>("competencia");
  const { start, end } = getPeriodDates(period);

  const startISO = start.toISOString();
  const endISO = end.toISOString();
  const startYYYYMMDD = format(start, "yyyy-MM-dd");
  const endYYYYMMDD = format(end, "yyyy-MM-dd");

  // =========
  // 1) Receita (AR) + fallback orders
  // =========
  const { data: arInstallments = [] } = useQuery({
    queryKey: ["dre-ar-installments", period],
    queryFn: async () => {
      try {
        const { data, error } = await (supabase as any)
          .from("ar_installments")
          .select("amount, due_date, status")
          .gte("due_date", startYYYYMMDD)
          .lte("due_date", endYYYYMMDD);

        if (error) throw error;
        return data ?? [];
      } catch {
        return [];
      }
    },
  });

  const { data: arPayments = [] } = useQuery({
    queryKey: ["dre-ar-payments", period],
    queryFn: async () => {
      try {
        const { data, error } = await (supabase as any)
          .from("ar_payments")
          .select("amount, received_at, interest_amount, fee_amount, discount_amount")
          .gte("received_at", startISO)
          .lte("received_at", endISO);

        if (error) throw error;
        return data ?? [];
      } catch {
        return [];
      }
    },
  });

  const { data: orders = [] } = useQuery({
    queryKey: ["dre-orders-fallback", period],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("total, created_at, payment_status, status, order_status, cancelled_at, is_cancelled")
        .gte("created_at", startISO)
        .lte("created_at", endISO);

      if (error) throw error;
      return data ?? [];
    },
  });

  // =========
  // 2) CPV – produção (custo médio por lotes no período)
  // =========
  const { data: batches = [] } = useQuery({
    queryKey: ["dre-batches", period],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("production_batches")
        .select("id, created_at, quantity_produced, total_cost, unit_cost, status, status_new, products(name)")
        .gte("created_at", startISO)
        .lte("created_at", endISO)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
  });

  // =========
  // 3) Despesas operacionais (expenses + AP)
  // =========
  const { data: expenses = [] } = useQuery({
    queryKey: ["dre-expenses", period],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("amount, expense_date, category, description")
        .gte("expense_date", startYYYYMMDD)
        .lte("expense_date", endYYYYMMDD)
        .order("expense_date", { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
  });

  // AP (ajustado para o que você mostrou: ap_bills)
  const { data: apBills = [] } = useQuery({
    queryKey: ["dre-ap-bills", period],
    queryFn: async () => {
      try {
        const { data, error } = await (supabase as any)
          .from("ap_bills")
          .select("total_amount, issue_date, status, category")
          .gte("issue_date", startYYYYMMDD)
          .lte("issue_date", endYYYYMMDD);

        if (error) throw error;
        return data ?? [];
      } catch {
        return [];
      }
    },
  });

  // Se existir ap_payments (opcional)
  const { data: apPayments = [] } = useQuery({
    queryKey: ["dre-ap-payments", period],
    queryFn: async () => {
      try {
        const { data, error } = await (supabase as any)
          .from("ap_payments")
          .select("amount, paid_at, interest_amount, fee_amount, discount_amount")
          .gte("paid_at", startISO)
          .lte("paid_at", endISO);

        if (error) throw error;
        return data ?? [];
      } catch {
        return [];
      }
    },
  });

  // =========
  // 4) Depreciação — opcional
  // =========
  const { data: fixedAssets = [] } = useQuery({
    queryKey: ["dre-fixed-assets", period],
    queryFn: async () => {
      try {
        const { data, error } = await (supabase as any)
          .from("fixed_assets")
          .select("purchase_value, useful_life_months, purchase_date, is_active")
          .eq("is_active", true);

        if (error) throw error;
        return data ?? [];
      } catch {
        return [];
      }
    },
  });

  // =========
  // Cálculos DRE
  // =========
  const computed = useMemo(() => {
    const isOpen = (status: any) => {
      const s = String(status ?? "").toLowerCase().trim();
      return s !== "pago" && s !== "paid" && s !== "recebido" && s !== "received" && s !== "cancelado" && s !== "cancelled";
    };

    const hasAR = (arInstallments?.length || 0) > 0 || (arPayments?.length || 0) > 0;
    const hasAP = (apBills?.length || 0) > 0 || (apPayments?.length || 0) > 0;

    // -----------------
    // Receita bruta
    // -----------------
    let receitaBruta = 0;

    if (hasAR) {
      if (regime === "competencia") {
        // Competência: parcelas com vencimento no período (opcional filtrar abertas)
        receitaBruta = (arInstallments as any[]).reduce((acc, x) => acc + safeNum(x.amount), 0);
      } else {
        // Caixa: recebimentos no período
        receitaBruta = (arPayments as any[]).reduce((acc, x) => acc + safeNum(x.amount), 0);
      }
    } else {
      // Fallback orders
      const validOrders = (orders as any[]).filter((o) => !isCancelledOrder(o));
      if (regime === "competencia") {
        receitaBruta = validOrders.reduce((acc, o) => acc + safeNum(o.total), 0);
      } else {
        receitaBruta = validOrders
          .filter((o) => isPaidOrder(o))
          .reduce((acc, o) => acc + safeNum(o.total), 0);
      }
    }

    // -----------------
    // Deduções (só existe bem quando AR payments existe)
    // -----------------
    const descontos = (arPayments as any[]).reduce((acc, x) => acc + safeNum(x.discount_amount), 0);
    const taxasReceb = (arPayments as any[]).reduce((acc, x) => acc + safeNum(x.fee_amount), 0);
    const deducoes = hasAR ? descontos + taxasReceb : 0;

    const receitaLiquida = Math.max(0, receitaBruta - deducoes);

    // -----------------
    // CPV (produção) – exclui perda/estornado
    // -----------------
    const cpv = (batches as any[])
      .filter((b) => {
        const s = String(b?.status ?? "").toLowerCase();
        const sn = String(b?.status_new ?? "").toLowerCase();
        return s !== "estornado" && sn !== "estornado" && s !== "perda" && sn !== "perda";
      })
      .reduce((acc, b) => acc + safeNum(b?.total_cost), 0);

    const lucroBruto = receitaLiquida - cpv;
    const margemBrutaPct = receitaLiquida > 0 ? (lucroBruto / receitaLiquida) * 100 : 0;

    // -----------------
    // Despesas operacionais
    // -----------------
    const despesasExpenses = (expenses as any[]).reduce((acc, e) => acc + safeNum(e.amount), 0);

    // AP por regime:
    // - competência: títulos (ap_bills) no período (você pode refinar para "status aberto" se quiser)
    // - caixa: pagamentos (ap_payments) no período (se existir)
    const apTotal = (() => {
      if (!hasAP) return 0;

      if (regime === "competencia") {
        return (apBills as any[])
          // se quiser considerar só em aberto, descomente:
          // .filter((x) => isOpen(x.status))
          .reduce((acc, x) => acc + safeNum(x.total_amount), 0);
      }

      return (apPayments as any[]).reduce((acc, x) => acc + safeNum(x.amount), 0);
    })();

    // Evitar dobrar: se você usa AP como fonte, expenses vira "complemento".
    // Se você joga tudo em expenses (e AP é só “fornecedor”), aí troque esta regra.
    const despesasOperacionais = hasAP ? apTotal + despesasExpenses : despesasExpenses;

    const ebitda = lucroBruto - despesasOperacionais;

    // -----------------
    // Depreciação (mensal * meses do período)
    // -----------------
    const monthsInPeriod = Math.max(1, differenceInMonths(end, start) + 1);

    const depreciacaoMensalTotal = (fixedAssets as any[]).reduce((acc, a) => {
      const pv = safeNum(a.purchase_value);
      const life = Math.max(0, Math.floor(safeNum(a.useful_life_months)));
      if (!pv || !life) return acc;
      return acc + pv / life;
    }, 0);

    const depreciacao = depreciacaoMensalTotal * monthsInPeriod;

    const resultadoOperacional = ebitda - depreciacao;

    // -----------------
    // Resultado financeiro
    // -----------------
    const jurosReceb = (arPayments as any[]).reduce((acc, x) => acc + safeNum(x.interest_amount), 0);

    const jurosPag = (apPayments as any[]).reduce((acc, x) => acc + safeNum(x.interest_amount), 0);
    const taxasPag = (apPayments as any[]).reduce((acc, x) => acc + safeNum(x.fee_amount), 0);

    const resultadoFinanceiro = jurosReceb - (jurosPag + taxasPag);

    // Impostos placeholder
    const impostosIRCS = 0;

    const lucroLiquido = resultadoOperacional + resultadoFinanceiro - impostosIRCS;
    const margemLiquidaPct = receitaLiquida > 0 ? (lucroLiquido / receitaLiquida) * 100 : 0;

    return {
      hasAR,
      hasAP,
      receitaBruta,
      deducoes,
      receitaLiquida,
      cpv,
      lucroBruto,
      margemBrutaPct,
      despesasOperacionais,
      ebitda,
      depreciacao,
      resultadoOperacional,
      resultadoFinanceiro,
      impostosIRCS,
      lucroLiquido,
      margemLiquidaPct,
    };
  }, [regime, arInstallments, arPayments, orders, batches, expenses, apBills, apPayments, fixedAssets, start, end]);

  // Quebras (detalhes)
  const expensesByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of expenses as any[]) {
      const c = String(e.category ?? "outros");
      map.set(c, (map.get(c) || 0) + safeNum(e.amount));
    }
    return Array.from(map.entries())
      .map(([category, value]) => ({ category, value }))
      .sort((a, b) => b.value - a.value);
  }, [expenses]);

  const cpvByProduct = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of batches as any[]) {
      const s = String(b.status ?? "").toLowerCase();
      const sn = String(b.status_new ?? "").toLowerCase();
      if (s === "estornado" || sn === "estornado" || s === "perda" || sn === "perda") continue;

      const name = b.products?.name || "Produto";
      map.set(name, (map.get(name) || 0) + safeNum(b.total_cost));
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 12);
  }, [batches]);

  const periodLabel = useMemo(() => {
    const s = format(start, "dd/MM/yyyy", { locale: ptBR });
    const e = format(end, "dd/MM/yyyy", { locale: ptBR });
    return `${s} → ${e}`;
  }, [start, end]);

  const Line = ({
    label,
    value,
    strong,
    negative,
    pctOfNetRevenue,
    indent = 0,
  }: {
    label: string;
    value: number;
    strong?: boolean;
    negative?: boolean;
    pctOfNetRevenue?: number | null;
    indent?: number;
  }) => (
    <div className={`flex items-center justify-between py-2 ${strong ? "font-semibold" : ""}`}>
      <div className="flex items-center gap-2">
        <span style={{ paddingLeft: indent * 12 }} className="text-sm">
          {label}
        </span>
        {typeof pctOfNetRevenue === "number" && (
          <Badge variant="secondary" className="text-xs">
            {pctOfNetRevenue.toFixed(1)}%
          </Badge>
        )}
      </div>
      <span className={`text-sm ${negative ? "text-destructive" : ""}`}>{formatCurrencyBRL(value)}</span>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-title text-2xl">DRE</h2>
          <p className="text-sm text-muted-foreground">
            Demonstração do Resultado • {periodLabel} • Regime:{" "}
            <strong>{regime === "competencia" ? "Competência" : "Caixa"}</strong>
          </p>
        </div>

        <div className="flex gap-2">
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

          <Select value={regime} onValueChange={(v) => setRegime(v as Regime)}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="competencia">Competência</SelectItem>
              <SelectItem value="caixa">Caixa</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Cards principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Receita Líquida</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrencyBRL(computed.receitaLiquida)}</div>
            <p className="text-xs text-muted-foreground">
              Receita bruta − deduções ({formatCurrencyBRL(computed.deducoes)})
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Lucro Bruto</CardTitle>
            <Factory className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${computed.lucroBruto >= 0 ? "" : "text-destructive"}`}>
              {formatCurrencyBRL(computed.lucroBruto)}
            </div>
            <p className="text-xs text-muted-foreground">Margem bruta: {computed.margemBrutaPct.toFixed(1)}%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">EBITDA</CardTitle>
            <Landmark className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${computed.ebitda >= 0 ? "" : "text-destructive"}`}>
              {formatCurrencyBRL(computed.ebitda)}
            </div>
            <p className="text-xs text-muted-foreground">Lucro bruto − despesas operacionais</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Lucro Líquido</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${computed.lucroLiquido >= 0 ? "" : "text-destructive"}`}>
              {formatCurrencyBRL(computed.lucroLiquido)}
            </div>
            <p className="text-xs text-muted-foreground">Margem líquida: {computed.margemLiquidaPct.toFixed(1)}%</p>
          </CardContent>
        </Card>
      </div>

      {/* DRE (tabela contábil) */}
      <Card>
        <CardHeader>
          <CardTitle>Estrutura Contábil</CardTitle>
        </CardHeader>
        <CardContent>
          <Line label="Receita Bruta" value={computed.receitaBruta} strong />

          <Line
            label="(-) Deduções / Taxas / Descontos"
            value={computed.deducoes}
            negative
            indent={1}
            pctOfNetRevenue={computed.receitaLiquida > 0 ? (computed.deducoes / computed.receitaLiquida) * 100 : null}
          />

          <Separator className="my-2" />
          <Line label="Receita Líquida" value={computed.receitaLiquida} strong />

          <Line
            label="(-) CPV (Custo dos Produtos Vendidos)"
            value={computed.cpv}
            negative
            indent={1}
            pctOfNetRevenue={computed.receitaLiquida > 0 ? (computed.cpv / computed.receitaLiquida) * 100 : null}
          />

          <Separator className="my-2" />
          <Line label="Lucro Bruto" value={computed.lucroBruto} strong />

          <Line
            label="(-) Despesas Operacionais"
            value={computed.despesasOperacionais}
            negative
            indent={1}
            pctOfNetRevenue={
              computed.receitaLiquida > 0 ? (computed.despesasOperacionais / computed.receitaLiquida) * 100 : null
            }
          />

          <Separator className="my-2" />
          <Line label="EBITDA" value={computed.ebitda} strong />

          <Line
            label="(-) Depreciação / Amortização"
            value={computed.depreciacao}
            negative
            indent={1}
            pctOfNetRevenue={computed.receitaLiquida > 0 ? (computed.depreciacao / computed.receitaLiquida) * 100 : null}
          />

          <Separator className="my-2" />
          <Line label="Resultado Operacional" value={computed.resultadoOperacional} strong />

          <Line
            label="Resultado Financeiro (líquido)"
            value={computed.resultadoFinanceiro}
            indent={1}
            pctOfNetRevenue={
              computed.receitaLiquida > 0 ? (computed.resultadoFinanceiro / computed.receitaLiquida) * 100 : null
            }
          />

          <Line label="(-) IR/CSLL (placeholder)" value={computed.impostosIRCS} negative indent={1} />

          <Separator className="my-2" />
          <Line label="Lucro Líquido" value={computed.lucroLiquido} strong />
        </CardContent>
      </Card>

      {/* Quebras */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Factory className="h-4 w-4" />
              CPV por Produto (custo médio)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cpvByProduct.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum lote no período (ou tudo estornado/perda).</p>
            ) : (
              <div className="space-y-2">
                {cpvByProduct.map((x) => (
                  <div key={x.name} className="flex items-center justify-between rounded bg-muted/40 p-2">
                    <span className="text-sm font-medium">{x.name}</span>
                    <span className="text-sm">{formatCurrencyBRL(x.value)}</span>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-3 text-xs text-muted-foreground">
              CPV vem de <code>production_batches.total_cost</code> (custo médio). Não é “caixa”, é contábil.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Despesas por Categoria (expenses)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {expensesByCategory.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma despesa no período.</p>
            ) : (
              <div className="space-y-2">
                {expensesByCategory.slice(0, 12).map((x) => (
                  <div key={x.category} className="flex items-center justify-between rounded bg-muted/40 p-2">
                    <span className="text-sm font-medium">{x.category}</span>
                    <span className="text-sm text-destructive">-{formatCurrencyBRL(x.value)}</span>
                  </div>
                ))}
              </div>
            )}

            {computed.hasAR || computed.hasAP ? (
              <p className="mt-3 text-xs text-muted-foreground">
                AR/AP detectados ✅ — receita e/ou despesas também podem vir das tabelas de contas, conforme o regime.
              </p>
            ) : (
              <p className="mt-3 text-xs text-muted-foreground">
                AR/AP ainda não existem ✅ — usando fallback em <code>orders</code> (receita) e <code>expenses</code> (despesas).
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Rodapé / notas contábeis */}
      <Card>
        <CardHeader>
          <CardTitle>Notas Contábeis</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            <strong>Competência</strong>: reconhece receita/despesa pelo período (parcelas/títulos) — melhor para DRE real.
          </p>
          <p>
            <strong>Caixa</strong>: reconhece quando pagou/recebeu — útil para conciliação, mas pode distorcer margem do período.
          </p>
          <p>
            <strong>CPV</strong>: aqui está baseado no custo médio calculado na produção (lotes). Para ficar “perfeito”, no futuro
            o CPV deveria vir da baixa do estoque de produto acabado no momento da venda (FIFO/médio).
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
