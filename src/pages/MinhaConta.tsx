import { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Package, MapPin, User, Plus, Pencil, Trash2, ExternalLink } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatCurrencyBRL } from '@/lib/format';
import { XPCard } from '@/components/account/XPCard';

interface Address {
  id: string;
  label: string;
  recipient_name: string;
  phone: string | null;
  cep: string;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  is_default: boolean;
}

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
  status: string;
  payment_status: string;
  subtotal: number;
  shipping_cost: number;
  discount: number;
  total: number;
  tracking_code: string | null;
  tracking_url: string | null;
  notes: string | null;
  created_at: string;
  order_items: OrderItem[];
}

const statusLabels: Record<string, string> = {
  pendente: 'Pendente',
  confirmado: 'Confirmado',
  preparando: 'Preparando',
  enviado: 'Enviado',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
};

const paymentStatusLabels: Record<string, string> = {
  aguardando: 'Aguardando',
  pago: 'Pago',
  cancelado: 'Cancelado',
};

const statusColors: Record<string, string> = {
  pendente: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  confirmado: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  preparando: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  enviado: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',
  entregue: 'bg-green-500/10 text-green-600 border-green-500/20',
  cancelado: 'bg-red-500/10 text-red-600 border-red-500/20',
};

const MinhaConta = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [addressDialogOpen, setAddressDialogOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [addressForm, setAddressForm] = useState({
    label: 'Casa',
    recipient_name: '',
    phone: '',
    cep: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    is_default: false,
  });

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchOrders(), fetchAddresses()]);
    setLoading(false);
  };

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (*)
      `)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setOrders(data as Order[]);
    }
  };

  const fetchAddresses = async () => {
    const { data, error } = await supabase
      .from('customer_addresses')
      .select('*')
      .order('is_default', { ascending: false });

    if (!error && data) {
      setAddresses(data);
    }
  };

  const handleSaveAddress = async () => {
    if (!user) return;

    const addressData = {
      ...addressForm,
      user_id: user.id,
    };

    if (editingAddress) {
      const { error } = await supabase
        .from('customer_addresses')
        .update(addressData)
        .eq('id', editingAddress.id);

      if (error) {
        toast({ title: 'Erro ao atualizar endereço', variant: 'destructive' });
        return;
      }
      toast({ title: 'Endereço atualizado' });
    } else {
      const { error } = await supabase
        .from('customer_addresses')
        .insert(addressData);

      if (error) {
        toast({ title: 'Erro ao salvar endereço', variant: 'destructive' });
        return;
      }
      toast({ title: 'Endereço adicionado' });
    }

    setAddressDialogOpen(false);
    setEditingAddress(null);
    resetAddressForm();
    fetchAddresses();
  };

  const handleDeleteAddress = async (id: string) => {
    const { error } = await supabase
      .from('customer_addresses')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ title: 'Erro ao excluir endereço', variant: 'destructive' });
      return;
    }
    toast({ title: 'Endereço excluído' });
    fetchAddresses();
  };

  const openEditAddress = (address: Address) => {
    setEditingAddress(address);
    setAddressForm({
      label: address.label,
      recipient_name: address.recipient_name,
      phone: address.phone || '',
      cep: address.cep,
      street: address.street,
      number: address.number,
      complement: address.complement || '',
      neighborhood: address.neighborhood,
      city: address.city,
      state: address.state,
      is_default: address.is_default,
    });
    setAddressDialogOpen(true);
  };

  const resetAddressForm = () => {
    setAddressForm({
      label: 'Casa',
      recipient_name: '',
      phone: '',
      cep: '',
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: '',
      is_default: false,
    });
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container py-16 text-center">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </Layout>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <Layout>
      <div className="container py-8 md:py-12">
        <h1 className="font-script text-4xl text-primary mb-6">Minha Conta</h1>

        {/* Card de XP */}
        {user && (
          <div className="mb-8">
            <XPCard userId={user.id} />
          </div>
        )}

        <Tabs defaultValue="orders" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="orders" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Meus Pedidos
            </TabsTrigger>
            <TabsTrigger value="addresses" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Endereços
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="space-y-4">
            {loading ? (
              <p className="text-muted-foreground">Carregando pedidos...</p>
            ) : orders.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground font-serif mb-4">Você ainda não fez nenhum pedido.</p>
                  <Button asChild>
                    <Link to="/catalogo">Ver Catálogo</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              orders.map((order) => (
                <Card key={order.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <CardTitle className="font-serif text-lg">
                        Pedido #{order.order_number}
                      </CardTitle>
                      <div className="flex gap-2">
                        <Badge variant="outline" className={statusColors[order.status]}>
                          {statusLabels[order.status] || order.status}
                        </Badge>
                        <Badge variant="outline">
                          {paymentStatusLabels[order.payment_status] || order.payment_status}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      {order.order_items.map((item) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span className="font-serif">
                            {item.quantity}x {item.product_name}
                          </span>
                          <span className="text-muted-foreground">
                            {formatCurrencyBRL(item.total)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="border-t pt-3 flex justify-between items-center">
                      <span className="font-serif font-medium">Total</span>
                      <span className="font-serif font-semibold text-primary">
                        {formatCurrencyBRL(order.total)}
                      </span>
                    </div>
                    {order.tracking_code && (
                      <div className="bg-secondary/50 rounded-lg p-3">
                        <p className="text-sm font-medium mb-1">Rastreamento</p>
                        <div className="flex items-center gap-2">
                          <code className="text-sm bg-background px-2 py-1 rounded">
                            {order.tracking_code}
                          </code>
                          {order.tracking_url && (
                            <a
                              href={order.tracking_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline text-sm flex items-center gap-1"
                            >
                              Rastrear <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="addresses" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={addressDialogOpen} onOpenChange={setAddressDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => { setEditingAddress(null); resetAddressForm(); }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Endereço
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>
                      {editingAddress ? 'Editar Endereço' : 'Novo Endereço'}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Identificação</Label>
                        <Input
                          placeholder="Ex: Casa, Trabalho"
                          value={addressForm.label}
                          onChange={(e) => setAddressForm({ ...addressForm, label: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>CEP</Label>
                        <Input
                          placeholder="00000-000"
                          value={addressForm.cep}
                          onChange={(e) => setAddressForm({ ...addressForm, cep: e.target.value })}
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Nome do Destinatário</Label>
                      <Input
                        value={addressForm.recipient_name}
                        onChange={(e) => setAddressForm({ ...addressForm, recipient_name: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Telefone</Label>
                      <Input
                        placeholder="(00) 00000-0000"
                        value={addressForm.phone}
                        onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="col-span-2">
                        <Label>Rua</Label>
                        <Input
                          value={addressForm.street}
                          onChange={(e) => setAddressForm({ ...addressForm, street: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Número</Label>
                        <Input
                          value={addressForm.number}
                          onChange={(e) => setAddressForm({ ...addressForm, number: e.target.value })}
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Complemento</Label>
                      <Input
                        placeholder="Apto, Bloco, etc."
                        value={addressForm.complement}
                        onChange={(e) => setAddressForm({ ...addressForm, complement: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label>Bairro</Label>
                        <Input
                          value={addressForm.neighborhood}
                          onChange={(e) => setAddressForm({ ...addressForm, neighborhood: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Cidade</Label>
                        <Input
                          value={addressForm.city}
                          onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Estado</Label>
                        <Input
                          placeholder="SP"
                          maxLength={2}
                          value={addressForm.state}
                          onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value.toUpperCase() })}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="is_default"
                        checked={addressForm.is_default}
                        onCheckedChange={(checked) => setAddressForm({ ...addressForm, is_default: checked as boolean })}
                      />
                      <Label htmlFor="is_default">Endereço padrão</Label>
                    </div>
                  </div>
                  <Button onClick={handleSaveAddress} className="w-full">
                    {editingAddress ? 'Atualizar' : 'Salvar'}
                  </Button>
                </DialogContent>
              </Dialog>
            </div>

            {addresses.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground font-serif">
                    Você ainda não cadastrou nenhum endereço.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {addresses.map((address) => (
                  <Card key={address.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{address.label}</span>
                          {address.is_default && (
                            <Badge variant="secondary" className="text-xs">Padrão</Badge>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditAddress(address)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteAddress(address.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">{address.recipient_name}</p>
                      <p className="text-sm">
                        {address.street}, {address.number}
                        {address.complement && ` - ${address.complement}`}
                      </p>
                      <p className="text-sm">
                        {address.neighborhood} - {address.city}/{address.state}
                      </p>
                      <p className="text-sm text-muted-foreground">CEP: {address.cep}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default MinhaConta;