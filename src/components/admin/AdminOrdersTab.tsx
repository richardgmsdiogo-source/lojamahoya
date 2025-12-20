import { useState, useEffect } from 'react';
import { Package, Eye, Truck, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatCurrencyBRL } from '@/lib/format';

interface OrderItem {
  id: string;
  product_name: string;
  product_price: number;
  quantity: number;
  total: number;
}

interface Order {
  id: string;
  order_number: number;
  user_id: string;
  status: string;
  payment_status: string;
  subtotal: number;
  shipping_cost: number;
  discount: number;
  total: number;
  tracking_code: string | null;
  tracking_url: string | null;
  notes: string | null;
  admin_notes: string | null;
  created_at: string;
  order_items: OrderItem[];
  profiles: { name: string | null; email: string | null; phone: string | null } | null;
  customer_addresses: {
    recipient_name: string;
    street: string;
    number: string;
    complement: string | null;
    neighborhood: string;
    city: string;
    state: string;
    cep: string;
  } | null;
}

const statusOptions = [
  { value: 'pendente', label: 'Pendente' },
  { value: 'confirmado', label: 'Confirmado' },
  { value: 'preparando', label: 'Preparando' },
  { value: 'enviado', label: 'Enviado' },
  { value: 'entregue', label: 'Entregue' },
  { value: 'cancelado', label: 'Cancelado' },
];

const paymentStatusOptions = [
  { value: 'aguardando', label: 'Aguardando' },
  { value: 'pago', label: 'Pago' },
  { value: 'cancelado', label: 'Cancelado' },
];

const statusColors: Record<string, string> = {
  pendente: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  confirmado: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  preparando: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  enviado: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',
  entregue: 'bg-green-500/10 text-green-600 border-green-500/20',
  cancelado: 'bg-red-500/10 text-red-600 border-red-500/20',
};

