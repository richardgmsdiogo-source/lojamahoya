import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Receipt, Clock, CheckCircle, AlertCircle, Copy } from "lucide-react";
import { formatCurrencyBRL } from "@/lib/format";
import { format, parseISO, startOfMonth, endOfMonth, addMonths, addQuarters, addYears } from "date-fns";
import { ptBR } from "date-fns/locale";

const CATEGORIES = [
  { value: "aluguel", label: "Aluguel" },
  { value: "energia", label: "Energia" },
  { value: "agua", label: "Água" },
  { value: "internet", label: "Internet/Telefone" },
  { value: "marketing", label: "Marketing" },
  { value: "transporte", label: "Transporte/Frete" },
  { value: "manutencao", label: "Manutenção" },
  { value: "impostos", label: "Impostos/Taxas" },
  { value: "salarios", label: "Salários" },
  { value: "software", label: "Software/Assinaturas" },
  { value: "outros", label: "Outros" },
];

const STATUS_OPTIONS = [
  { value: "pendente", label: "Pendente", color: "bg-yellow-500" },
  { value: "pago", label: "Pago", color: "bg-green-500" },
  { value: "atrasado", label: "Atrasado", color: "bg-red-500" },
];

const RECURRENCE_OPTIONS = [
  { value: "unico", label: "Único" },
  { value: "mensal", label: "Mensal" },
  { value: "trimestral", label: "Trimestral" },
  { value: "anual", label: "Anual" },
];

type Expense = {
  id: string;
  description: string;
  category: string;
  amount: number;
  expense_date: string;
  due_date: string | null;
  payment_date: string | null;
  payment_status: string;
  recurrence: string | null;
  supplier: string | null;
  notes: string | null;
  created_at: string | null;
};

type ExpenseFormData = {
  description: string;
  category: string;
  amount: number;
  expense_date: string;
  due_date?: string;
  payment_date?: string;
  payment_status: string;
  recurrence?: string;
  supplier?: string;
  notes?: string;
};

