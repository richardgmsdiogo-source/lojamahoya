import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { endOfMonth, endOfYear, format, startOfMonth, startOfYear, subMonths } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

export type Period = "current" | "last" | "last3" | "last6" | "year";

function getRange(period: Period) {
  const now = new Date();

  if (period === "current") {
    return { start: startOfMonth(now), end: endOfMonth(now) };
  }
  if (period === "last") {
    const d = subMonths(now, 1);
    return { start: startOfMonth(d), end: endOfMonth(d) };
  }
  if (period === "last3") {
    const start = startOfMonth(subMonths(now, 2));
    return { start, end: endOfMonth(now) };
  }
  if (period === "last6") {
    const start = startOfMonth(subMonths(now, 5));
    return { start, end: endOfMonth(now) };
  }

  return { start: startOfYear(now), end: endOfYear(now) };
}

export function useFinanceData(period: Period) {
  const { start, end } = useMemo(() => getRange(period), [period]);
  const startStr = useMemo(() => format(start, "yyyy-MM-dd"), [start]);
  const endStr = useMemo(() => format(end, "yyyy-MM-dd"), [end]);

  const ordersQ = useQuery({
    queryKey: ["finance-orders", period],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .gte("created_at", startStr)
        .lte("created_at", endStr)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const movementsQ = useQuery({
    queryKey: ["finance-movements", period],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("raw_material_movements")
        .select("*, raw_materials(name)")
        .gte("created_at", startStr)
        .lte("created_at", endStr)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const batchesQ = useQuery({
    queryKey: ["finance-batches", period],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("production_batches")
        .select("*")
        .gte("created_at", startStr)
        .lte("created_at", endStr)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const expensesQ = useQuery({
    queryKey: ["finance-expenses", period],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .gte("expense_date", startStr)
        .lte("expense_date", endStr)
        .order("expense_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const orders = ordersQ.data ?? [];
  const movements = movementsQ.data ?? [];
  const batches = batchesQ.data ?? [];
  const expenses = expensesQ.data ?? [];

  // Mesmo raciocínio que você já usa hoje (só centralizado):
  const totalRevenue = orders
    .filter((o: any) => o.payment_status === "pago")
    .reduce((sum: number, o: any) => sum + Number(o.total || 0), 0);

  const pendingRevenue = orders
    .filter((o: any) => o.payment_status === "aguardando")
    .reduce((sum: number, o: any) => sum + Number(o.total || 0), 0);

  const materialCosts = movements
    .filter((m: any) => m.movement_type === "entrada")
    .reduce((sum: number, m: any) => sum + Number(m.quantity || 0) * Number(m.cost_per_unit_at_time || 0), 0);

  // No seu AdminFinanceiroTab atual você soma batches excluindo estornado :contentReference[oaicite:1]{index=1}
  const productionCosts = batches
    .filter((b: any) => b.status !== "estornado")
    .reduce((sum: number, b: any) => sum + Number(b.total_cost || 0), 0);

  const operationalExpenses = expenses.reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0);

  const grossProfit = totalRevenue - productionCosts;
  const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

  const netProfit = grossProfit - operationalExpenses;
  const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  const isLoading = ordersQ.isLoading || movementsQ.isLoading || batchesQ.isLoading || expensesQ.isLoading;

  return {
    periodRange: { start, end },
    isLoading,
    // dados
    orders,
    movements,
    batches,
    expenses,
    // totais
    totalRevenue,
    pendingRevenue,
    materialCosts,
    productionCosts,
    operationalExpenses,
    grossProfit,
    grossMargin,
    netProfit,
    netMargin,
  };
}
