-- Recriar views com SECURITY INVOKER (padrão seguro)
DROP VIEW IF EXISTS public.ap_installments_view;
DROP VIEW IF EXISTS public.ar_installments_view;

-- View de parcelas AP com saldo - SECURITY INVOKER
CREATE VIEW public.ap_installments_view 
WITH (security_invoker = true) AS
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

-- View de parcelas AR com saldo - SECURITY INVOKER
CREATE VIEW public.ar_installments_view 
WITH (security_invoker = true) AS
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