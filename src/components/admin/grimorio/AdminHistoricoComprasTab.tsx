import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { ScrollText, Search, Eye, Package } from 'lucide-react';
import { formatCurrencyBRL } from '@/lib/format';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface OrderWithProfile {
  id: string;
  order_number: number;
  user_id: string;
  status: string;
  payment_status: string;
  total: number;
  created_at: string;
  profile: {
    name: string | null;
    email: string | null;
  } | null;
}

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  product_price: number;
  total: number;
}

const statusLabels: Record<string, string> = {
  pendente: 'Pendente',
  confirmado: 'Confirmado',
  producao: 'Em Produção',
  enviado: 'Enviado',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
};

const statusColors: Record<string, string> = {
  pendente: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  confirmado: 'bg-blue-100 text-blue-800 border-blue-200',
  producao: 'bg-purple-100 text-purple-800 border-purple-200',
  enviado: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  entregue: 'bg-green-100 text-green-800 border-green-200',
  cancelado: 'bg-red-100 text-red-800 border-red-200',
};

export const AdminHistoricoComprasTab = () => {
  const [orders, setOrders] = useState<OrderWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<OrderWithProfile | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);

    const { data: ordersData } = await supabase
      .from('orders')
      .select('id, order_number, user_id, status, payment_status, total, created_at')
      .order('created_at', { ascending: false });

    if (!ordersData) {
      setLoading(false);
      return;
    }

    // Buscar perfis
    const userIds = [...new Set(ordersData.map(o => o.user_id))];
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, name, email')
      .in('id', userIds);

    const ordersWithProfiles: OrderWithProfile[] = ordersData.map(order => ({
      ...order,
      profile: profilesData?.find(p => p.id === order.user_id) || null,
    }));

    setOrders(ordersWithProfiles);
    setLoading(false);
  };

  const openOrderDetails = async (order: OrderWithProfile) => {
    setSelectedOrder(order);

    const { data } = await supabase
      .from('order_items')
      .select('id, product_name, quantity, product_price, total')
      .eq('order_id', order.id);

    setOrderItems(data || []);
  };

  const filteredOrders = orders.filter(o =>
    o.profile?.name?.toLowerCase().includes(search.toLowerCase()) ||
    o.profile?.email?.toLowerCase().includes(search.toLowerCase()) ||
    o.order_number.toString().includes(search)
  );

  // Agrupar por usuário
  const groupedByUser = filteredOrders.reduce((acc, order) => {
    const key = order.user_id;
    if (!acc[key]) {
      acc[key] = {
        profile: order.profile,
        orders: [],
        totalSpent: 0,
        totalOrders: 0,
      };
    }
    acc[key].orders.push(order);
    acc[key].totalSpent += Number(order.total);
    acc[key].totalOrders += 1;
    return acc;
  }, {} as Record<string, { profile: OrderWithProfile['profile']; orders: OrderWithProfile[]; totalSpent: number; totalOrders: number }>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-title font-bold flex items-center gap-2">
            <ScrollText className="h-6 w-6 text-primary" />
            Histórico de Compras
          </h1>
          <p className="text-muted-foreground">Todas as compras dos jogadores</p>
        </div>
      </div>

      {/* Busca */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, email ou pedido..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Lista por usuário */}
      {loading ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Carregando...
          </CardContent>
        </Card>
      ) : Object.keys(groupedByUser).length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Nenhum pedido encontrado
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedByUser).map(([userId, data]) => (
            <Card key={userId}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="font-medium">{data.profile?.name || 'Sem nome'}</p>
                    <p className="text-sm text-muted-foreground">{data.profile?.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{data.totalOrders} pedidos</p>
                    <p className="text-sm text-primary font-semibold">
                      Total: {formatCurrencyBRL(data.totalSpent)}
                    </p>
                  </div>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pedido</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Pagamento</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.orders.map(order => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono">#{order.order_number}</TableCell>
                        <TableCell>
                          {format(new Date(order.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[order.status] || ''}>
                            {statusLabels[order.status] || order.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {order.payment_status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrencyBRL(order.total)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openOrderDetails(order)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de Detalhes */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Pedido #{selectedOrder?.order_number}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Cliente</p>
                <p className="font-medium">{selectedOrder?.profile?.name}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Data</p>
                <p className="font-medium">
                  {selectedOrder && format(new Date(selectedOrder.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </p>
              </div>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-2">Itens do Pedido</p>
              <div className="border rounded-lg divide-y">
                {orderItems.map(item => (
                  <div key={item.id} className="p-3 flex justify-between items-center">
                    <div>
                      <p className="font-medium">{item.product_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.quantity}x {formatCurrencyBRL(item.product_price)}
                      </p>
                    </div>
                    <p className="font-medium">{formatCurrencyBRL(item.total)}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t">
              <span className="font-medium">Total</span>
              <span className="text-lg font-bold text-primary">
                {selectedOrder && formatCurrencyBRL(selectedOrder.total)}
              </span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
