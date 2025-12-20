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
  Building2,
  CreditCard,
  FileText,
  Calendar,
  HandCoins,
  Trash2,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

type PaymentMethodType = "pix" | "boleto" | "transferencia" | "cartao" | "dinheiro" | "outros";
type BillStatus = "aberto" | "parcial" | "pago" | "cancelado";
type InstallmentStatus = "aberto" | "pago" | "cancelado";

type Vendor = {
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

type Bill = {
  id: string;
  vendor_id: string;
  description: string;
  category: string | null;
  issue_date: string; // date
  total_amount: string; // numeric string do supabase
  status: BillStatus;
  default_payment_method_id: string | null;
  notes: string | null;
  created_at: string;
  ap_vendors?: { name: string } | null;
  ap_payment_methods?: { name: string } | null;
};

type InstallmentView = {
  id: string;
  bill_id: string;
  installment_no: number;
  due_date: string; // date
  amount: string; // numeric
  status: InstallmentStatus;
  created_at: string;
  paid_amount: string; // numeric
  open_amount: string; // numeric
};

type Payment = {
  id: string;
  installment_id: string;
  paid_at: string;
  amount: string;
  payment_method_id: string | null;
  reference: string | null;
  notes: string | null;
  ap_payment_methods?: { name: string } | null;
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
  // isoDate pode ser 'yyyy-mm-dd'
  try {
    const d = parseISO(isoDate);
    return format(d, "MMM/yyyy", { locale: ptBR });
  } catch {
    return isoDate;
  }
}

export const AdminContasPagarTab = () => {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [tab, setTab] = useState<"titulos" | "parcelas" | "fornecedores" | "pagamento">("titulos");
  const [search, setSearch] = useState("");

  // Dialogs
  const [openVendor, setOpenVendor] = useState(false);
  const [openMethod, setOpenMethod] = useState(false);
  const [openBill, setOpenBill] = useState(false);
  const [openPay, setOpenPay] = useState<{ installment: InstallmentView; bill: Bill } | null>(null);

  // Forms
  const [vendorForm, setVendorForm] = useState({ name: "", document: "", email: "", phone: "", notes: "" });
  const [methodForm, setMethodForm] = useState({ name: "", type: "pix" as PaymentMethodType });

  const [billForm, setBillForm] = useState({
    vendor_id: "",
    description: "",
    category: "",
    issue_date: format(new Date(), "yyyy-MM-dd"),
    total_amount: "",
    default_payment_method_id: "none",
    notes: "",

    // parcelas
    installments_count: 1,
    first_due_date: format(new Date(), "yyyy-MM-dd"),
    interval_days: 30, // 30 = mensal
  });

  const [payForm, setPayForm] = useState({
    amount: "",
    paid_at: format(new Date(), "yyyy-MM-dd"),
    payment_method_id: "none",
    reference: "",
    notes: "",
  });

  // Queries
  const vendorsQ = useQuery({
    queryKey: ["ap-vendors"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ap_vendors").select("*").order("name");
      if (error) throw error;
      return (data || []) as Vendor[];
    },
  });

  const methodsQ = useQuery({
    queryKey: ["ap-methods"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ap_payment_methods").select("*").order("name");
      if (error) throw error;
      return (data || []) as PaymentMethod[];
    },
  });

  const billsQ = useQuery({
    queryKey: ["ap-bills"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ap_bills")
        .select(`
          *,
          ap_vendors(name),
          ap_payment_methods(name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as Bill[];
    },
  });

  const installmentsQ = useQuery({
    queryKey: ["ap-installments-view"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ap_installments_view")
        .select("*")
        .order("due_date", { ascending: true });

      if (error) throw error;
      return (data || []) as InstallmentView[];
    },
  });

  const paymentsQ = useQuery({
    queryKey: ["ap-payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ap_payments")
        .select(`
          *,
          ap_payment_methods(name)
        `)
        .order("paid_at", { ascending: false });

      if (error) throw error;
      return (data || []) as Payment[];
    },
  });

  const vendors = vendorsQ.data || [];
  const methods = methodsQ.data || [];
  const bills = billsQ.data || [];
  const installments = installmentsQ.data || [];
  const payments = paymentsQ.data || [];

  // Derived maps
  const billById = useMemo(() => {
    const m = new Map<string, Bill>();
    bills.forEach((b) => m.set(b.id, b));
    return m;
  }, [bills]);

  const installmentsByBill = useMemo(() => {
    const m = new Map<string, InstallmentView[]>();
    installments.forEach((i) => {
      const arr = m.get(i.bill_id) || [];
      arr.push(i);
      m.set(i.bill_id, arr);
    });
    return m;
  }, [installments]);

  // KPIs
  const kpi = useMemo(() => {
    const open = installments.reduce((sum, it) => sum + safeNum(it.open_amount), 0);
    const paid = installments.reduce((sum, it) => sum + safeNum(it.paid_amount), 0);
    const overdue = installments
      .filter((it) => it.status !== "cancelado")
      .filter((it) => safeNum(it.open_amount) > 0)
      .filter((it) => isBefore(parseISO(it.due_date), startOfDay(new Date())))
      .reduce((sum, it) => sum + safeNum(it.open_amount), 0);

    return { open, paid, overdue };
  }, [installments]);

  // Filters
  const billsFiltered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return bills;
    return bills.filter((b) => {
      const vendor = b.ap_vendors?.name?.toLowerCase() || "";
      return (
        vendor.includes(s) ||
        b.description.toLowerCase().includes(s) ||
        (b.category || "").toLowerCase().includes(s) ||
        b.status.toLowerCase().includes(s)
      );
    });
  }, [bills, search]);

  const installmentsFiltered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return installments;
    return installments.filter((i) => {
      const bill = billById.get(i.bill_id);
      const vendor = bill?.ap_vendors?.name?.toLowerCase() || "";
      const desc = bill?.description?.toLowerCase() || "";
      return vendor.includes(s) || desc.includes(s) || String(i.installment_no).includes(s);
    });
  }, [installments, search, billById]);

  // =========================
  // Actions
  // =========================
  const refreshAll = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["ap-vendors"] }),
      qc.invalidateQueries({ queryKey: ["ap-methods"] }),
      qc.invalidateQueries({ queryKey: ["ap-bills"] }),
      qc.invalidateQueries({ queryKey: ["ap-installments-view"] }),
      qc.invalidateQueries({ queryKey: ["ap-payments"] }),
    ]);
  };

  const createVendor = async () => {
    if (!vendorForm.name.trim()) {
      toast({ title: "Erro", description: "Nome do fornecedor é obrigatório.", variant: "destructive" });
      return;
    }

    const { error } = await supabase.from("ap_vendors").insert({
      name: vendorForm.name.trim(),
      document: vendorForm.document.trim() || null,
      email: vendorForm.email.trim() || null,
      phone: vendorForm.phone.trim() || null,
      notes: vendorForm.notes.trim() || null,
    });

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Fornecedor criado" });
    setVendorForm({ name: "", document: "", email: "", phone: "", notes: "" });
    setOpenVendor(false);
    refreshAll();
  };

  const createPaymentMethod = async () => {
    if (!methodForm.name.trim()) {
      toast({ title: "Erro", description: "Nome da forma de pagamento é obrigatório.", variant: "destructive" });
      return;
    }

    const { error } = await supabase.from("ap_payment_methods").insert({
      name: methodForm.name.trim(),
      type: methodForm.type,
    });

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Forma de pagamento criada" });
    setMethodForm({ name: "", type: "pix" });
    setOpenMethod(false);
    refreshAll();
  };

  const createBillWithInstallments = async () => {
    const vendorId = billForm.vendor_id;
    const total = safeNum(billForm.total_amount);
    const count = Math.max(1, Math.floor(safeNum(billForm.installments_count)));
    const interval = Math.max(1, Math.floor(safeNum(billForm.interval_days)));

    if (!vendorId) {
      toast({ title: "Erro", description: "Selecione um fornecedor.", variant: "destructive" });
      return;
    }
    if (!billForm.description.trim()) {
      toast({ title: "Erro", description: "Descrição é obrigatória.", variant: "destructive" });
      return;
    }
    if (total <= 0) {
      toast({ title: "Erro", description: "Valor total precisa ser maior que 0.", variant: "destructive" });
      return;
    }
    if (!billForm.first_due_date) {
      toast({ title: "Erro", description: "Informe o primeiro vencimento.", variant: "destructive" });
      return;
    }

    const pmId = billForm.default_payment_method_id === "none" ? null : billForm.default_payment_method_id;

    // 1) cria o título
    const { data: bill, error: billErr } = await supabase
      .from("ap_bills")
      .insert({
        vendor_id: vendorId,
        description: billForm.description.trim(),
        category: billForm.category.trim() || null,
        issue_date: billForm.issue_date,
        total_amount: total,
        status: "aberto",
        default_payment_method_id: pmId,
        notes: billForm.notes.trim() || null,
      })
      .select("*")
      .single();

    if (billErr || !bill) {
      toast({ title: "Erro", description: billErr?.message || "Falha ao criar título.", variant: "destructive" });
      return;
    }

    // 2) cria parcelas
    const base = total / count;
    // para evitar diferença de centavos, ajusta a última parcela
    const installmentsPayload = Array.from({ length: count }).map((_, idx) => {
      const no = idx + 1;
      const due = new Date(billForm.first_due_date + "T00:00:00");
      due.setDate(due.getDate() + interval * idx);

      const amount = idx === count - 1 ? total - base * (count - 1) : base;

      return {
        bill_id: bill.id,
        installment_no: no,
        due_date: format(due, "yyyy-MM-dd"),
        amount: Number(amount.toFixed(2)),
        status: "aberto" as InstallmentStatus,
      };
    });

    const { error: instErr } = await supabase.from("ap_installments").insert(installmentsPayload);

    if (instErr) {
      toast({
        title: "Erro",
        description: `Título criado, mas falhou ao gerar parcelas: ${instErr.message}`,
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Título criado", description: `${count} parcela(s) gerada(s).` });
    setOpenBill(false);
    setBillForm({
      vendor_id: "",
      description: "",
      category: "",
      issue_date: format(new Date(), "yyyy-MM-dd"),
      total_amount: "",
      default_payment_method_id: "none",
      notes: "",
      installments_count: 1,
      first_due_date: format(new Date(), "yyyy-MM-dd"),
      interval_days: 30,
    });
    refreshAll();
  };

  const recomputeBillStatus = async (billId: string) => {
    // regra:
    // - se open_amount total == 0 => pago
    // - se paid_amount total > 0 e open > 0 => parcial
    // - se paid_amount total == 0 => aberto
    const inst = (installmentsByBill.get(billId) || []).filter((i) => i.status !== "cancelado");
    const open = inst.reduce((s, i) => s + safeNum(i.open_amount), 0);
    const paid = inst.reduce((s, i) => s + safeNum(i.paid_amount), 0);

    let status: BillStatus = "aberto";
    if (open <= 0 && inst.length > 0) status = "pago";
    else if (paid > 0 && open > 0) status = "parcial";

    const { error } = await supabase.from("ap_bills").update({ status }).eq("id", billId);
    if (error) {
      // não trava UI por isso, só loga
      console.error("recomputeBillStatus", error);
    }
  };

  const payInstallment = async () => {
    if (!openPay) return;

    const amount = safeNum(payForm.amount);
    const pmId = payForm.payment_method_id === "none" ? null : payForm.payment_method_id;

    if (amount <= 0) {
      toast({ title: "Erro", description: "Valor do pagamento precisa ser maior que 0.", variant: "destructive" });
      return;
    }

    const { error } = await supabase.from("ap_payments").insert({
      installment_id: openPay.installment.id,
      amount: Number(amount.toFixed(2)),
      paid_at: payForm.paid_at ? new Date(payForm.paid_at + "T12:00:00").toISOString() : new Date().toISOString(),
      payment_method_id: pmId,
      reference: payForm.reference.trim() || null,
      notes: payForm.notes.trim() || null,
    });

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Pagamento registrado" });
    setOpenPay(null);
    setPayForm({ amount: "", paid_at: format(new Date(), "yyyy-MM-dd"), payment_method_id: "none", reference: "", notes: "" });

    await refreshAll();
    await recomputeBillStatus(openPay.bill.id);
    await refreshAll();
  };

  const cancelBill = async (bill: Bill) => {
    // cancela o título e as parcelas em aberto
    const { error: billErr } = await supabase.from("ap_bills").update({ status: "cancelado" }).eq("id", bill.id);
    if (billErr) {
      toast({ title: "Erro", description: billErr.message, variant: "destructive" });
      return;
    }

    const { error: instErr } = await supabase
      .from("ap_installments")
      .update({ status: "cancelado" })
      .eq("bill_id", bill.id);

    if (instErr) {
      toast({ title: "Erro", description: instErr.message, variant: "destructive" });
      return;
    }

    toast({ title: "Cancelado", description: "Título e parcelas foram cancelados." });
    refreshAll();
  };

  const deleteBill = async (bill: Bill) => {
    // vai deletar cascata parcelas/pagamentos (pagamentos via parcelas)
    const { error } = await supabase.from("ap_bills").delete().eq("id", bill.id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Excluído", description: "Título removido." });
    refreshAll();
  };

  // =========================
  // UI helpers
  // =========================
  const billStatusBadge = (status: BillStatus) => {
    if (status === "pago") return <Badge className="gap-1"><CheckCircle2 className="h-3 w-3" /> Pago</Badge>;
    if (status === "parcial") return <Badge variant="secondary">Parcial</Badge>;
    if (status === "cancelado") return <Badge variant="destructive">Cancelado</Badge>;
    return <Badge variant="outline">Aberto</Badge>;
  };

  const installmentBadge = (it: InstallmentView) => {
    if (it.status === "cancelado") return <Badge variant="destructive">Cancelado</Badge>;
    const open = safeNum(it.open_amount);
    if (open <= 0) return <Badge className="gap-1"><CheckCircle2 className="h-3 w-3" /> Pago</Badge>;

    const overdue = isBefore(parseISO(it.due_date), startOfDay(new Date()));
    if (overdue) return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> Atrasado</Badge>;

    return <Badge variant="outline">Aberto</Badge>;
  };

  // =========================
  // Render
  // =========================
  const loading =
    vendorsQ.isLoading || methodsQ.isLoading || billsQ.isLoading || installmentsQ.isLoading || paymentsQ.isLoading;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div>
          <h2 className="font-title text-xl">Contas a Pagar</h2>
          <p className="text-sm text-muted-foreground">
            Fornecedores, títulos, parcelas e pagamentos (com parcial).
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Novo Fornecedor */}
          <Dialog open={openVendor} onOpenChange={setOpenVendor}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Building2 className="h-4 w-4" /> Fornecedor
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Novo fornecedor</DialogTitle>
              </DialogHeader>

              <div className="space-y-3">
                <div>
                  <Label>Nome *</Label>
                  <Input value={vendorForm.name} onChange={(e) => setVendorForm({ ...vendorForm, name: e.target.value })} />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>CNPJ/CPF</Label>
                    <Input value={vendorForm.document} onChange={(e) => setVendorForm({ ...vendorForm, document: e.target.value })} />
                  </div>
                  <div>
                    <Label>Telefone</Label>
                    <Input value={vendorForm.phone} onChange={(e) => setVendorForm({ ...vendorForm, phone: e.target.value })} />
                  </div>
                </div>

                <div>
                  <Label>E-mail</Label>
                  <Input value={vendorForm.email} onChange={(e) => setVendorForm({ ...vendorForm, email: e.target.value })} />
                </div>

                <div>
                  <Label>Observações</Label>
                  <Textarea value={vendorForm.notes} onChange={(e) => setVendorForm({ ...vendorForm, notes: e.target.value })} rows={3} />
                </div>

                <Button onClick={createVendor} className="w-full">
                  <Plus className="h-4 w-4 mr-2" /> Salvar fornecedor
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Nova forma de pagamento */}
          <Dialog open={openMethod} onOpenChange={setOpenMethod}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <CreditCard className="h-4 w-4" /> Forma
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Nova forma de pagamento</DialogTitle>
              </DialogHeader>

              <div className="space-y-3">
                <div>
                  <Label>Nome *</Label>
                  <Input value={methodForm.name} onChange={(e) => setMethodForm({ ...methodForm, name: e.target.value })} />
                </div>

                <div>
                  <Label>Tipo</Label>
                  <Select value={methodForm.type} onValueChange={(v) => setMethodForm({ ...methodForm, type: v as PaymentMethodType })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(PM_TYPE_LABEL).map((k) => (
                        <SelectItem key={k} value={k}>
                          {PM_TYPE_LABEL[k as PaymentMethodType]}
                        </SelectItem>
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
          <Dialog open={openBill} onOpenChange={setOpenBill}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" /> Novo título
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Novo título a pagar</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <Label>Fornecedor *</Label>
                    <Select value={billForm.vendor_id} onValueChange={(v) => setBillForm({ ...billForm, vendor_id: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {vendors.filter(v => v.is_active).map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Categoria</Label>
                    <Input value={billForm.category} onChange={(e) => setBillForm({ ...billForm, category: e.target.value })} placeholder="Ex: Insumos, Embalagens..." />
                  </div>
                </div>

                <div>
                  <Label>Descrição *</Label>
                  <Input value={billForm.description} onChange={(e) => setBillForm({ ...billForm, description: e.target.value })} placeholder="Ex: Compra de frascos 250ml" />
                </div>

                <div className="grid md:grid-cols-3 gap-3">
                  <div>
                    <Label>Emissão</Label>
                    <Input type="date" value={billForm.issue_date} onChange={(e) => setBillForm({ ...billForm, issue_date: e.target.value })} />
                  </div>

                  <div>
                    <Label>Valor Total *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={billForm.total_amount}
                      onChange={(e) => setBillForm({ ...billForm, total_amount: e.target.value })}
                      placeholder="0,00"
                    />
                  </div>

                  <div>
                    <Label>Forma padrão</Label>
                    <Select
                      value={billForm.default_payment_method_id}
                      onValueChange={(v) => setBillForm({ ...billForm, default_payment_method_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="(opcional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">(sem)</SelectItem>
                        {methods.filter(m => m.is_active).map((m) => (
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
                        value={billForm.installments_count}
                        onChange={(e) => setBillForm({ ...billForm, installments_count: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <Label>1º vencimento</Label>
                      <Input type="date" value={billForm.first_due_date} onChange={(e) => setBillForm({ ...billForm, first_due_date: e.target.value })} />
                    </div>
                    <div>
                      <Label>Intervalo (dias)</Label>
                      <Input
                        type="number"
                        min={1}
                        value={billForm.interval_days}
                        onChange={(e) => setBillForm({ ...billForm, interval_days: Number(e.target.value) })}
                      />
                      <p className="text-xs text-muted-foreground mt-1">30 = mensal | 7 = semanal</p>
                    </div>
                  </CardContent>
                </Card>

                <div>
                  <Label>Observações</Label>
                  <Textarea value={billForm.notes} onChange={(e) => setBillForm({ ...billForm, notes: e.target.value })} rows={3} />
                </div>

                <Button onClick={createBillWithInstallments} className="w-full">
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
            <CardTitle className="text-sm font-medium">Em aberto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrencyBRL(kpi.open)}</div>
            <p className="text-xs text-muted-foreground">Soma do saldo das parcelas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pago no total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrencyBRL(kpi.paid)}</div>
            <p className="text-xs text-muted-foreground">Soma dos pagamentos</p>
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

      {/* Search + Tabs */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por fornecedor, descrição, categoria..." className="pl-10" />
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="space-y-3">
        <TabsList>
          <TabsTrigger value="titulos">Títulos</TabsTrigger>
          <TabsTrigger value="parcelas">Parcelas</TabsTrigger>
          <TabsTrigger value="fornecedores">Fornecedores</TabsTrigger>
          <TabsTrigger value="pagamento">Formas de pagamento</TabsTrigger>
        </TabsList>

        {/* TÍTULOS */}
        <TabsContent value="titulos">
          <Card>
            <CardHeader>
              <CardTitle>Títulos ({billsFiltered.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground text-center py-6">Carregando...</p>
              ) : billsFiltered.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Nenhum título encontrado.</p>
              ) : (
                <div className="space-y-3">
                  {billsFiltered.map((b) => {
                    const inst = installmentsByBill.get(b.id) || [];
                    const open = inst.reduce((s, i) => s + safeNum(i.open_amount), 0);
                    const paid = inst.reduce((s, i) => s + safeNum(i.paid_amount), 0);

                    return (
                      <div key={b.id} className="p-4 rounded-lg bg-muted/50">
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium">{b.ap_vendors?.name}</p>
                              {billStatusBadge(b.status)}
                              {b.category && <Badge variant="outline">{b.category}</Badge>}
                            </div>

                            <p className="text-sm">{b.description}</p>

                            <p className="text-xs text-muted-foreground">
                              Emissão: {monthKeyBR(b.issue_date)} • Total: <strong>{formatCurrencyBRL(safeNum(b.total_amount))}</strong> • Pago:{" "}
                              <strong className="text-green-600">{formatCurrencyBRL(paid)}</strong> • Aberto:{" "}
                              <strong className={open > 0 ? "text-destructive" : "text-green-600"}>{formatCurrencyBRL(open)}</strong>
                            </p>

                            {b.notes && <p className="text-xs text-muted-foreground italic">{b.notes}</p>}
                          </div>

                          <div className="flex flex-wrap gap-2 justify-end">
                            <Button
                              variant="outline"
                              onClick={() => cancelBill(b)}
                              disabled={b.status === "cancelado"}
                            >
                              Cancelar
                            </Button>
                            <Button variant="destructive" onClick={() => deleteBill(b)}>
                              <Trash2 className="h-4 w-4 mr-2" /> Excluir
                            </Button>
                          </div>
                        </div>

                        {inst.length > 0 && (
                          <div className="mt-3 grid gap-2 md:grid-cols-2">
                            {inst
                              .sort((a, c) => a.installment_no - c.installment_no)
                              .map((it) => {
                                const openAmt = safeNum(it.open_amount);
                                const bill = b;
                                const overdue =
                                  it.status !== "cancelado" &&
                                  openAmt > 0 &&
                                  isBefore(parseISO(it.due_date), startOfDay(new Date()));

                                return (
                                  <div
                                    key={it.id}
                                    className={`p-3 rounded-lg border ${overdue ? "border-destructive/40 bg-destructive/5" : "border-border bg-background"}`}
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div>
                                        <p className="text-sm font-medium">
                                          Parcela {it.installment_no} • Venc:{" "}
                                          {format(parseISO(it.due_date), "dd/MM/yyyy", { locale: ptBR })}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                          Valor: {formatCurrencyBRL(safeNum(it.amount))} • Pago:{" "}
                                          <span className="text-green-600">{formatCurrencyBRL(safeNum(it.paid_amount))}</span> • Aberto:{" "}
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
                                            setOpenPay({ installment: it, bill });
                                            setPayForm({
                                              amount: String(openAmt > 0 ? openAmt.toFixed(2) : ""),
                                              paid_at: format(new Date(), "yyyy-MM-dd"),
                                              payment_method_id: (bill.default_payment_method_id || "none") as any,
                                              reference: "",
                                              notes: "",
                                            });
                                          }}
                                          disabled={it.status === "cancelado" || openAmt <= 0}
                                        >
                                          <HandCoins className="h-4 w-4" /> Pagar
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
            <CardHeader>
              <CardTitle>Parcelas ({installmentsFiltered.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground text-center py-6">Carregando...</p>
              ) : installmentsFiltered.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Nenhuma parcela encontrada.</p>
              ) : (
                <div className="space-y-2">
                  {installmentsFiltered.map((it) => {
                    const bill = billById.get(it.bill_id);
                    const openAmt = safeNum(it.open_amount);
                    const overdue =
                      it.status !== "cancelado" &&
                      openAmt > 0 &&
                      isBefore(parseISO(it.due_date), startOfDay(new Date()));

                    return (
                      <div
                        key={it.id}
                        className={`p-3 rounded-lg ${overdue ? "bg-destructive/5 border border-destructive/20" : "bg-muted/50"}`}
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                          <div>
                            <p className="font-medium">
                              {bill?.ap_vendors?.name} • {bill?.description}
                            </p>
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
                                if (!bill) return;
                                setOpenPay({ installment: it, bill });
                                setPayForm({
                                  amount: String(openAmt > 0 ? openAmt.toFixed(2) : ""),
                                  paid_at: format(new Date(), "yyyy-MM-dd"),
                                  payment_method_id: (bill.default_payment_method_id || "none") as any,
                                  reference: "",
                                  notes: "",
                                });
                              }}
                              disabled={it.status === "cancelado" || openAmt <= 0 || !bill}
                            >
                              <HandCoins className="h-4 w-4 mr-2" /> Pagar
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

        {/* FORNECEDORES */}
        <TabsContent value="fornecedores">
          <Card>
            <CardHeader>
              <CardTitle>Fornecedores ({vendors.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground text-center py-6">Carregando...</p>
              ) : vendors.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Nenhum fornecedor cadastrado.</p>
              ) : (
                <div className="space-y-2">
                  {vendors.map((v) => (
                    <div key={v.id} className="p-3 rounded-lg bg-muted/50 flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{v.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {v.document ? `Doc: ${v.document} • ` : ""}
                          {v.email ? `Email: ${v.email} • ` : ""}
                          {v.phone ? `Tel: ${v.phone}` : ""}
                        </p>
                        {v.notes && <p className="text-xs text-muted-foreground italic mt-1">{v.notes}</p>}
                      </div>
                      <Badge variant={v.is_active ? "outline" : "destructive"}>{v.is_active ? "Ativo" : "Inativo"}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* FORMAS */}
        <TabsContent value="pagamento">
          <Card>
            <CardHeader>
              <CardTitle>Formas de pagamento ({methods.length})</CardTitle>
            </CardHeader>
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

      {/* Dialog: pagar parcela */}
      <Dialog open={!!openPay} onOpenChange={(v) => !v && setOpenPay(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Registrar pagamento</DialogTitle>
          </DialogHeader>

          {openPay && (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="font-medium">{openPay.bill.ap_vendors?.name}</p>
                <p className="text-sm">{openPay.bill.description}</p>
                <p className="text-xs text-muted-foreground">
                  Parcela {openPay.installment.installment_no} • Venc:{" "}
                  {format(parseISO(openPay.installment.due_date), "dd/MM/yyyy", { locale: ptBR })}
                </p>
                <p className="text-xs mt-1">
                  Aberto:{" "}
                  <strong className="text-destructive">
                    {formatCurrencyBRL(safeNum(openPay.installment.open_amount))}
                  </strong>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Valor pago *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={payForm.amount}
                    onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Data</Label>
                  <Input
                    type="date"
                    value={payForm.paid_at}
                    onChange={(e) => setPayForm({ ...payForm, paid_at: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label>Forma de pagamento</Label>
                <Select value={payForm.payment_method_id} onValueChange={(v) => setPayForm({ ...payForm, payment_method_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="(opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">(sem)</SelectItem>
                    {methods.filter(m => m.is_active).map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name} ({PM_TYPE_LABEL[m.type]})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Referência</Label>
                <Input value={payForm.reference} onChange={(e) => setPayForm({ ...payForm, reference: e.target.value })} placeholder="Ex: comprovante, num boleto..." />
              </div>

              <div>
                <Label>Observações</Label>
                <Textarea value={payForm.notes} onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })} rows={3} />
              </div>

              <Button onClick={payInstallment} className="w-full">
                <HandCoins className="h-4 w-4 mr-2" /> Confirmar pagamento
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
