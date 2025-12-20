// src/components/admin/financeiro/CashFlowView.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrencyBRL } from "@/lib/format";
import { cn } from "@/lib/utils";
import { AlertTriangle, ArrowDownCircle, ArrowUpCircle, Clock, DollarSign } from "lucide-react";

type CashFlowViewProps = {
  // orders: precisa ter { total, payment_status, created_at, customer_name? }
  orders: any[];
  // movements: entradas de insumos: { movement_type, quantity, cost_per_unit_at_time, created_at, raw_materials?: { name } }
  movements: any[];
  // expenses: { amount, expense_date, category?, description? }
  expenses: any[];

  totalRevenue: number;
  pendingRevenue: number;
  materialCosts: number;
  operationalExpenses: number;
};

const safeNum = (v: any) => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "0").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

const fmtDateBR = (d: any) => {
  const dt = d ? new Date(d) : null;
  if (!dt || Number.isNaN(dt.getTime())) return "-";
  return dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
};

export function CashFlowView({
  orders,
  movements,
  expenses,
  totalRevenue,
  pendingRevenue,
  materialCosts,
  operationalExpenses,
}: CashFlowViewProps) {
  const netCash = safeNum(totalRevenue) - safeNum(materialCosts) - safeNum(operationalExpenses);

  // últimas movimentações “financeiras” (simples e útil)
  const lastPaidOrders = (orders || [])
    .filter((o) => String(o?.payment_status || "").toLowerCase() === "pago")
    .slice(0, 5);

  const lastExpenses = (expenses || []).slice(0, 5);

  const lastMaterialEntries = (movements || [])
    .filter((m) => String(m?.movement_type || "").toLowerCase() === "entrada")
    .slice(0, 5);

  const anyMissing = [totalRevenue, materialCosts, operationalExpenses].some((v) => !Number.isFinite(safeNum(v)));

  return (
    <div className="space-y-4">
      {anyMissing && (
        <div className="flex items-center gap-2 text-sm p-3 rounded-lg border bg-amber-500/10 border-amber-500/20">
          <AlertTriangle className="h-4 w-4" />
          Alguns valores vieram inválidos. Verifique registros com campos vazios.
        </div>
      )}

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" /> Entradas (Recebido)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrencyBRL(safeNum(totalRevenue))}</div>
            <p className="text-xs text-muted-foreground">Pedidos pagos no período</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" /> A Receber
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrencyBRL(safeNum(pendingRevenue))}</div>
            <p className="text-xs text-muted-foreground">Pedidos aguardando pagamento</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <ArrowDownCircle className="h-4 w-4" /> Saídas (Insumos)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrencyBRL(safeNum(materialCosts))}</div>
            <p className="text-xs text-muted-foreground">Compras/entradas de matéria-prima</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <ArrowDownCircle className="h-4 w-4" /> Saídas (Operacional)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrencyBRL(safeNum(operationalExpenses))}</div>
            <p className="text-xs text-muted-foreground">Despesas (fixas/variáveis)</p>
          </CardContent>
        </Card>
      </div>

      {/* Net */}
      <Card className={cn(netCash < 0 && "border-destructive/40")}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
            <ArrowUpCircle className="h-4 w-4" /> Caixa Líquido (simples)
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4">
          <div>
            <div className={cn("text-3xl font-bold", netCash < 0 ? "text-destructive" : "")}>
              {formatCurrencyBRL(netCash)}
            </div>
            <p className="text-xs text-muted-foreground">
              Recebido - compras de insumo - despesas operacionais (não inclui estoque/competência)
            </p>
          </div>
          <Badge variant={netCash < 0 ? "destructive" : "default"}>{netCash < 0 ? "Negativo" : "Positivo"}</Badge>
        </CardContent>
      </Card>

      {/* Recent lists */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Últimos recebimentos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {lastPaidOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum pedido pago no período.</p>
            ) : (
              lastPaidOrders.map((o: any) => (
                <div key={o.id} className="flex items-center justify-between text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{o.customer_name || o.customer_email || "Pedido"}</p>
                    <p className="text-xs text-muted-foreground">{fmtDateBR(o.created_at)}</p>
                  </div>
                  <div className="font-medium">{formatCurrencyBRL(safeNum(o.total))}</div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Últimas despesas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {lastExpenses.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma despesa no período.</p>
            ) : (
              lastExpenses.map((e: any) => (
                <div key={e.id} className="flex items-center justify-between text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{e.description || e.category || "Despesa"}</p>
                    <p className="text-xs text-muted-foreground">{fmtDateBR(e.expense_date)}</p>
                  </div>
                  <div className="font-medium">{formatCurrencyBRL(safeNum(e.amount))}</div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Últimas compras de insumo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {lastMaterialEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma entrada de insumo no período.</p>
            ) : (
              lastMaterialEntries.map((m: any) => {
                const total = safeNum(m.quantity) * safeNum(m.cost_per_unit_at_time);
                return (
                  <div key={m.id} className="flex items-center justify-between text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{m.raw_materials?.name || "Insumo"}</p>
                      <p className="text-xs text-muted-foreground">{fmtDateBR(m.created_at)}</p>
                    </div>
                    <div className="font-medium">{formatCurrencyBRL(total)}</div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
