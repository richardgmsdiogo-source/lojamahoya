import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatCurrencyBRL } from "@/lib/format";
import { Landmark, Package, Boxes, Wallet, ArrowDownUp } from "lucide-react";

import { format, parseISO, differenceInMonths, endOfMonth, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

const safeNum = (v: any) => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "0").replace(",", "."));
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

const isOpenStatus = (status: any) => {
  const s = String(status ?? "").toLowerCase().trim();
  return s !== "pago" && s !== "paid" && s !== "recebido" && s !== "received" && s !== "cancelado" && s !== "cancelled";
};

const isCashMethod = (method: any) => {
  const m = String(method ?? "").toLowerCase().trim();
  return m === "dinheiro" || m === "cash" || m === "espécie" || m === "especie";
};

const normCategory = (c: any) => {
  const s = String(c ?? "").trim();
  return s.length ? s : "Sem categoria";
};

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

type ARInstallmentRow = {
  amount: number;
  due_date: string;
  status: string | null;
};

type ARPaymentRow = {
  amount: number;
  received_at: string;
  // ajuste aqui se seu campo tiver outro nome:
  payment_method?: string | null;
};

type APBillRow = {
  total_amount: number;
  issue_date: string;
  status: string | null;
  // ajuste aqui se seu campo tiver outro nome:
  category?: string | null;
};

