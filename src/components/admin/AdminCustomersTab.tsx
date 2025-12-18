import { useState, useEffect } from 'react';
import { Users, Search, Package, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatCurrencyBRL } from '@/lib/format';

interface Customer {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  created_at: string | null;
  total_orders: number;
  total_spent: number;
}

interface CustomerOrder {
  id: string;
  order_number: number;
  status: string;
  payment_status: string;
  total: number;
  created_at: string;
}

const statusLabels: Record<string, string> = {
  pendente: 'Pendente',
  confirmado: 'Confirmado',
  preparando: 'Preparando',
  enviado: 'Enviado',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
};

export const AdminCustomersTab = () => {
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerOrders, setCustomerOrders] = useState<CustomerOrder[]>([]);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    
    // Fetch profiles with order aggregation
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*');

    if (profilesError) {
      toast({ title: 'Erro ao carregar clientes', variant: 'destructive' });
      setLoading(false);
      return;
    }

    // Fetch orders to calculate totals
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('user_id, total, status');

    if (ordersError) {
      toast({ title: 'Erro ao carregar pedidos', variant: 'destructive' });
      setLoading(false);
      return;
    }

    // Aggregate order data per customer
    const ordersByUser = (orders || []).reduce((acc, order) => {
      if (!acc[order.user_id]) {
        acc[order.user_id] = { count: 0, total: 0 };
      }
      acc[order.user_id].count++;
      if (order.status !== 'cancelado') {
        acc[order.user_id].total += Number(order.total);
      }
      return acc;
    }, {} as Record<string, { count: number; total: number }>);

    const customersWithOrders: Customer[] = (profiles || []).map((profile) => ({
      id: profile.id,
      name: profile.name,
      email: profile.email,
      phone: profile.phone,
      created_at: profile.created_at,
      total_orders: ordersByUser[profile.id]?.count || 0,
      total_spent: ordersByUser[profile.id]?.total || 0,
    }));

    // Sort by total spent
    customersWithOrders.sort((a, b) => b.total_spent - a.total_spent);

    setCustomers(customersWithOrders);
    setLoading(false);
  };

  const openCustomerDetails = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setDetailsOpen(true);

    const { data, error } = await supabase
      .from('orders')
      .select('id, order_number, status, payment_status, total, created_at')
      .eq('user_id', customer.id)
      .order('created_at', { ascending: false });

    if (!error) {
      setCustomerOrders(data || []);
    }
  };

  const filteredCustomers = customers.filter((customer) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      customer.name?.toLowerCase().includes(searchLower) ||
      customer.email?.toLowerCase().includes(searchLower) ||
      customer.phone?.includes(searchTerm)
    );
  });

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, email ou telefone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {loading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : filteredCustomers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhum cliente encontrado.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredCustomers.map((customer) => (
            <Card key={customer.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openCustomerDetails(customer)}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium">{customer.name || 'Nome não informado'}</p>
                    <p className="text-sm text-muted-foreground">{customer.email}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
                {customer.phone && (
                  <p className="text-sm text-muted-foreground mb-2">{customer.phone}</p>
                )}
                <div className="flex gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span>{customer.total_orders} pedidos</span>
                  </div>
                  <div className="font-medium text-primary">
                    {formatCurrencyBRL(customer.total_spent)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Cliente</DialogTitle>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-6">
              <Card>
                <CardContent className="p-4 space-y-2">
                  <p className="font-medium text-lg">{selectedCustomer.name || 'Nome não informado'}</p>
                  <p className="text-muted-foreground">{selectedCustomer.email}</p>
                  {selectedCustomer.phone && (
                    <p className="text-muted-foreground">{selectedCustomer.phone}</p>
                  )}
                  <div className="flex gap-4 pt-2 border-t mt-2">
                    <div>
                      <p className="text-2xl font-bold text-primary">{selectedCustomer.total_orders}</p>
                      <p className="text-xs text-muted-foreground">Pedidos</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-primary">{formatCurrencyBRL(selectedCustomer.total_spent)}</p>
                      <p className="text-xs text-muted-foreground">Total gasto</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div>
                <h4 className="font-medium mb-3">Histórico de Pedidos</h4>
                {customerOrders.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum pedido realizado.</p>
                ) : (
                  <div className="space-y-2">
                    {customerOrders.map((order) => (
                      <Card key={order.id}>
                        <CardContent className="p-3 flex justify-between items-center">
                          <div>
                            <p className="font-medium">#{order.order_number}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(order.created_at).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{formatCurrencyBRL(order.total)}</p>
                            <Badge variant="outline" className="text-xs">
                              {statusLabels[order.status] || order.status}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};