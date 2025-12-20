import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrencyBRL } from "@/lib/format";
import { format, parseISO, isBefore, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

import {
  Plus,
  Search,
  User,
  CreditCard,
  FileText,
  Calendar,
  HandCoins,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Link2,
} from "lucide-react";

type PaymentMethodType = "pix" | "boleto" | "transferencia" | "cartao" | "dinheiro" | "outros";
type InvoiceStatus = "aberto" | "parcial" | "pago" | "cancelado";
type InstallmentStatus = "aberto" | "pago" | "cancelado";

type Customer = {
  id: string;
  name: string;
  document: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
};

type PaymentMethod = {
  id: string;
  name: string;
  type: PaymentMethodType;
  is_active: boolean;
  created_at: string;
};

type Invoice = {
  id: string;
  customer_id: string;
  description: string;
  category: string | null;
  issue_date: string; // date
  total_amount: number;
  status: InvoiceStatus;
  order_id: string | null;
  default_payment_method_id: string | null;
  notes: string | null;
  created_at: string;
  ar_customers?: { name: string } | null;
};

type InstallmentView = {
  id: string;
  invoice_id: string;
  installment_no: number;
  due_date: string; // date
  amount: number;
  status: InstallmentStatus; // vem da view
  created_at: string;
  paid_amount: number;
  open_amount: number;
};

type Payment = {
  id: string;
  installment_id: string;
  received_at: string;
  amount: number;
  payment_method_id: string | null;
  reference: string | null;
  notes: string | null;
  ar_payment_methods?: { name: string } | null;
};

const PM_TYPE_LABEL: Record<PaymentMethodType, string> = {
  pix: "PIX",
  boleto: "Boleto",
  transferencia: "Transferência",
  cartao: "Cartão",
  dinheiro: "Dinheiro",
  outros: "Outros",
};

const safeNum = (v: any) => {
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

function monthKeyBR(isoDate: string) {
  try {
    const d = parseISO(isoDate);
    return format(d, "MMM/yyyy", { locale: ptBR });
  } catch {
    return isoDate;
  }
}

export const AdminContasReceberTab = () => {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [tab, setTab] = useState<"titulos" | "parcelas" | "clientes" | "metodos">("titulos");
  const [search, setSearch] = useState("");

  const [openCustomer, setOpenCustomer] = useState(false);
  const [openMethod, setOpenMethod] = useState(false);
  const [openInvoice, setOpenInvoice] = useState(false);
  const [openReceive, setOpenReceive] = useState<{ installment: InstallmentView; invoice: Invoice } | null>(null);

  const [customerForm, setCustomerForm] = useState({
    name: "",
    document: "",
    email: "",
    phone: "",
    notes: "",
  });

  const [methodForm, setMethodForm] = useState({
    name: "",
    type: "pix" as PaymentMethodType,
  });

  const [invoiceForm, setInvoiceForm] = useState({
    customer_id: "",
    description: "",
    category: "",
    issue_date: format(new Date(), "yyyy-MM-dd"),
    total_amount: "",
    order_id: "",
    default_payment_method_id: "none",
    notes: "",
    installments_count: 1,
    first_due_date: format(new Date(), "yyyy-MM-dd"),
    interval_days: 30,
  });

  const [receiveForm, setReceiveForm] = useState({
    amount: "",
    received_at: format(new Date(), "yyyy-MM-dd"),
    payment_method_id: "none",
    reference: "",
    notes: "",
  });

  // =========================
  // Queries
  // =========================
  const customersQ = useQuery({
    queryKey: ["ar-customers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ar_customers").select("*").order("name");
      if (error) throw error;
      return (data || []) as Customer[];
    },
  });

  const methodsQ = useQuery({
    queryKey: ["ar-methods"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ar_payment_methods").select("*").order("name");
      if (error) throw error;
      return (data || []) as PaymentMethod[];
    },
  });

  const invoicesQ = useQuery({
    queryKey: ["ar-invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ar_invoices")
        .select(`*, ar_customers(name)`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as Invoice[];
    },
  });

  const installmentsQ = useQuery({
    queryKey: ["ar-installments-view"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ar_installments_view").select("*").order("due_date", { ascending: true });
      if (error) throw error;
      return (data || []) as InstallmentView[];
    },
  });

  const paymentsQ = useQuery({
    queryKey: ["ar-payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ar_payments")
        .select(`*, ar_payment_methods(name)`)
        .order("received_at", { ascending: false });

      if (error) throw error;
      return (data || []) as Payment[];
    },
  });

  // Opcional: listar últimos pedidos (se existir tabela orders)
  const ordersQ = useQuery({
    queryKey: ["ar-orders-basic"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_number, total, created_at, payment_status")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) return [];
      return data || [];
    },
  });

  const customers = customersQ.data || [];
  const methods = methodsQ.data || [];
  const invoices = invoicesQ.data || [];
  const installments = installmentsQ.data || [];
  const payments = paymentsQ.data || [];
  const orders = ordersQ.data || [];

  const invoiceById = useMemo(() => {
    const m = new Map<string, Invoice>();
    invoices.forEach((i) => m.set(i.id, i));
    return m;
  }, [invoices]);

  const installmentsByInvoice = useMemo(() => {
    const m = new Map<string, InstallmentView[]>();
    installments.forEach((i) => {
      const arr = m.get(i.invoice_id) || [];
      arr.push(i);
      m.set(i.invoice_id, arr);
    });
    return m;
  }, [installments]);

  const refreshAll = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["ar-customers"] }),
      qc.invalidateQueries({ queryKey: ["ar-methods"] }),
      qc.invalidateQueries({ queryKey: ["ar-invoices"] }),
      qc.invalidateQueries({ queryKey: ["ar-installments-view"] }),
      qc.invalidateQueries({ queryKey: ["ar-payments"] }),
      qc.invalidateQueries({ queryKey: ["ar-orders-basic"] }),
    ]);
  };

  // =========================
  // KPI
  // =========================
  const kpi = useMemo(() => {
    const open = installments.reduce((sum, it) => sum + safeNum(it.open_amount), 0);
    const received = installments.reduce((sum, it) => sum + safeNum(it.paid_amount), 0);
    const overdue = installments
      .filter((it) => it.status !== "cancelado")
      .filter((it) => safeNum(it.open_amount) > 0)
      .filter((it) => isBefore(parseISO(it.due_date), startOfDay(new Date())))
      .reduce((sum, it) => sum + safeNum(it.open_amount), 0);

    return { open, received, overdue };
  }, [installments]);

  // =========================
  // Filters
  // =========================
  const invoicesFiltered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return invoices;
    return invoices.filter((i) => {
      const cust = i.ar_customers?.name?.toLowerCase() || "";
      return (
        cust.includes(s) ||
        i.description.toLowerCase().includes(s) ||
        (i.category || "").toLowerCase().includes(s) ||
        String(i.status).toLowerCase().includes(s)
      );
    });
  }, [invoices, search]);

  const installmentsFiltered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return installments;
    return installments.filter((it) => {
      const inv = invoiceById.get(it.invoice_id);
      const cust = inv?.ar_customers?.name?.toLowerCase() || "";
      const desc = inv?.description?.toLowerCase() || "";
      return cust.includes(s) || desc.includes(s) || String(it.installment_no).includes(s);
    });
  }, [installments, search, invoiceById]);

  // =========================
  // Helpers (RPC)
  // =========================
  const setInvoiceStatus = async (invoiceId: string, status: InvoiceStatus) => {
    const { error } = await supabase.rpc("ar_set_invoice_status_text", {
      p_invoice_id: invoiceId,
      p_status: status,
    });
    if (error) throw error;
  };

  const recomputeInvoiceStatus = async (invoiceId: string) => {
    const inst = (installmentsByInvoice.get(invoiceId) || []).filter((i) => i.status !== "cancelado");
    const open = inst.reduce((s, i) => s + safeNum(i.open_amount), 0);
    const received = inst.reduce((s, i) => s + safeNum(i.paid_amount), 0);

    let status: InvoiceStatus = "aberto";
    if (open <= 0 && inst.length > 0) status = "pago";
    else if (received > 0 && open > 0) status = "parcial";

    try {
      await setInvoiceStatus(invoiceId, status);
    } catch (e: any) {
      toast({
        title: "Erro",
        description: e?.message || "Falha ao atualizar status do título.",
        variant: "destructive",
      });
    }
  };

  // =========================
  // Actions
  // =========================
  const createCustomer = async () => {
    if (!customerForm.name.trim()) {
      toast({ title: "Erro", description: "Nome do cliente é obrigatório.", variant: "destructive" });
      return;
    }

    const { error } = await supabase.from("ar_customers").insert({
      name: customerForm.name.trim(),
      document: customerForm.document.trim() || null,
      email: customerForm.email.trim() || null,
      phone: customerForm.phone.trim() || null,
      notes: customerForm.notes.trim() || null,
    });

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Cliente criado" });
    setCustomerForm({ name: "", document: "", email: "", phone: "", notes: "" });
    setOpenCustomer(false);
    await refreshAll();
  };

  const createPaymentMethod = async () => {
    if (!methodForm.name.trim()) {
      toast({ title: "Erro", description: "Nome do método é obrigatório.", variant: "destructive" });
      return;
    }

    const { error } = await supabase.from("ar_payment_methods").insert({
      name: methodForm.name.trim(),
      type: methodForm.type,
    });

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Forma criada" });
    setMethodForm({ name: "", type: "pix" });
    setOpenMethod(false);
    await refreshAll();
  };

  const createInvoiceWithInstallments = async () => {
    const customerId = invoiceForm.customer_id;
    const total = safeNum(invoiceForm.total_amount);
    const count = Math.max(1, Math.floor(safeNum(invoiceForm.installments_count)));
    const interval = Math.max(1, Math.floor(safeNum(invoiceForm.interval_days)));

    if (!customerId) return toast({ title: "Erro", description: "Selecione um cliente.", variant: "destructive" });
    if (!invoiceForm.description.trim()) return toast({ title: "Erro", description: "Descrição é obrigatória.", variant: "destructive" });
    if (total <= 0) return toast({ title: "Erro", description: "Valor total precisa ser maior que 0.", variant: "destructive" });
    if (!invoiceForm.first_due_date) return toast({ title: "Erro", description: "Informe o primeiro vencimento.", variant: "destructive" });

    const pmId = invoiceForm.default_payment_method_id === "none" ? null : invoiceForm.default_payment_method_id;
    const orderId = invoiceForm.order_id.trim() ? invoiceForm.order_id.trim() : null;

    const { data: invData, error: invErr } = await supabase
      .from("ar_invoices")
      .insert({
        customer_id: customerId,
        description: invoiceForm.description.trim(),
        category: invoiceForm.category.trim() || null,
        issue_date: invoiceForm.issue_date,
        total_amount: total,
        order_id: orderId,
        default_payment_method_id: pmId,
        notes: invoiceForm.notes.trim() || null,
        // status fica no default do banco
      })
      .select("*")
      .single();

    if (invErr || !invData?.id) {
      toast({ title: "Erro", description: invErr?.message || "Falha ao criar título.", variant: "destructive" });
      return;
    }

    const invoiceId = String(invData.id);

    const base = total / count;
    const installmentsPayload = Array.from({ length: count }).map((_, idx) => {
      const no = idx + 1;
      const due = new Date(invoiceForm.first_due_date + "T00:00:00");
      due.setDate(due.getDate() + interval * idx);
      const amount = idx === count - 1 ? total - base * (count - 1) : base;

      return {
        invoice_id: invoiceId,
        installment_no: no,
        due_date: format(due, "yyyy-MM-dd"),
        amount: Number(amount.toFixed(2)),
        status: "aberto",
      };
    });

    const { error: instErr } = await supabase.from("ar_installments").insert(installmentsPayload);

    if (instErr) {
      toast({ title: "Erro", description: `Título criado, mas falhou ao gerar parcelas: ${instErr.message}`, variant: "destructive" });
      return;
    }

    toast({ title: "Título criado", description: `${count} parcela(s) gerada(s).` });

    setOpenInvoice(false);
    setInvoiceForm({
      customer_id: "",
      description: "",
      category: "",
      issue_date: format(new Date(), "yyyy-MM-dd"),
      total_amount: "",
      order_id: "",
      default_payment_method_id: "none",
      notes: "",
      installments_count: 1,
      first_due_date: format(new Date(), "yyyy-MM-dd"),
      interval_days: 30,
    });

    await refreshAll();
    await recomputeInvoiceStatus(invoiceId);
    await refreshAll();
  };

  const receiveInstallment = async () => {
    if (!openReceive) return;

    const amount = safeNum(receiveForm.amount);
    const pmId = receiveForm.payment_method_id === "none" ? null : receiveForm.payment_method_id;

    if (amount <= 0) {
      toast({ title: "Erro", description: "Valor do recebimento precisa ser maior que 0.", variant: "destructive" });
      return;
    }

    const { error } = await supabase.from("ar_payments").insert({
      installment_id: openReceive.installment.id,
      amount: Number(amount.toFixed(2)),
      received_at: receiveForm.received_at
        ? new Date(receiveForm.received_at + "T12:00:00").toISOString()
        : new Date().toISOString(),
      payment_method_id: pmId,
      reference: receiveForm.reference.trim() || null,
      notes: receiveForm.notes.trim() || null,
    });

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Recebimento registrado" });

    const invId = openReceive.invoice.id;
    setOpenReceive(null);
    setReceiveForm({
      amount: "",
      received_at: format(new Date(), "yyyy-MM-dd"),
      payment_method_id: "none",
      reference: "",
      notes: "",
    });

    await refreshAll();
    await recomputeInvoiceStatus(invId);
    await refreshAll();
  };

  const cancelInvoice = async (inv: Invoice) => {
    try {
      await setInvoiceStatus(inv.id, "cancelado");
    } catch (e: any) {
      toast({ title: "Erro", description: e?.message || "Falha ao cancelar título.", variant: "destructive" });
      return;
    }

    const { error: instErr } = await supabase
      .from("ar_installments")
      .update({ status: "cancelado" })
      .eq("invoice_id", inv.id);

    if (instErr) {
      toast({ title: "Erro", description: instErr.message, variant: "destructive" });
      return;
    }

    toast({ title: "Cancelado", description: "Título e parcelas cancelados." });
    await refreshAll();
  };

  const deleteInvoice = async (inv: Invoice) => {
    const { error } = await supabase.from("ar_invoices").delete().eq("id", inv.id);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Excluído", description: "Título removido." });
    await refreshAll();
  };

  const invoiceStatusBadge = (status: InvoiceStatus) => {
    if (status === "pago")
      return (
        <Badge className="gap-1">
          <CheckCircle2 className="h-3 w-3" /> Pago
        </Badge>
      );
    if (status === "parcial") return <Badge variant="secondary">Parcial</Badge>;
    if (status === "cancelado") return <Badge variant="destructive">Cancelado</Badge>;
    return <Badge variant="outline">Aberto</Badge>;
  };

  const installmentBadge = (it: InstallmentView) => {
    if (it.status === "cancelado") return <Badge variant="destructive">Cancelado</Badge>;

    const open = safeNum(it.open_amount);
    if (open <= 0)
      return (
        <Badge className="gap-1">
          <CheckCircle2 className="h-3 w-3" /> Pago
        </Badge>
      );

    const overdue = isBefore(parseISO(it.due_date), startOfDay(new Date()));
    if (overdue)
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="h-3 w-3" /> Atrasado
        </Badge>
      );

    return <Badge variant="outline">Aberto</Badge>;
  };

  const loading =
    customersQ.isLoading ||
    methodsQ.isLoading ||
    invoicesQ.isLoading ||
    installmentsQ.isLoading ||
    paymentsQ.isLoading;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div>
          <h2 className="font-title text-xl">Contas a Receber</h2>
          <p className="text-sm text-muted-foreground">Clientes, títulos, parcelas e recebimentos (com parcial).</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Novo Cliente */}
          <Dialog open={openCustomer} onOpenChange={setOpenCustomer}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <User className="h-4 w-4" /> Cliente
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Novo cliente</DialogTitle></DialogHeader>

              <div className="space-y-3">
                <div>
                  <Label>Nome *</Label>
                  <Input value={customerForm.name} onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })} />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>CPF/CNPJ</Label>
                    <Input value={customerForm.document} onChange={(e) => setCustomerForm({ ...customerForm, document: e.target.value })} />
                  </div>
                  <div>
                    <Label>Telefone</Label>
                    <Input value={customerForm.phone} onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })} />
                  </div>
                </div>

                <div>
                  <Label>E-mail</Label>
                  <Input value={customerForm.email} onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })} />
                </div>

                <div>
                  <Label>Observações</Label>
                  <Textarea value={customerForm.notes} onChange={(e) => setCustomerForm({ ...customerForm, notes: e.target.value })} rows={3} />
                </div>

                <Button onClick={createCustomer} className="w-full">
                  <Plus className="h-4 w-4 mr-2" /> Salvar cliente
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Nova forma */}
          <Dialog open={openMethod} onOpenChange={setOpenMethod}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <CreditCard className="h-4 w-4" /> Forma
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Nova forma de recebimento</DialogTitle></DialogHeader>

              <div className="space-y-3">
                <div>
                  <Label>Nome *</Label>
                  <Input value={methodForm.name} onChange={(e) => setMethodForm({ ...methodForm, name: e.target.value })} />
                </div>

                <div>
                  <Label>Tipo</Label>
                  <Select value={methodForm.type} onValueChange={(v) => setMethodForm({ ...methodForm, type: v as PaymentMethodType })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.keys(PM_TYPE_LABEL).map((k) => (
                        <SelectItem key={k} value={k}>{PM_TYPE_LABEL[k as PaymentMethodType]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={createPaymentMethod} className="w-full">
                  <Plus className="h-4 w-4 mr-2" /> Salvar forma
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Novo título */}
          <Dialog open={openInvoice} onOpenChange={setOpenInvoice}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" /> Novo título
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Novo título a receber</DialogTitle></DialogHeader>

              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <Label>Cliente *</Label>
                    <Select value={invoiceForm.customer_id} onValueChange={(v) => setInvoiceForm({ ...invoiceForm, customer_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {customers.filter((c) => c.is_active).map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Categoria</Label>
                    <Input value={invoiceForm.category} onChange={(e) => setInvoiceForm({ ...invoiceForm, category: e.target.value })} placeholder="Ex: Loja, Encomenda..." />
                  </div>
                </div>

                <div>
                  <Label>Descrição *</Label>
                  <Input value={invoiceForm.description} onChange={(e) => setInvoiceForm({ ...invoiceForm, description: e.target.value })} placeholder="Ex: Pedido #1024, encomenda..." />
                </div>

                <div className="grid md:grid-cols-3 gap-3">
                  <div>
                    <Label>Emissão</Label>
                    <Input type="date" value={invoiceForm.issue_date} onChange={(e) => setInvoiceForm({ ...invoiceForm, issue_date: e.target.value })} />
                  </div>

                  <div>
                    <Label>Valor Total *</Label>
                    <Input type="number" step="0.01" value={invoiceForm.total_amount} onChange={(e) => setInvoiceForm({ ...invoiceForm, total_amount: e.target.value })} />
                  </div>

                  <div>
                    <Label>Forma padrão</Label>
                    <Select value={invoiceForm.default_payment_method_id} onValueChange={(v) => setInvoiceForm({ ...invoiceForm, default_payment_method_id: v })}>
                      <SelectTrigger><SelectValue placeholder="(opcional)" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">(sem)</SelectItem>
                        {methods.filter((m) => m.is_active).map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.name} ({PM_TYPE_LABEL[m.type]})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Calendar className="h-4 w-4" /> Parcelamento
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid md:grid-cols-3 gap-3">
                    <div>
                      <Label>Nº parcelas</Label>
                      <Input
                        type="number"
                        min={1}
                        value={invoiceForm.installments_count}
                        onChange={(e) => setInvoiceForm({ ...invoiceForm, installments_count: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <Label>1º vencimento</Label>
                      <Input type="date" value={invoiceForm.first_due_date} onChange={(e) => setInvoiceForm({ ...invoiceForm, first_due_date: e.target.value })} />
                    </div>
                    <div>
                      <Label>Intervalo (dias)</Label>
                      <Input type="number" min={1} value={invoiceForm.interval_days} onChange={(e) => setInvoiceForm({ ...invoiceForm, interval_days: Number(e.target.value) })} />
                      <p className="text-xs text-muted-foreground mt-1">30 = mensal | 7 = semanal</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Link2 className="h-4 w-4" /> Vincular pedido (opcional)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Label>ID do pedido (order_id)</Label>
                    <Input value={invoiceForm.order_id} onChange={(e) => setInvoiceForm({ ...invoiceForm, order_id: e.target.value })} placeholder="Cole o UUID do pedido (opcional)" />

                    {orders.length > 0 && (
                      <div className="text-xs text-muted-foreground">
                        Dica: últimos pedidos (para copiar o id):
                        <div className="mt-2 max-h-32 overflow-y-auto space-y-1">
                          {orders.map((o: any) => (
                            <div key={o.id} className="flex justify-between gap-2 p-2 rounded bg-muted/50">
                              <span>
                                #{o.order_number ?? "?"} • {formatCurrencyBRL(safeNum(o.total))} • {o.payment_status ?? "-"}
                              </span>
                              <span className="font-mono">{String(o.id).slice(0, 8)}…</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div>
                  <Label>Observações</Label>
                  <Textarea value={invoiceForm.notes} onChange={(e) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })} rows={3} />
                </div>

                <Button onClick={createInvoiceWithInstallments} className="w-full">
                  <FileText className="h-4 w-4 mr-2" /> Criar título e gerar parcelas
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">A receber (saldo)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrencyBRL(kpi.open)}</div>
            <p className="text-xs text-muted-foreground">Soma do saldo das parcelas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Recebido (total)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrencyBRL(kpi.received)}</div>
            <p className="text-xs text-muted-foreground">Soma dos recebimentos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Atrasado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{formatCurrencyBRL(kpi.overdue)}</div>
            <p className="text-xs text-muted-foreground">Parcelas vencidas com saldo</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por cliente, descrição, categoria..." className="pl-10" />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="space-y-3">
        <TabsList>
          <TabsTrigger value="titulos">Títulos</TabsTrigger>
          <TabsTrigger value="parcelas">Parcelas</TabsTrigger>
          <TabsTrigger value="clientes">Clientes</TabsTrigger>
          <TabsTrigger value="metodos">Formas</TabsTrigger>
        </TabsList>

        {/* TÍTULOS */}
        <TabsContent value="titulos">
          <Card>
            <CardHeader><CardTitle>Títulos ({invoicesFiltered.length})</CardTitle></CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground text-center py-6">Carregando...</p>
              ) : invoicesFiltered.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Nenhum título encontrado.</p>
              ) : (
                <div className="space-y-3">
                  {invoicesFiltered.map((inv) => {
                    const inst = installmentsByInvoice.get(inv.id) || [];
                    const open = inst.reduce((s, i) => s + safeNum(i.open_amount), 0);
                    const received = inst.reduce((s, i) => s + safeNum(i.paid_amount), 0);

                    return (
                      <div key={inv.id} className="p-4 rounded-lg bg-muted/50">
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium">{inv.ar_customers?.name}</p>
                              {invoiceStatusBadge(inv.status)}
                              {inv.category && <Badge variant="outline">{inv.category}</Badge>}
                              {inv.order_id && (
                                <Badge variant="secondary" className="gap-1">
                                  <Link2 className="h-3 w-3" /> Pedido
                                </Badge>
                              )}
                            </div>

                            <p className="text-sm">{inv.description}</p>

                            <p className="text-xs text-muted-foreground">
                              Emissão: {monthKeyBR(inv.issue_date)} • Total:{" "}
                              <strong>{formatCurrencyBRL(safeNum(inv.total_amount))}</strong> • Recebido:{" "}
                              <strong className="text-green-600">{formatCurrencyBRL(received)}</strong> • Aberto:{" "}
                              <strong className={open > 0 ? "text-destructive" : "text-green-600"}>{formatCurrencyBRL(open)}</strong>
                            </p>

                            {inv.notes && <p className="text-xs text-muted-foreground italic">{inv.notes}</p>}
                          </div>

                          <div className="flex flex-wrap gap-2 justify-end">
                            <Button variant="outline" onClick={() => cancelInvoice(inv)} disabled={inv.status === "cancelado"}>
                              Cancelar
                            </Button>
                            <Button variant="destructive" onClick={() => deleteInvoice(inv)}>
                              <Trash2 className="h-4 w-4 mr-2" /> Excluir
                            </Button>
                          </div>
                        </div>

                        {inst.length > 0 && (
                          <div className="mt-3 grid gap-2 md:grid-cols-2">
                            {inst
                              .slice()
                              .sort((a, b) => a.installment_no - b.installment_no)
                              .map((it) => {
                                const openAmt = safeNum(it.open_amount);
                                const overdue =
                                  it.status !== "cancelado" &&
                                  openAmt > 0 &&
                                  isBefore(parseISO(it.due_date), startOfDay(new Date()));

                                return (
                                  <div
                                    key={it.id}
                                    className={`p-3 rounded-lg border ${
                                      overdue ? "border-destructive/40 bg-destructive/5" : "border-border bg-background"
                                    }`}
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div>
                                        <p className="text-sm font-medium">
                                          Parcela {it.installment_no} • Venc:{" "}
                                          {format(parseISO(it.due_date), "dd/MM/yyyy", { locale: ptBR })}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                          Valor: {formatCurrencyBRL(safeNum(it.amount))} • Recebido:{" "}
                                          <span className="text-green-600">{formatCurrencyBRL(safeNum(it.paid_amount))}</span> •
                                          Aberto:{" "}
                                          <span className={openAmt > 0 ? "text-destructive" : "text-green-600"}>
                                            {formatCurrencyBRL(openAmt)}
                                          </span>
                                        </p>
                                      </div>

                                      <div className="flex flex-col items-end gap-2">
                                        {installmentBadge(it)}
                                        <Button
                                          size="sm"
                                          className="gap-2"
                                          onClick={() => {
                                            setOpenReceive({ installment: it, invoice: inv });
                                            setReceiveForm({
                                              amount: openAmt > 0 ? openAmt.toFixed(2) : "",
                                              received_at: format(new Date(), "yyyy-MM-dd"),
                                              payment_method_id: (inv.default_payment_method_id || "none") as any,
                                              reference: "",
                                              notes: "",
                                            });
                                          }}
                                          disabled={it.status === "cancelado" || openAmt <= 0}
                                        >
                                          <HandCoins className="h-4 w-4" /> Receber
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* PARCELAS */}
        <TabsContent value="parcelas">
          <Card>
            <CardHeader><CardTitle>Parcelas ({installmentsFiltered.length})</CardTitle></CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground text-center py-6">Carregando...</p>
              ) : installmentsFiltered.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Nenhuma parcela encontrada.</p>
              ) : (
                <div className="space-y-2">
                  {installmentsFiltered.map((it) => {
                    const inv = invoiceById.get(it.invoice_id);
                    const openAmt = safeNum(it.open_amount);
                    const overdue =
                      it.status !== "cancelado" &&
                      openAmt > 0 &&
                      isBefore(parseISO(it.due_date), startOfDay(new Date()));

                    return (
                      <div
                        key={it.id}
                        className={`p-3 rounded-lg ${
                          overdue ? "bg-destructive/5 border border-destructive/20" : "bg-muted/50"
                        }`}
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                          <div>
                            <p className="font-medium">{inv?.ar_customers?.name} • {inv?.description}</p>
                            <p className="text-xs text-muted-foreground">
                              Parcela {it.installment_no} • Venc:{" "}
                              {format(parseISO(it.due_date), "dd/MM/yyyy", { locale: ptBR })} •
                              Valor: {formatCurrencyBRL(safeNum(it.amount))} • Aberto:{" "}
                              <span className={openAmt > 0 ? "text-destructive" : "text-green-600"}>
                                {formatCurrencyBRL(openAmt)}
                              </span>
                            </p>
                          </div>

                          <div className="flex items-center gap-2 justify-end">
                            {installmentBadge(it)}
                            <Button
                              size="sm"
                              onClick={() => {
                                if (!inv) return;
                                setOpenReceive({ installment: it, invoice: inv });
                                setReceiveForm({
                                  amount: openAmt > 0 ? openAmt.toFixed(2) : "",
                                  received_at: format(new Date(), "yyyy-MM-dd"),
                                  payment_method_id: (inv.default_payment_method_id || "none") as any,
                                  reference: "",
                                  notes: "",
                                });
                              }}
                              disabled={it.status === "cancelado" || openAmt <= 0 || !inv}
                            >
                              <HandCoins className="h-4 w-4 mr-2" /> Receber
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* CLIENTES */}
        <TabsContent value="clientes">
          <Card>
            <CardHeader><CardTitle>Clientes ({customers.length})</CardTitle></CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground text-center py-6">Carregando...</p>
              ) : customers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Nenhum cliente cadastrado.</p>
              ) : (
                <div className="space-y-2">
                  {customers.map((c) => (
                    <div key={c.id} className="p-3 rounded-lg bg-muted/50 flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{c.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {c.document ? `Doc: ${c.document} • ` : ""}
                          {c.email ? `Email: ${c.email} • ` : ""}
                          {c.phone ? `Tel: ${c.phone}` : ""}
                        </p>
                        {c.notes && <p className="text-xs text-muted-foreground italic mt-1">{c.notes}</p>}
                      </div>
                      <Badge variant={c.is_active ? "outline" : "destructive"}>{c.is_active ? "Ativo" : "Inativo"}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* FORMAS */}
        <TabsContent value="metodos">
          <Card>
            <CardHeader><CardTitle>Formas de recebimento ({methods.length})</CardTitle></CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground text-center py-6">Carregando...</p>
              ) : methods.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Nenhuma forma cadastrada.</p>
              ) : (
                <div className="space-y-2">
                  {methods.map((m) => (
                    <div key={m.id} className="p-3 rounded-lg bg-muted/50 flex items-center justify-between">
                      <div>
                        <p className="font-medium">{m.name}</p>
                        <p className="text-xs text-muted-foreground">{PM_TYPE_LABEL[m.type]}</p>
                      </div>
                      <Badge variant={m.is_active ? "outline" : "destructive"}>{m.is_active ? "Ativo" : "Inativo"}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog: receber parcela */}
      <Dialog open={!!openReceive} onOpenChange={(v) => !v && setOpenReceive(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Registrar recebimento</DialogTitle></DialogHeader>

          {openReceive && (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="font-medium">{openReceive.invoice.ar_customers?.name}</p>
                <p className="text-sm">{openReceive.invoice.description}</p>
                <p className="text-xs text-muted-foreground">
                  Parcela {openReceive.installment.installment_no} • Venc:{" "}
                  {format(parseISO(openReceive.installment.due_date), "dd/MM/yyyy", { locale: ptBR })}
                </p>
                <p className="text-xs mt-1">
                  Aberto:{" "}
                  <strong className="text-destructive">
                    {formatCurrencyBRL(safeNum(openReceive.installment.open_amount))}
                  </strong>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Valor recebido *</Label>
                  <Input type="number" step="0.01" value={receiveForm.amount} onChange={(e) => setReceiveForm({ ...receiveForm, amount: e.target.value })} />
                </div>
                <div>
                  <Label>Data</Label>
                  <Input type="date" value={receiveForm.received_at} onChange={(e) => setReceiveForm({ ...receiveForm, received_at: e.target.value })} />
                </div>
              </div>

              <div>
                <Label>Forma de recebimento</Label>
                <Select value={receiveForm.payment_method_id} onValueChange={(v) => setReceiveForm({ ...receiveForm, payment_method_id: v })}>
                  <SelectTrigger><SelectValue placeholder="(opcional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">(sem)</SelectItem>
                    {methods.filter((m) => m.is_active).map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name} ({PM_TYPE_LABEL[m.type]})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Referência</Label>
                <Input value={receiveForm.reference} onChange={(e) => setReceiveForm({ ...receiveForm, reference: e.target.value })} placeholder="Ex: comprovante, num boleto..." />
              </div>

              <div>
                <Label>Observações</Label>
                <Textarea value={receiveForm.notes} onChange={(e) => setReceiveForm({ ...receiveForm, notes: e.target.value })} rows={3} />
              </div>

              <Button onClick={receiveInstallment} className="w-full">
                <HandCoins className="h-4 w-4 mr-2" /> Confirmar recebimento
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
