-- =============================================
-- FASE 1: CONTAS A PAGAR (AP - Accounts Payable)
-- =============================================

-- Fornecedores
CREATE TABLE public.ap_vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  document TEXT,
  email TEXT,
  phone TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Formas de pagamento AP
CREATE TABLE public.ap_payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'outros',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Títulos/Contas a pagar
CREATE TABLE public.ap_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID REFERENCES public.ap_vendors(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'outros',
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'aberto',
  default_payment_method_id UUID REFERENCES public.ap_payment_methods(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Parcelas AP
CREATE TABLE public.ap_installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID NOT NULL REFERENCES public.ap_bills(id) ON DELETE CASCADE,
  installment_no INTEGER NOT NULL DEFAULT 1,
  due_date DATE NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pendente',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Pagamentos AP
CREATE TABLE public.ap_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  installment_id UUID NOT NULL REFERENCES public.ap_installments(id) ON DELETE CASCADE,
  paid_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  amount NUMERIC NOT NULL DEFAULT 0,
  payment_method_id UUID REFERENCES public.ap_payment_methods(id) ON DELETE SET NULL,
  reference TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =============================================
-- FASE 2: CONTAS A RECEBER (AR - Accounts Receivable)
-- =============================================

-- Clientes AR (separado de profiles para flexibilidade)
CREATE TABLE public.ar_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  document TEXT,
  email TEXT,
  phone TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Formas de recebimento AR
CREATE TABLE public.ar_payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'outros',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Faturas/Títulos a receber
CREATE TABLE public.ar_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.ar_customers(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'vendas',
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'aberto',
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  default_payment_method_id UUID REFERENCES public.ar_payment_methods(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Parcelas AR
CREATE TABLE public.ar_installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.ar_invoices(id) ON DELETE CASCADE,
  installment_no INTEGER NOT NULL DEFAULT 1,
  due_date DATE NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pendente',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Recebimentos AR
CREATE TABLE public.ar_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  installment_id UUID NOT NULL REFERENCES public.ar_installments(id) ON DELETE CASCADE,
  received_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  amount NUMERIC NOT NULL DEFAULT 0,
  payment_method_id UUID REFERENCES public.ar_payment_methods(id) ON DELETE SET NULL,
  reference TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =============================================
-- FASE 3: VIEWS PARA PARCELAS COM SALDOS
-- =============================================

-- View de parcelas AP com saldo
CREATE OR REPLACE VIEW public.ap_installments_view AS
SELECT 
  i.*,
  b.vendor_id,
  b.description as bill_description,
  b.category as bill_category,
  COALESCE(SUM(p.amount), 0) as paid_amount,
  i.amount - COALESCE(SUM(p.amount), 0) as open_amount
FROM public.ap_installments i
JOIN public.ap_bills b ON b.id = i.bill_id
LEFT JOIN public.ap_payments p ON p.installment_id = i.id
GROUP BY i.id, b.vendor_id, b.description, b.category;

-- View de parcelas AR com saldo
CREATE OR REPLACE VIEW public.ar_installments_view AS
SELECT 
  i.*,
  inv.customer_id,
  inv.description as invoice_description,
  inv.category as invoice_category,
  inv.order_id,
  COALESCE(SUM(p.amount), 0) as paid_amount,
  i.amount - COALESCE(SUM(p.amount), 0) as open_amount
FROM public.ar_installments i
JOIN public.ar_invoices inv ON inv.id = i.invoice_id
LEFT JOIN public.ar_payments p ON p.installment_id = i.id
GROUP BY i.id, inv.customer_id, inv.description, inv.category, inv.order_id;

-- =============================================
-- FASE 4: TABELA DE DEPOIMENTOS
-- =============================================

CREATE TABLE public.testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =============================================
-- FASE 5: COLUNAS FALTANTES
-- =============================================

-- Adicionar emoji em categories (se não existir)
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS emoji TEXT;

-- =============================================
-- FASE 6: RLS POLICIES
-- =============================================

-- AP Vendors
ALTER TABLE public.ap_vendors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage ap_vendors" ON public.ap_vendors FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can view ap_vendors" ON public.ap_vendors FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- AP Payment Methods
ALTER TABLE public.ap_payment_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage ap_payment_methods" ON public.ap_payment_methods FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can view ap_payment_methods" ON public.ap_payment_methods FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- AP Bills
ALTER TABLE public.ap_bills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage ap_bills" ON public.ap_bills FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can view ap_bills" ON public.ap_bills FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- AP Installments
ALTER TABLE public.ap_installments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage ap_installments" ON public.ap_installments FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can view ap_installments" ON public.ap_installments FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- AP Payments
ALTER TABLE public.ap_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage ap_payments" ON public.ap_payments FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can view ap_payments" ON public.ap_payments FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- AR Customers
ALTER TABLE public.ar_customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage ar_customers" ON public.ar_customers FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can view ar_customers" ON public.ar_customers FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- AR Payment Methods
ALTER TABLE public.ar_payment_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage ar_payment_methods" ON public.ar_payment_methods FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can view ar_payment_methods" ON public.ar_payment_methods FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- AR Invoices
ALTER TABLE public.ar_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage ar_invoices" ON public.ar_invoices FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can view ar_invoices" ON public.ar_invoices FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- AR Installments
ALTER TABLE public.ar_installments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage ar_installments" ON public.ar_installments FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can view ar_installments" ON public.ar_installments FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- AR Payments
ALTER TABLE public.ar_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage ar_payments" ON public.ar_payments FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can view ar_payments" ON public.ar_payments FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- Testimonials
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage testimonials" ON public.testimonials FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can create own testimonial" ON public.testimonials FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own testimonial" ON public.testimonials FOR SELECT USING (auth.uid() = user_id OR status = 'approved');
CREATE POLICY "Users can update own pending testimonial" ON public.testimonials FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');

-- =============================================
-- FASE 7: TRIGGERS PARA UPDATED_AT
-- =============================================

CREATE TRIGGER update_ap_vendors_updated_at BEFORE UPDATE ON public.ap_vendors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ap_bills_updated_at BEFORE UPDATE ON public.ap_bills FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ar_customers_updated_at BEFORE UPDATE ON public.ar_customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ar_invoices_updated_at BEFORE UPDATE ON public.ar_invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_testimonials_updated_at BEFORE UPDATE ON public.testimonials FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- FASE 8: DADOS INICIAIS
-- =============================================

-- Formas de pagamento padrão AP
INSERT INTO public.ap_payment_methods (name, type) VALUES 
  ('PIX', 'pix'),
  ('Boleto', 'boleto'),
  ('Transferência', 'transferencia'),
  ('Cartão de Crédito', 'cartao'),
  ('Dinheiro', 'dinheiro'),
  ('Outros', 'outros');

-- Formas de recebimento padrão AR
INSERT INTO public.ar_payment_methods (name, type) VALUES 
  ('PIX', 'pix'),
  ('Boleto', 'boleto'),
  ('Transferência', 'transferencia'),
  ('Cartão de Crédito', 'cartao'),
  ('Cartão de Débito', 'debito'),
  ('Dinheiro', 'dinheiro'),
  ('Outros', 'outros');