export function AdminDespesasTab() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [filterMonth, setFilterMonth] = useState(format(new Date(), "yyyy-MM"));
  const queryClient = useQueryClient();

  const startDate = startOfMonth(parseISO(filterMonth + "-01"));
  const endDate = endOfMonth(startDate);

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ["expenses", filterMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .gte("expense_date", format(startDate, "yyyy-MM-dd"))
        .lte("expense_date", format(endDate, "yyyy-MM-dd"))
        .order("expense_date", { ascending: false });

      if (error) throw error;
      return data as Expense[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (expense: ExpenseFormData) => {
      const { error } = await supabase.from("expenses").insert([expense]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("Despesa cadastrada!");
      setIsOpen(false);
    },
    onError: () => toast.error("Erro ao cadastrar despesa"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...expense }: ExpenseFormData & { id: string }) => {
      const { error } = await supabase.from("expenses").update(expense).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("Despesa atualizada!");
      setIsOpen(false);
      setEditingExpense(null);
    },
    onError: () => toast.error("Erro ao atualizar despesa"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("Despesa removida!");
    },
    onError: () => toast.error("Erro ao remover despesa"),
  });

  const duplicateRecurringMutation = useMutation({
    mutationFn: async () => {
      // Get all recurring expenses from current month
      const { data: recurringExpenses, error: fetchError } = await supabase
        .from("expenses")
        .select("*")
        .gte("expense_date", format(startDate, "yyyy-MM-dd"))
        .lte("expense_date", format(endDate, "yyyy-MM-dd"))
        .neq("recurrence", "unico");

      if (fetchError) throw fetchError;
      if (!recurringExpenses || recurringExpenses.length === 0) {
        throw new Error("Nenhuma despesa recorrente encontrada no mês atual");
      }

      const newExpenses = recurringExpenses.map((expense) => {
        let newDate: Date;
        const currentDate = parseISO(expense.expense_date);
        
        switch (expense.recurrence) {
          case "mensal":
            newDate = addMonths(currentDate, 1);
            break;
          case "trimestral":
            newDate = addQuarters(currentDate, 1);
            break;
          case "anual":
            newDate = addYears(currentDate, 1);
            break;
          default:
            return null;
        }

        const newDueDate = expense.due_date 
          ? format(addMonths(parseISO(expense.due_date), expense.recurrence === "mensal" ? 1 : expense.recurrence === "trimestral" ? 3 : 12), "yyyy-MM-dd")
          : null;

        return {
          description: expense.description,
          category: expense.category,
          amount: expense.amount,
          expense_date: format(newDate, "yyyy-MM-dd"),
          due_date: newDueDate,
          payment_status: "pendente",
          recurrence: expense.recurrence,
          supplier: expense.supplier,
          notes: expense.notes,
        };
      }).filter(Boolean);

      if (newExpenses.length === 0) {
        throw new Error("Nenhuma despesa para duplicar");
      }

      const { error: insertError } = await supabase.from("expenses").insert(newExpenses);
      if (insertError) throw insertError;

      return newExpenses.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast.success(`${count} despesas recorrentes duplicadas para o próximo período!`);
    },
    onError: (error: Error) => toast.error(error.message || "Erro ao duplicar despesas"),
  });

  // Calculate totals
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const paidExpenses = expenses.filter((e) => e.payment_status === "pago").reduce((sum, e) => sum + Number(e.amount), 0);
  const pendingExpenses = expenses.filter((e) => e.payment_status === "pendente").reduce((sum, e) => sum + Number(e.amount), 0);
  const overdueExpenses = expenses.filter((e) => e.payment_status === "atrasado").reduce((sum, e) => sum + Number(e.amount), 0);

  // Group by category
  const byCategory = expenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + Number(e.amount);
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Despesas</h2>
        <div className="flex gap-2">
          <Input
            type="month"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="w-40"
          />
          <Button
            variant="outline"
            onClick={() => {
              if (confirm("Duplicar todas as despesas recorrentes do mês atual para o próximo período?")) {
                duplicateRecurringMutation.mutate();
              }
            }}
            disabled={duplicateRecurringMutation.isPending}
          >
            <Copy className="h-4 w-4 mr-2" />
            {duplicateRecurringMutation.isPending ? "Duplicando..." : "Duplicar Recorrentes"}
          </Button>
          <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) setEditingExpense(null); }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Nova Despesa</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingExpense ? "Editar Despesa" : "Nova Despesa"}</DialogTitle>
              </DialogHeader>
              <ExpenseForm
                expense={editingExpense}
                onSubmit={(data) => {
                  if (editingExpense) {
                    updateMutation.mutate({ id: editingExpense.id, ...data });
                  } else {
                    createMutation.mutate(data);
                  }
                }}
                isLoading={createMutation.isPending || updateMutation.isPending}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total do Mês</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrencyBRL(totalExpenses)}</div>
            <p className="text-xs text-muted-foreground">{expenses.length} despesas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pagas</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrencyBRL(paidExpenses)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{formatCurrencyBRL(pendingExpenses)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Atrasadas</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrencyBRL(overdueExpenses)}</div>
          </CardContent>
        </Card>
      </div>

      {/* By Category */}
      {Object.keys(byCategory).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 md:grid-cols-3">
              {Object.entries(byCategory)
                .sort((a, b) => b[1] - a[1])
                .map(([cat, value]) => (
                  <div key={cat} className="flex justify-between items-center p-2 bg-muted rounded">
                    <span className="text-sm">{CATEGORIES.find((c) => c.value === cat)?.label || cat}</span>
                    <span className="font-medium">{formatCurrencyBRL(value)}</span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Expenses Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">Carregando...</TableCell>
                </TableRow>
              ) : expenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhuma despesa no período
                  </TableCell>
                </TableRow>
              ) : (
                expenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{expense.description}</p>
                        {expense.supplier && (
                          <p className="text-xs text-muted-foreground">{expense.supplier}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {CATEGORIES.find((c) => c.value === expense.category)?.label || expense.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(parseISO(expense.expense_date), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      {expense.due_date
                        ? format(parseISO(expense.due_date), "dd/MM/yyyy", { locale: ptBR })
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrencyBRL(expense.amount)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          expense.payment_status === "pago"
                            ? "default"
                            : expense.payment_status === "atrasado"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {STATUS_OPTIONS.find((s) => s.value === expense.payment_status)?.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => { setEditingExpense(expense); setIsOpen(true); }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm("Remover esta despesa?")) {
                              deleteMutation.mutate(expense.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function ExpenseForm({
  expense,
  onSubmit,
  isLoading,
}: {
  expense: Expense | null;
  onSubmit: (data: ExpenseFormData) => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState<ExpenseFormData>({
    description: expense?.description || "",
    category: expense?.category || "outros",
    amount: expense?.amount || 0,
    expense_date: expense?.expense_date || format(new Date(), "yyyy-MM-dd"),
    due_date: expense?.due_date || "",
    payment_date: expense?.payment_date || "",
    payment_status: expense?.payment_status || "pendente",
    recurrence: expense?.recurrence || "unico",
    supplier: expense?.supplier || "",
    notes: expense?.notes || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Convert empty strings to null for nullable date fields
    const cleanedData = {
      ...formData,
      due_date: formData.due_date || null,
      payment_date: formData.payment_date || null,
      supplier: formData.supplier || null,
      notes: formData.notes || null,
      recurrence: formData.recurrence || null,
    };
    onSubmit(cleanedData as ExpenseFormData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="description">Descrição *</Label>
        <Input
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          required
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="category">Categoria</Label>
          <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="amount">Valor *</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="expense_date">Data da Despesa *</Label>
          <Input
            id="expense_date"
            type="date"
            value={formData.expense_date}
            onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="due_date">Vencimento</Label>
          <Input
            id="due_date"
            type="date"
            value={formData.due_date}
            onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="payment_status">Status</Label>
          <Select value={formData.payment_status} onValueChange={(v) => setFormData({ ...formData, payment_status: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="recurrence">Recorrência</Label>
          <Select value={formData.recurrence} onValueChange={(v) => setFormData({ ...formData, recurrence: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RECURRENCE_OPTIONS.map((r) => (
                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="supplier">Fornecedor</Label>
        <Input
          id="supplier"
          value={formData.supplier}
          onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Observações</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={2}
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Salvando..." : expense ? "Atualizar" : "Cadastrar"}
        </Button>
      </div>
    </form>
  );
}
