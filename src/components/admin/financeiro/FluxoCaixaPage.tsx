import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CashFlowView } from "@/components/admin/financeiro/CashFlowView";
import { useFinanceData, Period } from "@/components/admin/financeiro/useFinanceData";

export default function FluxoCaixaPage() {
  const [period, setPeriod] = useState<Period>("current");
  const data = useFinanceData(period);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Fluxo de Caixa</h2>
        <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="current">Mês Atual</SelectItem>
            <SelectItem value="last">Mês Anterior</SelectItem>
            <SelectItem value="last3">Últimos 3 Meses</SelectItem>
            <SelectItem value="last6">Últimos 6 Meses</SelectItem>
            <SelectItem value="year">Este Ano</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <CashFlowView
        orders={data.orders}
        movements={data.movements}
        expenses={data.expenses}
        totalRevenue={data.totalRevenue}
        pendingRevenue={data.pendingRevenue}
        materialCosts={data.materialCosts}
        operationalExpenses={data.operationalExpenses}
      />
    </div>
  );
}