export const AdminBalancoTab = () => {
  // fechamento mensal
  const [monthRef, setMonthRef] = useState(() => format(new Date(), "yyyy-MM"));

  // capital social manual
  const [capitalSocial, setCapitalSocial] = useState<string>("0");

  const monthEnd = useMemo(() => {
    const d = safeDate(`${monthRef}-01`) || new Date();
    return endOfMonth(d);
  }, [monthRef]);

  const monthEndISO = useMemo(() => endOfDay(monthEnd).toISOString(), [monthEnd]);
  const monthEndYYYYMMDD = useMemo(() => format(monthEnd, "yyyy-MM-dd"), [monthEnd]);

  const labelMonth = useMemo(() => format(monthEnd, "MMMM 'de' yyyy", { locale: ptBR }), [monthEnd]);

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
        const stock = Array.isArray(stockRel) ? (stockRel[0] ?? null) : (stockRel ?? null);

        const recRel = p.recipes;
        const recipes = Array.isArray(recRel) ? recRel : recRel ? [recRel] : null;

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
  // ATIVO: Contas a Receber (TÍTULOS EM ABERTO)
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
        return (data ?? []) as ARInstallmentRow[];
      } catch (e) {
        console.error("Erro ar_installments:", e);
        return [] as ARInstallmentRow[];
      }
    },
  });

  // =========================
  // ATIVO: Caixa/Bancos (SOMENTE RECEBIDOS)
  // Fonte: ar_payments até o fim do mês
  // =========================

  type ARPaymentRow = {
    amount: number;
    received_at: string;
    payment_method_id: string | null;
    ar_payment_methods?: { type: string; name?: string } | null;
  };

  const { data: arPayments = [] } = useQuery({
    queryKey: ["balanco-month-ar-payments", monthRef],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ar_payments")
        .select("amount, received_at, payment_method_id, ar_payment_methods(type,name)")
        .lte("received_at", monthEndISO);

      if (error) throw error;
      return (data ?? []) as ARPaymentRow[];
    },
  });



  // =========================
  // PASSIVO: Contas a Pagar (aberto) com categoria
  // =========================
  const { data: apBills = [] } = useQuery({
    queryKey: ["balanco-month-ap-bills", monthRef],
    queryFn: async () => {
      try {
        const { data, error } = await (supabase as any)
          .from("ap_bills")
          .select("total_amount, issue_date, status, category")
          .lte("issue_date", monthEndYYYYMMDD);

        if (error) throw error;
        return (data ?? []) as APBillRow[];
      } catch (e) {
        console.error("Erro ap_bills:", e);
        return [] as APBillRow[];
      }
    },
  });

  // =========================
  // ATIVO: Imobilizado (fixed_assets)
  // =========================
  const { data: fixedAssets = [] } = useQuery({
    queryKey: ["balanco-month-fixed-assets", monthRef],
    queryFn: async () => {
      try {
        const { data, error } = await (supabase as any)
          .from("fixed_assets")
          .select("id, name, purchase_value, current_value, useful_life_months, purchase_date, created_at, is_active")
          .eq("is_active", true)
          .or(`purchase_date.is.null,purchase_date.lte.${monthEndYYYYMMDD}`)
          .lte("created_at", monthEndISO);

        if (error) throw error;
        return (data ?? []) as FixedAssetRow[];
      } catch (e) {
        console.error("Erro fixed_assets:", e);
        return [] as FixedAssetRow[];
      }
    },
  });

  // =========================
  // CÁLCULOS
  // =========================
  const computed = useMemo(() => {
    // Estoque MP
    const rawInventoryValue = sum((rawMaterials as any[]).map((m) => safeNum(m.current_quantity) * safeNum(m.cost_per_unit)));

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

    // Produto acabado
    const getFinishedQty = (p: FinishedProductRow) => safeNum(p?.finished_goods_stock?.current_quantity);

    const getFinishedUnitCost = (p: FinishedProductRow) => {
      const recipes = p?.recipes ?? null;
      if (!recipes || recipes.length === 0) return 0;
      const active = recipes.find((r) => r?.is_active === true) ?? recipes[0];
      return safeNum(active?.total_cost);
    };

    const finishedInventoryValue = sum((finishedGoods as FinishedProductRow[]).map((p) => getFinishedQty(p) * getFinishedUnitCost(p)));

    const finishedTop = (finishedGoods as FinishedProductRow[])
      .map((p) => {
        const qty = getFinishedQty(p);
        const avg = getFinishedUnitCost(p);
        return { id: p.id, name: p.name || "Produto", qty, avg, value: qty * avg };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    const hasFinishedGoods = (finishedGoods as FinishedProductRow[]).some((p) => getFinishedQty(p) > 0);

    // Contas a receber (títulos em aberto)
    const arOpen = (arInstallments as ARInstallmentRow[]).filter((x) => isOpenStatus(x.status));
    const accountsReceivable = sum(arOpen.map((x) => safeNum(x.amount)));

    // Caixa/Bancos (somente recebidos)
    const payments = (arPayments as ARPaymentRow[]) ?? [];
    const caixa = sum(
      arPayments
        .filter((p) => isCashMethod(p.ar_payment_methods?.type))
        .map((p) => safeNum(p.amount))
    );

    const banco = sum(
      arPayments
        .filter((p) => !isCashMethod(p.ar_payment_methods?.type))
        .map((p) => safeNum(p.amount))
    );

    const caixaEBancoTotal = caixa + banco;

    // Contas a pagar (aberto)
    const apOpen = (apBills as APBillRow[]).filter((x) => isOpenStatus(x.status));
    const accountsPayable = sum(apOpen.map((x) => safeNum(x.total_amount)));

    // AP por categoria
    const apByCategoryMap = new Map<string, number>();
    for (const b of apOpen) {
      const cat = normCategory((b as any).category);
      apByCategoryMap.set(cat, (apByCategoryMap.get(cat) || 0) + safeNum(b.total_amount));
    }
    const apByCategory = Array.from(apByCategoryMap.entries())
      .map(([category, value]) => ({ category, value }))
      .sort((a, b) => b.value - a.value);

    // Imobilizado
    const fixedGross = sum((fixedAssets as FixedAssetRow[]).map((a) => safeNum(a.purchase_value)));

    const fixedNet = sum(
      (fixedAssets as FixedAssetRow[]).map((a) => {
        const cv = safeNum(a.current_value);
        if (cv > 0) return cv;

        const pv = safeNum(a.purchase_value);
        const life = Math.max(0, Math.floor(safeNum(a.useful_life_months)));
        const purchase = safeDate(a.purchase_date);

        if (!pv || !life || !purchase) return pv;

        const monthsUsed = Math.max(0, differenceInMonths(monthEnd, purchase));
        const depPerMonth = pv / life;
        const accum = Math.min(pv, monthsUsed * depPerMonth);
        return Math.max(0, pv - accum);
      })
    );

    const fixedAccumDep = Math.max(0, fixedGross - fixedNet);

    // Totais
    const totalAssets = caixaEBancoTotal + accountsReceivable + rawInventoryValue + finishedInventoryValue + fixedNet;
    const totalLiabilities = accountsPayable;

    // PL
    const capital = safeNum(capitalSocial);
    const equityTotal = totalAssets - totalLiabilities;
    const lucroPrejuizoAcumulado = equityTotal - capital;

    return {
      // ativos
      caixa,
      banco,
      caixaEBancoTotal,
      accountsReceivable,
      rawInventoryValue,
      finishedInventoryValue,
      fixedGross,
      fixedAccumDep,
      fixedNet,
      totalAssets,

      // passivo
      accountsPayable,
      apByCategory,
      totalLiabilities,

      // PL
      capital,
      equityTotal,
      lucroPrejuizoAcumulado,

      // breakdowns
      rawTop,
      finishedTop,
      hasFinishedGoods,
      hasFixedAssets: (fixedAssets?.length || 0) > 0,
      hasReceipts: payments.length > 0,
    };
  }, [rawMaterials, finishedGoods, arInstallments, arPayments, apBills, fixedAssets, monthEnd, capitalSocial]);

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

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Mês:</span>
            <Input type="month" value={monthRef} onChange={(e) => setMonthRef(e.target.value)} className="w-[170px]" />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Capital Social:</span>
            <Input type="number" value={capitalSocial} onChange={(e) => setCapitalSocial(e.target.value)} className="w-[170px]" />
          </div>
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
            <div className="text-2xl font-bold">{formatCurrencyBRL(computed.totalAssets)}</div>
            <p className="text-xs text-muted-foreground">Caixa/Bancos + A Receber + Estoques + Imobilizado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Passivo Total</CardTitle>
            <ArrowDownUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrencyBRL(computed.totalLiabilities)}</div>
            <p className="text-xs text-muted-foreground">Contas a pagar em aberto</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Patrimônio Líquido</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${computed.equityTotal < 0 ? "text-destructive" : ""}`}>
              {formatCurrencyBRL(computed.equityTotal)}
            </div>
            <p className="text-xs text-muted-foreground">Capital + Lucro/Prejuízo acumulado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Caixa / Bancos</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-xl font-bold">{formatCurrencyBRL(computed.caixaEBancoTotal)}</div>
            <div className="text-xs text-muted-foreground flex items-center justify-between">
              <span>Caixa</span>
              <span className="font-medium">{formatCurrencyBRL(computed.caixa)}</span>
            </div>
            <div className="text-xs text-muted-foreground flex items-center justify-between">
              <span>Bancos</span>
              <span className="font-medium">{formatCurrencyBRL(computed.banco)}</span>
            </div>

            {!computed.hasReceipts && (
              <div className="text-[11px] text-muted-foreground pt-2">
                Sem recebimentos em <code>ar_payments</code> até o fim do mês.
              </div>
            )}
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
              <span>Caixa</span>
              <span className="font-medium">{formatCurrencyBRL(computed.caixa)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Bancos</span>
              <span className="font-medium">{formatCurrencyBRL(computed.banco)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Contas a Receber (títulos em aberto)</span>
              <span className="font-medium">{formatCurrencyBRL(computed.accountsReceivable)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Estoque (Matéria-prima)</span>
              <span className="font-medium">{formatCurrencyBRL(computed.rawInventoryValue)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Estoque (Produto acabado)</span>
              <span className="font-medium">
                {computed.hasFinishedGoods ? formatCurrencyBRL(computed.finishedInventoryValue) : "Não configurado"}
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

            {computed.apByCategory.length > 0 && (
              <div className="pt-2 space-y-1">
                <div className="text-xs text-muted-foreground">Categorias</div>
                {computed.apByCategory.map((x) => (
                  <div key={x.category} className="flex items-center justify-between text-xs">
                    <span className="truncate">{x.category}</span>
                    <span className="font-medium">{formatCurrencyBRL(x.value)}</span>
                  </div>
                ))}
              </div>
            )}

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
              <span>Capital Social</span>
              <span className="font-medium">{formatCurrencyBRL(computed.capital)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Lucro/Prejuízo acumulado</span>
              <span className={`font-medium ${computed.lucroPrejuizoAcumulado < 0 ? "text-destructive" : ""}`}>
                {formatCurrencyBRL(computed.lucroPrejuizoAcumulado)}
              </span>
            </div>

            <Separator />

            <div className="flex items-center justify-between font-semibold">
              <span>PL Total</span>
              <span className={`${computed.equityTotal < 0 ? "text-destructive" : ""}`}>
                {formatCurrencyBRL(computed.equityTotal)}
              </span>
            </div>

            <div className="text-xs text-muted-foreground">
              Fechamento: <strong>Ativo = Passivo + PL</strong>.
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
              <p className="text-sm text-muted-foreground">Sem matérias-primas cadastradas.</p>
            ) : (
              <div className="space-y-2">
                {computed.rawTop.map((x) => (
                  <div key={x.id} className="flex items-center justify-between rounded bg-muted/40 p-2">
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
              *Estoque ainda é snapshot. Para histórico mensal perfeito, precisa de movimentações.
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
              <p className="text-sm text-muted-foreground">Ainda não há estoque em <code>finished_goods_stock</code>.</p>
            ) : computed.finishedTop.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem produto acabado no estoque.</p>
            ) : (
              <div className="space-y-2">
                {computed.finishedTop.map((x) => (
                  <div key={x.id} className="flex items-center justify-between rounded bg-muted/40 p-2">
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
              Custo unitário vem de <code>recipes.total_cost</code> (receita ativa). Snapshot atual.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
