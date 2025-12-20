// src/components/admin/financeiro/DREView.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrencyBRL } from "@/lib/format";
import { cn } from "@/lib/utils";
import { BarChart3, TrendingDown, TrendingUp } from "lucide-react";

type DREViewProps = {
  totalRevenue: number;
  productionCosts: number;
  grossProfit: number;
  grossMargin: number;

  operationalExpenses: number;
  netProfit: number;
  netMargin: number;

  // opcionais (para detalhar embaixo)
  batches?: any[];
  expenses?: any[];
};

const safeNum = (v: any) => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "0").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

const pct = (v: any) => `${safeNum(v).toFixed(1)}%`;

export function DREView({
  totalRevenue,
  productionCosts,
  grossProfit,
  grossMargin,
  operationalExpenses,
  netProfit,
  netMargin,
  batches = [],
  expenses = [],
}: DREViewProps) {
  const rev = safeNum(totalRevenue);
  const prod = safeNum(productionCosts);
  const opx = safeNum(operationalExpenses);

  const gp = safeNum(grossProfit);
  const np = safeNum(netProfit);

  const isRevZero = rev <= 0;

  // detalhes (top 5)
  const topExpenseCats = (() => {
    const map = new Map<string, number>();
    for (const e of expenses || []) {
      const key = (e.category || e.description || "Outros").toString();
      map.set(key, (map.get(key) || 0) + safeNum(e.amount));
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  })();

  const batchesCost = (batches || []).reduce((s: number, b: any) => s + safeNum(b.total_cost), 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <BarChart3 className="h-4 w-4" /> Receita
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrencyBRL(rev)}</div>
            <p className="text-xs text-muted-foreground">Base do cálculo (pagos no período)</p>
          </CardContent>
        </Card>

        <Card className={cn(prod > rev && "border-amber-500/30")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <TrendingDown className="h-4 w-4" /> Custo de Produção (COGS)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrencyBRL(prod)}</div>
            <p className="text-xs text-muted-foreground">
              Soma de lotes no período (ex.: excluindo estornado no seu hook)
            </p>
          </CardContent>
        </Card>

        <Card className={cn(opx > 0 && "border-muted")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <TrendingDown className="h-4 w-4" /> Despesas Operacionais
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrencyBRL(opx)}</div>
            <p className="text-xs text-muted-foreground">Despesas do período</p>
          </CardContent>
        </Card>
      </div>

      {/* DRE statement */}
      <Card>
        <CardHeader>
          <CardTitle>DRE (resumo)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Row label="Receita" value={rev} highlight />
          <Row label="(-) Custo de Produção" value={-prod} />
          <Row
            label="= Lucro Bruto"
            value={gp}
            badge={isRevZero ? undefined : pct(grossMargin)}
            badgeVariant={gp < 0 ? "destructive" : "default"}
            highlight
          />
          <div className="border-t my-2" />
          <Row label="(-) Despesas Operacionais" value={-opx} />
          <Row
            label="= Lucro Líquido"
            value={np}
            badge={isRevZero ? undefined : pct(netMargin)}
            badgeVariant={np < 0 ? "destructive" : "default"}
            highlight
          />
        </CardContent>
      </Card>

      {/* Extras */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Principais despesas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topExpenseCats.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem despesas no período.</p>
            ) : (
              topExpenseCats.map(([k, v]) => (
                <div key={k} className="flex items-center justify-between text-sm">
                  <div className="truncate font-medium">{k}</div>
                  <div className="font-medium">{formatCurrencyBRL(v)}</div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Checagem rápida</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Hint
              ok={rev > 0}
              textOk="Receita > 0 no período."
              textBad="Receita está 0. Se você usa pedidos pagos, confira payment_status e total."
            />
            <Hint
              ok={batchesCost === prod || batches.length === 0}
              textOk="Custo de produção veio do histórico de lotes."
              textBad="Diferença no custo de produção. Confira filtros (ex.: estornado) e datas."
            />
            <Hint
              ok={np >= 0}
              textOk="Lucro líquido positivo."
              textBad="Lucro líquido negativo. Pode ser normal (investimento), mas revise custos/precificação."
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  badge,
  badgeVariant = "secondary",
  highlight,
}: {
  label: string;
  value: number;
  badge?: string;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
  highlight?: boolean;
}) {
  const v = safeNum(value);
  return (
    <div className={cn("flex items-center justify-between", highlight && "font-semibold")}>
      <div className="flex items-center gap-2">
        <span>{label}</span>
        {badge ? <Badge variant={badgeVariant}>{badge}</Badge> : null}
      </div>
      <div className={cn(v < 0 ? "text-destructive" : "")}>{formatCurrencyBRL(v)}</div>
    </div>
  );
}

function Hint({ ok, textOk, textBad }: { ok: boolean; textOk: string; textBad: string }) {
  return (
    <div className={cn("flex items-start gap-2 text-sm p-3 rounded-lg border", ok ? "bg-muted/40" : "bg-amber-500/10 border-amber-500/20")}>
      {ok ? <TrendingUp className="h-4 w-4 mt-0.5" /> : <TrendingDown className="h-4 w-4 mt-0.5" />}
      <p className="text-muted-foreground">{ok ? textOk : textBad}</p>
    </div>
  );
}