export const AdminOrdersTab = () => {
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editForm, setEditForm] = useState({
    status: '',
    payment_status: '',
    tracking_code: '',
    tracking_url: '',
    admin_notes: '',
  });

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    
    // Fetch orders with items and addresses
    const { data: ordersData, error: ordersError } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (*),
        customer_addresses (recipient_name, street, number, complement, neighborhood, city, state, cep)
      `)
      .order('created_at', { ascending: false });

    if (ordersError) {
      toast({ title: 'Erro ao carregar pedidos', variant: 'destructive' });
      setLoading(false);
      return;
    }

    // Fetch profiles separately
    const userIds = [...new Set((ordersData || []).map(o => o.user_id))];
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, name, email, phone')
      .in('id', userIds);

    const profilesMap = (profilesData || []).reduce((acc, p) => {
      acc[p.id] = p;
      return acc;
    }, {} as Record<string, { id: string; name: string | null; email: string | null; phone: string | null }>);

    const ordersWithProfiles = (ordersData || []).map(order => ({
      ...order,
      profiles: profilesMap[order.user_id] || null,
    }));

    setOrders(ordersWithProfiles as Order[]);
    setLoading(false);
  };

  const openDetails = (order: Order) => {
    setSelectedOrder(order);
    setEditForm({
      status: order.status,
      payment_status: order.payment_status,
      tracking_code: order.tracking_code || '',
      tracking_url: order.tracking_url || '',
      admin_notes: order.admin_notes || '',
    });
    setDetailsOpen(true);
  };

  const handleUpdateOrder = async () => {
    if (!selectedOrder) return;

    const previousStatus = selectedOrder.status;
    const previousPaymentStatus = selectedOrder.payment_status;
    const newStatus = editForm.status;
    const newPaymentStatus = editForm.payment_status;

    const { error } = await supabase
      .from('orders')
      .update({
        status: editForm.status,
        payment_status: editForm.payment_status,
        tracking_code: editForm.tracking_code || null,
        tracking_url: editForm.tracking_url || null,
        admin_notes: editForm.admin_notes || null,
      })
      .eq('id', selectedOrder.id);

    if (error) {
      toast({ title: 'Erro ao atualizar pedido', variant: 'destructive' });
      return;
    }

    // Sincronizar status do pagamento com Contas a Receber
    if (newPaymentStatus !== previousPaymentStatus) {
      // Buscar o título vinculado a este pedido
      const { data: invoiceData } = await supabase
        .from('ar_invoices')
        .select('id')
        .eq('order_id', selectedOrder.id)
        .single();

      if (invoiceData) {
        const arStatus = newPaymentStatus === 'pago' ? 'pago' : 
                         newPaymentStatus === 'cancelado' ? 'cancelado' : 'aberto';
        
        // Atualizar status do título
        await supabase
          .from('ar_invoices')
          .update({ status: arStatus })
          .eq('id', invoiceData.id);

        // Atualizar status das parcelas
        await supabase
          .from('ar_installments')
          .update({ status: arStatus === 'pago' ? 'pago' : arStatus === 'cancelado' ? 'cancelado' : 'aberto' })
          .eq('invoice_id', invoiceData.id);
      }
    }

    // Dar XP ao cliente quando o pedido é marcado como entregue
    if (newStatus === 'entregue' && previousStatus !== 'entregue') {
      // 1 XP por real gasto (arredondado)
      const xpToAward = Math.round(selectedOrder.total);
      
      const { data: xpResult, error: xpError } = await supabase
        .rpc('award_xp', { 
          p_user_id: selectedOrder.user_id, 
          p_xp_amount: xpToAward 
        });

      if (xpError) {
        console.error('Erro ao dar XP:', xpError);
        toast({ 
          title: 'Pedido atualizado', 
          description: 'Mas houve um erro ao adicionar XP ao cliente.',
          variant: 'destructive' 
        });
      } else {
        const result = xpResult as { leveled_up?: boolean; new_level?: number };
        toast({ 
          title: 'Pedido atualizado', 
          description: `Cliente recebeu ${xpToAward} XP!${result?.leveled_up ? ` 🎉 Subiu para o nível ${result?.new_level}!` : ''}` 
        });
      }
    } else {
      toast({ title: 'Pedido atualizado' });
    }

    setDetailsOpen(false);
    fetchOrders();
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.order_number.toString().includes(searchTerm) ||
      order.profiles?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por número, nome ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {statusOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhum pedido encontrado.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <Card key={order.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">#{order.order_number}</span>
                      <Badge variant="outline" className={statusColors[order.status]}>
                        {statusOptions.find((s) => s.value === order.status)?.label}
                      </Badge>
                      <Badge variant="outline">
                        {paymentStatusOptions.find((s) => s.value === order.payment_status)?.label}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {order.profiles?.name || 'Cliente não identificado'} • {order.profiles?.email}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.created_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-semibold text-primary">
                      {formatCurrencyBRL(order.total)}
                    </span>
                    <Button variant="outline" size="sm" onClick={() => openDetails(order)}>
                      <Eye className="h-4 w-4 mr-2" />
                      Detalhes
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pedido #{selectedOrder?.order_number}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Cliente</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-1">
                    <p className="font-medium">{selectedOrder.profiles?.name}</p>
                    <p className="text-muted-foreground">{selectedOrder.profiles?.email}</p>
                    {selectedOrder.profiles?.phone && (
                      <p className="text-muted-foreground">{selectedOrder.profiles?.phone}</p>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Endereço de Entrega</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm">
                    {selectedOrder.customer_addresses ? (
                      <>
                        <p>{selectedOrder.customer_addresses.recipient_name}</p>
                        <p>
                          {selectedOrder.customer_addresses.street}, {selectedOrder.customer_addresses.number}
                          {selectedOrder.customer_addresses.complement && ` - ${selectedOrder.customer_addresses.complement}`}
                        </p>
                        <p>
                          {selectedOrder.customer_addresses.neighborhood} - {selectedOrder.customer_addresses.city}/{selectedOrder.customer_addresses.state}
                        </p>
                        <p className="text-muted-foreground">CEP: {selectedOrder.customer_addresses.cep}</p>
                      </>
                    ) : (
                      <p className="text-muted-foreground">Não informado</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Itens do Pedido</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {selectedOrder.order_items.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span>{item.quantity}x {item.product_name}</span>
                        <span>{formatCurrencyBRL(item.total)}</span>
                      </div>
                    ))}
                    <div className="border-t pt-2 mt-2 space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span>{formatCurrencyBRL(selectedOrder.subtotal)}</span>
                      </div>
                      {selectedOrder.shipping_cost > 0 && (
                        <div className="flex justify-between">
                          <span>Frete</span>
                          <span>{formatCurrencyBRL(selectedOrder.shipping_cost)}</span>
                        </div>
                      )}
                      {selectedOrder.discount > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span>Desconto</span>
                          <span>-{formatCurrencyBRL(selectedOrder.discount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-semibold">
                        <span>Total</span>
                        <span>{formatCurrencyBRL(selectedOrder.total)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {selectedOrder.notes && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Observações do Cliente</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{selectedOrder.notes}</p>
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Status do Pedido</Label>
                  <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status do Pagamento</Label>
                  <Select value={editForm.payment_status} onValueChange={(v) => setEditForm({ ...editForm, payment_status: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentStatusOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Código de Rastreio</Label>
                  <Input
                    placeholder="Ex: BR123456789XX"
                    value={editForm.tracking_code}
                    onChange={(e) => setEditForm({ ...editForm, tracking_code: e.target.value })}
                  />
                </div>
                <div>
                  <Label>URL de Rastreio</Label>
                  <Input
                    placeholder="https://..."
                    value={editForm.tracking_url}
                    onChange={(e) => setEditForm({ ...editForm, tracking_url: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label>Notas Internas (Admin)</Label>
                <Textarea
                  placeholder="Notas visíveis apenas para administradores..."
                  value={editForm.admin_notes}
                  onChange={(e) => setEditForm({ ...editForm, admin_notes: e.target.value })}
                />
              </div>

              <Button onClick={handleUpdateOrder} className="w-full">
                <Truck className="h-4 w-4 mr-2" />
                Atualizar Pedido
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};