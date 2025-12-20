-- Função para criar título a receber quando um pedido é criado
CREATE OR REPLACE FUNCTION public.create_ar_invoice_for_order()
RETURNS TRIGGER AS $$
DECLARE
  v_customer_id uuid;
  v_invoice_id uuid;
  v_profile_name text;
BEGIN
  -- Buscar ou criar cliente no AR baseado no user_id do pedido
  SELECT p.name INTO v_profile_name 
  FROM profiles p 
  WHERE p.id = NEW.user_id;

  -- Verificar se já existe um cliente AR para este user_id (usando notes como referência)
  SELECT id INTO v_customer_id 
  FROM ar_customers 
  WHERE notes LIKE '%user_id:' || NEW.user_id || '%'
  LIMIT 1;

  -- Se não existe, criar um novo cliente AR
  IF v_customer_id IS NULL THEN
    INSERT INTO ar_customers (name, notes, is_active)
    VALUES (
      COALESCE(v_profile_name, 'Cliente #' || NEW.order_number),
      'user_id:' || NEW.user_id,
      true
    )
    RETURNING id INTO v_customer_id;
  END IF;

  -- Criar o título (ar_invoices)
  INSERT INTO ar_invoices (
    customer_id,
    description,
    category,
    issue_date,
    total_amount,
    status,
    order_id,
    notes
  ) VALUES (
    v_customer_id,
    'Pedido #' || NEW.order_number,
    'vendas',
    CURRENT_DATE,
    NEW.total,
    CASE 
      WHEN NEW.payment_status = 'pago' THEN 'pago'
      ELSE 'aberto'
    END,
    NEW.id,
    'Criado automaticamente a partir do pedido #' || NEW.order_number
  )
  RETURNING id INTO v_invoice_id;

  -- Criar a parcela única (ar_installments)
  INSERT INTO ar_installments (
    invoice_id,
    installment_no,
    due_date,
    amount,
    status
  ) VALUES (
    v_invoice_id,
    1,
    CURRENT_DATE,
    NEW.total,
    CASE 
      WHEN NEW.payment_status = 'pago' THEN 'pago'
      ELSE 'aberto'
    END
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Função para sincronizar status do pedido quando o título AR é atualizado
CREATE OR REPLACE FUNCTION public.sync_order_payment_status_from_ar()
RETURNS TRIGGER AS $$
DECLARE
  v_order_id uuid;
BEGIN
  -- Buscar o order_id do título
  v_order_id := NEW.order_id;
  
  -- Se não tem order_id vinculado, não faz nada
  IF v_order_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Atualizar o payment_status do pedido baseado no status do título
  UPDATE orders
  SET payment_status = CASE
    WHEN NEW.status = 'pago' THEN 'pago'
    WHEN NEW.status = 'cancelado' THEN 'cancelado'
    ELSE 'aguardando'
  END,
  updated_at = now()
  WHERE id = v_order_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Função para recalcular status do título quando pagamento é registrado
CREATE OR REPLACE FUNCTION public.update_ar_invoice_status_on_payment()
RETURNS TRIGGER AS $$
DECLARE
  v_invoice_id uuid;
  v_total_amount numeric;
  v_paid_amount numeric;
  v_new_status text;
BEGIN
  -- Buscar o invoice_id da parcela
  SELECT invoice_id INTO v_invoice_id 
  FROM ar_installments 
  WHERE id = NEW.installment_id;

  -- Atualizar status da parcela se totalmente paga
  UPDATE ar_installments
  SET status = CASE 
    WHEN (
      SELECT COALESCE(SUM(amount), 0) 
      FROM ar_payments 
      WHERE installment_id = NEW.installment_id
    ) >= amount THEN 'pago'
    ELSE status
  END
  WHERE id = NEW.installment_id;

  -- Calcular totais do título
  SELECT 
    COALESCE(SUM(amount), 0),
    COALESCE(SUM(
      (SELECT COALESCE(SUM(p.amount), 0) FROM ar_payments p WHERE p.installment_id = i.id)
    ), 0)
  INTO v_total_amount, v_paid_amount
  FROM ar_installments i
  WHERE i.invoice_id = v_invoice_id
    AND i.status != 'cancelado';

  -- Determinar novo status
  IF v_paid_amount >= v_total_amount THEN
    v_new_status := 'pago';
  ELSIF v_paid_amount > 0 THEN
    v_new_status := 'parcial';
  ELSE
    v_new_status := 'aberto';
  END IF;

  -- Atualizar título
  UPDATE ar_invoices
  SET status = v_new_status, updated_at = now()
  WHERE id = v_invoice_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Criar triggers
DROP TRIGGER IF EXISTS trigger_create_ar_invoice_for_order ON orders;
CREATE TRIGGER trigger_create_ar_invoice_for_order
  AFTER INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION create_ar_invoice_for_order();

DROP TRIGGER IF EXISTS trigger_sync_order_payment_status ON ar_invoices;
CREATE TRIGGER trigger_sync_order_payment_status
  AFTER UPDATE OF status ON ar_invoices
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION sync_order_payment_status_from_ar();

DROP TRIGGER IF EXISTS trigger_update_ar_invoice_on_payment ON ar_payments;
CREATE TRIGGER trigger_update_ar_invoice_on_payment
  AFTER INSERT ON ar_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_ar_invoice_status_on_payment();