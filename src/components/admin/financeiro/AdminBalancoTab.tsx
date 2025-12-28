import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatCurrencyBRL } from "@/lib/format";
import { Landmark, Package, Boxes, Wallet, ArrowDownUp } from "lucide-react";

import {
  format,
  parseISO,
  differenceInMonths,
  startOfMonth,
  endOfMonth,
  endOfDay,
} from "date-fns";
import { ptBR } from "date-fns/locale";

const safeNum = (v: any) => {
  const n =
    typeof v === "number"
      ? v
      : parseFloat(String(v ?? "0").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

const safeDate = (v: any) => {
  try {
    if (!v) return null;
    return parseISO(String(v));
  } catch {
    return null;
  }
};

const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

type FinishedProductRow = {
  id: string;
  name: string;
  is_active: boolean;
  finished_goods_stock: { current_quantity: number } | null;
  recipes: { total_cost: number; is_active?: boolean }[] | null;
};

type FixedAssetRow = {
  id: string;
  name: string;
  purchase_value: number;
  current_value: number | null;
  useful_life_months: number | null;
  purchase_date: string | null;
  created_at?: string | null;
  is_active: boolean;
};

export const AdminBalancoTab = () => {
  /**
   * Fechamento mensal (snapshot no fim do mês)
   * Input type="month" devolve "YYYY-MM"
   */
  const [monthRef, setMonthRef] = useState(() => format(new Date(), "yyyy-MM"));

  const { monthStart, monthEnd } = useMemo(() => {
    // monthRef "YYYY-MM" -> cria uma data segura no 1º dia do mês
    const d = safeDate(`${monthRef}-01`) || new Date();
    return {
      monthStart: startOfMonth(d),
      monthEnd: endOfMonth(d),
    };
  }, [monthRef]);

  // Para tabelas com timestamp (created_at), usa fim do dia no último dia do mês
  const monthEndISO = useMemo(
    () => endOfDay(monthEnd).toISOString(),
    [monthEnd]
  );

  // Para tabelas date (YYYY-MM-DD)
  const monthEndYYYYMMDD = useMemo(
    () => format(monthEnd, "yyyy-MM-dd"),
    [monthEnd]
  );

  const labelMonth = useMemo(
    () => format(monthEnd, "MMMM 'de' yyyy", { locale: ptBR }),
    [monthEnd]
  );

  // =========================
  // ATIVO: Estoque MP (snapshot atual)
  // =========================
  const { data: rawMaterials = [] } = useQuery({
    queryKey: ["balanco-month-raw-materials", monthRef],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("raw_materials")
        .select("id, name, current_quantity, cost_per_unit, unit, is_active")
        .eq("is_active", true);

      if (error) throw error;
      return data ?? [];
    },
  });

  // =========================
  // ATIVO: Estoque Produto Acabado (snapshot atual)
  // products + finished_goods_stock + recipes
  // =========================
  const { data: finishedGoods = [] } = useQuery({
    queryKey: ["balanco-month-finished-goods", monthRef],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(
          `
            id,
            name,
            is_active,
            finished_goods_stock(current_quantity),
            recipes(total_cost, is_active)
          `
        )
        .eq("is_active", true)
        .order("name");

      if (error) throw error;

      const normalized: FinishedProductRow[] = (data ?? []).map((p: any) => {
        const stockRel = p.finished_goods_stock;
        const stock = Array.isArray(stockRel)
          ? (stockRel[0] ?? null)
          : (stockRel ?? null);

        const recRel = p.recipes;
        const recipes = Array.isArray(recRel)
          ? recRel
          : recRel
          ? [recRel]
          : null;

        return {
          id: p.id,
          name: p.name,
          is_active: !!p.is_active,
          finished_goods_stock: stock,
          recipes,
        };
      });

      return normalized;
    },
  });

  // =========================
  // ATIVO: Contas a receber (AR) — aberto até o fim do mês
  // =========================
  const { data: arInstallments = [] } = useQuery({
    queryKey: ["balanco-month-ar-installments", monthRef],
    queryFn: async () => {
      try {
        const { data, error } = await (supabase as any)
          .from("ar_installments")
          .select("amount, due_date, status")
          .lte("due_date", monthEndYYYYMMDD);

        if (error) throw error;
        return data ?? [];
      } catch (e) {
        console.error("Erro AR installments (balanço mês):", e);
        return [];
      }
    },
  });

  // =========================
  // PASSIVO: Contas a pagar (AP) — aberto até o fim do mês
  // =========================
  const { data: apBills = [] } = useQuery({
    queryKey: ["balanco-month-ap-bills", monthRef],
    queryFn: async () => {
      try {
        const { data, error } = await (supabase as any)
          .from("ap_bills")
          .select("total_amount, issue_date, status")
          .lte("issue_date", monthEndYYYYMMDD);

        if (error) throw error;
        return data ?? [];
      } catch (e) {
        console.error("Erro AP bills (balanço mês):", e);
        return [];
      }
    },
  });

  // =========================
  // ATIVO: Caixa/Bancos (cash_flow) — saldo acumulado até fim do mês
  // =========================
  const { data: cashFlow = [] } = useQuery({
    queryKey: ["balanco-month-cash-flow", monthRef],
    queryFn: async () => {
      try {
        const { data, error } = await (supabase as any)
          .from("cash_flow")
          .select("amount, created_at")
          .lte("created_at", monthEndISO);

        if (error) throw error;
        return data ?? [];
      } catch (e) {
        console.error("Erro cash_flow (balanço mês):", e);
        return [];
      }
    },
  });

  // =========================
  // ATIVO: Imobilizado (fixed_assets) — posição até fim do mês
  // =========================
  const { data: fixedAssets = [] } = useQuery({
    queryKey: ["balanco-month-fixed-assets", monthRef],
    queryFn: async () => {
      try {
        const { data, error } = await (supabase as any)
          .from("fixed_assets")
          .select(
            "id, name, purchase_value, current_value, useful_life_months, purchase_date, created_at, is_active"
          )
          .eq("is_active", true)
          // inclui ativos sem purchase_date OU comprados até o fim do mês
          .or(`purchase_date.is.null,purchase_date.lte.${monthEndYYYYMMDD}`)
          // evita itens criados no futuro (timestamp)
          .lte("created_at", monthEndISO);

        if (error) throw error;
        return (data ?? []) as FixedAssetRow[];
      } catch (e) {
        console.error("Erro fixed_assets (balanço mês):", e);
        return [];
      }
    },
  });

  // =========================
  // CÁLCULOS (fechamento do mês)
  // =========================
  const computed = useMemo(() => {
    // Estoque MP (snapshot atual)
    const rawInventoryValue = sum(
      (rawMaterials as any[]).map(
        (m) => safeNum(m.current_quantity) * safeNum(m.cost_per_unit)
      )
    );

    const rawTop = (rawMaterials as any[])
      .map((m) => ({
        id: m.id,
        name: m.name,
        value: safeNum(m.current_quantity) * safeNum(m.cost_per_unit),
        qty: safeNum(m.current_quantity),
        unit: String(m.unit ?? ""),
        avg: safeNum(m.cost_per_unit),
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    // Produto acabado (snapshot atual)
    const getFinishedQty = (p: FinishedProductRow) =>
      safeNum(p?.finished_goods_stock?.current_quantity);

    const getFinishedUnitCost = (p: FinishedProductRow) => {
      const recipes = p?.recipes ?? null;
      if (!recipes || recipes.length === 0) return 0;
      const active = recipes.find((r) => r?.is_active === true) ?? recipes[0];
      return safeNum(active?.total_cost);
    };

    const finishedInventoryValue = sum(
      (finishedGoods as FinishedProductRow[]).map(
        (p) => getFinishedQty(p) * getFinishedUnitCost(p)
      )
    );

    const finishedTop = (finishedGoods as FinishedProductRow[])
      .map((p) => {
        const qty = getFinishedQty(p);
        const avg = getFinishedUnitCost(p);
        return { id: p.id, name: p.name || "Produto", qty, avg, value: qty * avg };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    // AR/AP em aberto
    const isOpen = (status: any) => {
      const s = String(status ?? "").toLowerCase().trim();
      return (
        s !== "pago" &&
        s !== "paid" &&
        s !== "recebido" &&
        s !== "received" &&
        s !== "cancelado" &&
        s !== "cancelled"
      );
    };

    const accountsReceivable = sum(
      (arInstallments as any[])
        .filter((x) => isOpen(x.status))
        .map((x) => safeNum(x.amount))
    );

    const accountsPayable = sum(
      (apBills as any[])
        .filter((x) => isOpen(x.status))
        .map((x) => safeNum(x.total_amount))
    );

    // Caixa (acumulado até fim do mês)
    const cashBalance =
      cashFlow.length > 0
        ? sum((cashFlow as any[]).map((x) => safeNum(x.amount)))
        : null;

    // Imobilizado (posição líquida até fim do mês)
    const fixedGross = sum(
      (fixedAssets as FixedAssetRow[]).map((a) => safeNum(a.purchase_value))
    );

    const fixedNet = sum(
      (fixedAssets as FixedAssetRow[]).map((a) => {
        const cv = safeNum(a.current_value);
        if (cv > 0) return cv;

        const pv = safeNum(a.purchase_value);
        const life = Math.max(0, Math.floor(safeNum(a.useful_life_months)));
        const purchase = safeDate(a.purchase_date);

        // sem dados pra depreciar: assume pv
        if (!pv || !life || !purchase) return pv;

        // depreciação até o fim do mês
        const monthsUsed = Math.max(0, differenceInMonths(monthEnd, purchase));
        const depPerMonth = pv / life;
        const accum = Math.min(pv, monthsUsed * depPerMonth);
        return Math.max(0, pv - accum);
      })
    );

    const fixedAccumDep = Math.max(0, fixedGross - fixedNet);

    // Totais
    const totalAssets =
      (cashBalance ?? 0) +
      accountsReceivable +
      rawInventoryValue +
      finishedInventoryValue +
      fixedNet;

    const totalLiabilities = accountsPayable;
    const equityCalculated = totalAssets - totalLiabilities;

    const hasFinishedGoods = (finishedGoods as FinishedProductRow[]).some(
      (p) => safeNum(p?.finished_goods_stock?.current_quantity) > 0
    );

    return {
      cashBalance,
      accountsReceivable,
      rawInventoryValue,
      finishedInventoryValue,
      fixedGross,
      fixedAccumDep,
      fixedNet,
      totalAssets,
      accountsPayable,
      totalLiabilities,
      equityCalculated,
      rawTop,
      finishedTop,
      hasFinishedGoods,
      hasCashFlow: cashFlow.length > 0,
      hasFixedAssets: (fixedAssets?.length || 0) > 0,
    };
  }, [
    rawMaterials,
    finishedGoods,
    arInstallments,
    apBills,
    cashFlow,
    fixedAssets,
    monthEnd,
  ]);

  const maybeMoney = (v: number | null) =>
    v === null ? "Não configurado" : formatCurrencyBRL(v);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-title text-2xl">Balanço Patrimonial</h2>
          <p className="text-sm text-muted-foreground">
            Fechamento de <strong>{labelMonth}</strong> (posição no fim do mês)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Mês:</span>
          <Input
            type="month"
            value={monthRef}
            onChange={(e) => setMonthRef(e.target.value)}
            className="w-[170px]"
          />
        </div>
      </div>

      {/* Cards principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Ativo Total</CardTitle>
            <Landmark className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrencyBRL(computed.totalAssets)}
            </div>
            <p className="text-xs text-muted-foreground">
              Caixa + Recebíveis + Estoques + Imobilizado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Passivo Total</CardTitle>
            <ArrowDownUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrencyBRL(computed.totalLiabilities)}
            </div>
            <p className="text-xs text-muted-foreground">
              Obrigações (AP em aberto)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Patrimônio Líquido</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                computed.equityCalculated < 0 ? "text-destructive" : ""
              }`}
            >
              {formatCurrencyBRL(computed.equityCalculated)}
            </div>
            <p className="text-xs text-muted-foreground">
              Calculado (Ativo − Passivo)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Caixa / Bancos</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {maybeMoney(computed.cashBalance)}
            </div>
            <p className="text-xs text-muted-foreground">
              {computed.hasCashFlow
                ? "Saldo acumulado até o fim do mês (cash_flow)"
                : "Ainda não existe cash_flow"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Estrutura */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* ATIVO */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Landmark className="h-4 w-4" />
              Ativo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span>Caixa e Equivalentes</span>
              <span className="font-medium">{maybeMoney(computed.cashBalance)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Contas a Receber</span>
              <span className="font-medium">{formatCurrencyBRL(computed.accountsReceivable)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Estoque (Matéria-prima)</span>
              <span className="font-medium">{formatCurrencyBRL(computed.rawInventoryValue)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Estoque (Produto acabado)</span>
              <span className="font-medium">
                {computed.hasFinishedGoods
                  ? formatCurrencyBRL(computed.finishedInventoryValue)
                  : "Não configurado"}
              </span>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <span>Imobilizado (líquido)</span>
              <span className="font-medium">{formatCurrencyBRL(computed.fixedNet)}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>• Custo</span>
              <span>{formatCurrencyBRL(computed.fixedGross)}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>• Depreciação acumulada</span>
              <span>-{formatCurrencyBRL(computed.fixedAccumDep)}</span>
            </div>

            <Separator />

            <div className="flex items-center justify-between font-semibold">
              <span>Ativo Total</span>
              <span>{formatCurrencyBRL(computed.totalAssets)}</span>
            </div>
          </CardContent>
        </Card>

        {/* PASSIVO */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowDownUp className="h-4 w-4" />
              Passivo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span>Contas a Pagar</span>
              <span className="font-medium">{formatCurrencyBRL(computed.accountsPayable)}</span>
            </div>

            <Separator />

            <div className="flex items-center justify-between font-semibold">
              <span>Passivo Total</span>
              <span>{formatCurrencyBRL(computed.totalLiabilities)}</span>
            </div>
          </CardContent>
        </Card>

        {/* PL */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Patrimônio Líquido
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span>PL (calculado)</span>
              <span
                className={`font-medium ${
                  computed.equityCalculated < 0 ? "text-destructive" : ""
                }`}
              >
                {formatCurrencyBRL(computed.equityCalculated)}
              </span>
            </div>

            <div className="text-xs text-muted-foreground">
              PL aqui é “Ativo − Passivo”. Quando você criar plano de contas + lançamentos,
              isso vira contábil de verdade.
            </div>

            <Separator />

            <div className="flex items-center justify-between font-semibold">
              <span>Passivo + PL</span>
              <span>
                {formatCurrencyBRL(
                  computed.totalLiabilities + computed.equityCalculated
                )}
              </span>
            </div>

            <div className="text-xs text-muted-foreground">
              Regra do universo: <strong>Ativo = Passivo + PL</strong>.
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Breakdowns */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Estoque (Matéria-prima) — maiores valores
            </CardTitle>
          </CardHeader>
          <CardContent>
            {computed.rawTop.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Sem matérias-primas cadastradas.
              </p>
            ) : (
              <div className="space-y-2">
                {computed.rawTop.map((x) => (
                  <div
                    key={x.id}
                    className="flex items-center justify-between rounded bg-muted/40 p-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{x.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {x.qty} {x.unit} × {formatCurrencyBRL(x.avg)}
                      </p>
                    </div>
                    <Badge variant="secondary">{formatCurrencyBRL(x.value)}</Badge>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-3 text-xs text-muted-foreground">
              *Estoque hoje é snapshot (<code>current_quantity</code>). Para histórico mensal perfeito,
              precisa de movimentações por mês.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Boxes className="h-4 w-4" />
              Estoque (Produto acabado)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!computed.hasFinishedGoods ? (
              <p className="text-sm text-muted-foreground">
                Ainda não há estoque em <code>finished_goods_stock</code>.
              </p>
            ) : computed.finishedTop.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Sem produto acabado no estoque.
              </p>
            ) : (
              <div className="space-y-2">
                {computed.finishedTop.map((x) => (
                  <div
                    key={x.id}
                    className="flex items-center justify-between rounded bg-muted/40 p-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{x.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {x.qty} un × {formatCurrencyBRL(x.avg)}
                      </p>
                    </div>
                    <Badge variant="secondary">{formatCurrencyBRL(x.value)}</Badge>
                  </div>
                ))}
              </div>
            )}

            <p className="mt-3 text-xs text-muted-foreground">
              Custo unitário vem de <code>recipes.total_cost</code> (receita ativa). Se um produto
              não tem receita, custo fica 0. *Snapshot atual.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
