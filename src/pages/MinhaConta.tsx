import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  Package,
  MapPin,
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  MessageSquare,
  Star,
  Trophy,
  UserRound,
  Shield,
  Sparkles,
} from 'lucide-react';

import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatCurrencyBRL } from '@/lib/format';
import { XPCard } from '@/components/account/XPCard';
import { AchievementsCard } from '@/components/account/AchievementsCard';
import { BenefitsCard } from '@/components/account/BenefitsCard';

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

type TestimonialStatus = 'pending' | 'approved' | 'rejected';

interface MyTestimonial {
  id: string;
  user_id: string;
  rating: number;
  text: string;
  status: TestimonialStatus;
  created_at: string;
  updated_at: string | null;
}

type ProfileLite = {
  full_name: string | null;
  phone: string | null;
};

type D20RollLite = {
  roll_result: number;
};

const statusLabels: Record<string, string> = {
  pendente: 'Pendente',
  confirmado: 'Confirmado',
  preparando: 'Preparando',
  enviado: 'Enviado',
  entregue: 'Entregue',
  cancelado: 'Cancelado',

  // encomendas (se você usar esses status)
  em_producao: 'Em produção',
  em_produção: 'Em produção',
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

  em_producao: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
  em_produção: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
};

const testimonialStatusLabel: Record<TestimonialStatus, string> = {
  pending: 'Em análise',
  approved: 'Publicado',
  rejected: 'Precisa ajustar',
};

const testimonialStatusClass: Record<TestimonialStatus, string> = {
  pending: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20',
  approved: 'bg-green-500/10 text-green-700 border-green-500/20',
  rejected: 'bg-red-500/10 text-red-700 border-red-500/20',
};

// Regra simples de XP (troca fácil depois)
const calcXPFromOrderTotal = (total: number) => Math.max(1, Math.floor((total || 0) / 10));

// Heurística: “encomenda” se status for em_producao/enviado/entregue OU notes mencionar encomenda
const isEncomenda = (o: Order) => {
  const s = (o.status || '').toLowerCase();
  const n = (o.notes || '').toLowerCase();
  return s.includes('produc') || ['enviado', 'entregue'].includes(s) || n.includes('encomenda');
};

const MinhaConta = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();

  const [orders, setOrders] = useState<Order[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);

  // perfil
  const [profile, setProfile] = useState<ProfileLite>({ full_name: null, phone: null });
  const [profileLoading, setProfileLoading] = useState(true);

  // conquistas / d20
  const [d20Rolls, setD20Rolls] = useState<D20RollLite[]>([]);
  const [d20Loading, setD20Loading] = useState(true);

  // endereço
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

  // depoimento
  const [myTestimonial, setMyTestimonial] = useState<MyTestimonial | null>(null);
  const [testimonialLoading, setTestimonialLoading] = useState(true);
  const [testimonialDialogOpen, setTestimonialDialogOpen] = useState(false);
  const [testimonialForm, setTestimonialForm] = useState({ rating: 5, text: '' });
  const [savingTestimonial, setSavingTestimonial] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchOrders(), fetchAddresses(), fetchMyTestimonial(), fetchProfileLite(), fetchD20()]);
    setLoading(false);
  };

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select(`*, order_items (*)`)
      .order('created_at', { ascending: false });

    if (!error && data) setOrders(data as Order[]);
  };

  const fetchAddresses = async () => {
    const { data, error } = await supabase
      .from('customer_addresses')
      .select('*')
      .order('is_default', { ascending: false });

    if (!error && data) setAddresses(data);
  };

  const fetchProfileLite = async () => {
    if (!user?.id) return;
    setProfileLoading(true);

    try {
      // opcional: se você tiver tabela profiles
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, phone')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;

      setProfile({
        full_name: (data as any)?.full_name ?? null,
        phone: (data as any)?.phone ?? null,
      });
    } catch {
      // fallback silencioso
      setProfile({ full_name: null, phone: null });
    } finally {
      setProfileLoading(false);
    }
  };

  const fetchD20 = async () => {
    if (!user?.id) return;
    setD20Loading(true);

    try {
      const { data } = await supabase
        .from('d20_rolls')
        .select('roll_result')
        .eq('user_id', user.id);

      setD20Rolls((data as any) || []);
    } catch {
      setD20Rolls([]);
    } finally {
      setD20Loading(false);
    }
  };

  const fetchMyTestimonial = async () => {
    if (!user?.id) return;

    setTestimonialLoading(true);
    try {
      const { data, error } = await supabase
        .from('testimonials')
        .select('id, user_id, rating, text, status, created_at, updated_at')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      const t = (data as MyTestimonial | null) ?? null;
      setMyTestimonial(t);

      setTestimonialForm({
        rating: t?.rating ?? 5,
        text: t?.text ?? '',
      });
    } catch (err: any) {
      console.error('fetchMyTestimonial error:', err);
      setMyTestimonial(null);
      setTestimonialForm({ rating: 5, text: '' });
    } finally {
      setTestimonialLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    const email = user?.email;
    if (!email) {
      toast({ title: 'Sem e-mail no usuário', variant: 'destructive' });
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth`,
    });

    if (error) {
      toast({ title: 'Erro ao solicitar troca de senha', description: error.message, variant: 'destructive' });
      return;
    }

    toast({
      title: 'Check no seu e-mail ✉️',
      description: 'Enviamos um link para você alterar sua senha.',
    });
  };

  const handleSaveAddress = async () => {
    if (!user?.id) return;

    const addressData = { ...addressForm, user_id: user.id };

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
      const { error } = await supabase.from('customer_addresses').insert(addressData);

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
    const { error } = await supabase.from('customer_addresses').delete().eq('id', id);

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

  const openTestimonialDialog = () => setTestimonialDialogOpen(true);

  const handleSaveTestimonial = async () => {
    if (!user?.id) {
      toast({
        title: 'Faça login',
        description: 'Entre para enviar seu relato.',
        variant: 'destructive',
      });
      return;
    }

    if (savingTestimonial) return;

    const text = (testimonialForm.text ?? '').trim();

    if (text.length < 20) {
      toast({
        title: 'Relato muito curto',
        description: 'Escreva pelo menos umas 20 letras pra ficar legal 🙂',
        variant: 'destructive',
      });
      return;
    }

    setSavingTestimonial(true);

    try {
      const payload = {
        user_id: user.id,
        rating: testimonialForm.rating,
        text,
        status: 'pending' as TestimonialStatus,
      };

      const { error } = await supabase.from('testimonials').upsert(payload, { onConflict: 'user_id' });
      if (error) throw error;

      toast({ title: 'Relato enviado!', description: 'Enviado para avaliação.' });

      setTestimonialDialogOpen(false);
      await fetchMyTestimonial();
    } catch (err: any) {
      console.error('SUPABASE testimonials upsert error:', err);
      toast({
        title: 'Erro ao enviar relato',
        description: err?.message || 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setSavingTestimonial(false);
    }
  };

  // ====== CONQUISTAS (calculado para passar para o componente) ======
  const totalOrders = orders.length;
  const totalSpent = useMemo(() => orders.reduce((acc, o) => acc + (o.total || 0), 0), [orders]);
  const uniqueItems = useMemo(() => {
    const s = new Set<string>();
    orders.forEach((o) => o.order_items?.forEach((it) => s.add(it.product_name)));
    return s.size;
  }, [orders]);

  const siteOrders = useMemo(() => orders.filter((o) => !isEncomenda(o)), [orders]);
  const encomendas = useMemo(() => orders.filter((o) => isEncomenda(o)), [orders]);

  if (isLoading) {
    return (
      <Layout>
        <div className="container py-16 text-center">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </Layout>
    );
  }

  if (!isAuthenticated) return <Navigate to="/auth" replace />;

  const displayName =
    profile.full_name ||
    (user?.user_metadata as any)?.full_name ||
    (user?.user_metadata as any)?.name ||
    'Aventureiro(a)';

  const displayPhone =
    profile.phone || (user?.user_metadata as any)?.phone || (user?.user_metadata as any)?.telefone || '—';

  return (
    <Layout>
      {/* padding extra pro rodapé fixo não cobrir */}
      <div className="container py-8 md:py-12 pb-28">
        <h1 className="font-script text-4xl text-primary mb-6">Área do Aventureiro</h1>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full max-w-3xl grid-cols-4">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <UserRound className="h-4 w-4" />
              Ficha
            </TabsTrigger>

            <TabsTrigger value="orders" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Registros
            </TabsTrigger>

            <TabsTrigger value="addresses" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Endereços
            </TabsTrigger>

            <TabsTrigger value="testimonial" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Relato
            </TabsTrigger>
          </TabsList>

          {/* ===== FICHA ===== */}
          <TabsContent value="profile" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Ficha do usuário */}
              <Card className="lg:col-span-2">
                <CardHeader className="pb-3">
                  <CardTitle className="font-serif flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    Ficha do Aventureiro
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label>Nome</Label>
                      <Input value={profileLoading ? 'Carregando...' : displayName} readOnly />
                    </div>

                    <div>
                      <Label>E-mail</Label>
                      <Input value={user?.email || '—'} readOnly />
                    </div>

                    <div>
                      <Label>Telefone</Label>
                      <Input value={profileLoading ? 'Carregando...' : displayPhone} readOnly />
                    </div>

                    <div className="flex items-end">
                      <Button onClick={handlePasswordReset} variant="outline" className="w-full">
                        Alterar senha
                      </Button>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Card className="bg-secondary/30">
                      <CardHeader className="pb-2">
                        <CardTitle className="font-serif text-base">Nível</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {user?.id ? <XPCard userId={user.id} /> : null}
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>

              {/* Conquistas */}
              {user?.id && (
                <AchievementsCard 
                  userId={user.id} 
                  totalOrders={totalOrders}
                  totalSpent={totalSpent}
                  uniqueItems={uniqueItems}
                />
              )}
            </div>

            {/* Benefícios */}
            {user?.id && (
              <BenefitsCard userId={user.id} />
            )}
          </TabsContent>

          {/* ===== REGISTROS (Pedidos + Encomendas) ===== */}
          <TabsContent value="orders" className="space-y-6">
            {/* PEDIDOS (SITE) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-lg">Pedidos (site)</h2>
                <Badge variant="secondary">{siteOrders.length}</Badge>
              </div>

              {loading ? (
                <p className="text-muted-foreground">Carregando pedidos...</p>
              ) : siteOrders.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground font-serif mb-4">Você ainda não fez nenhum pedido.</p>
                    <Button asChild>
                      <Link to="/catalogo">Ver Inventário do Ateliê</Link>
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                siteOrders.map((order) => {
                  const xp = calcXPFromOrderTotal(order.total);
                  return (
                    <Card key={order.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <CardTitle className="font-serif text-lg">Pedido #{order.order_number}</CardTitle>
                          <div className="flex gap-2 flex-wrap items-center">
                            <Badge variant="outline" className={statusColors[order.status] || ''}>
                              {statusLabels[order.status] || order.status}
                            </Badge>
                            <Badge variant="outline">
                              {paymentStatusLabels[order.payment_status] || order.payment_status}
                            </Badge>
                            <Badge variant="secondary">+{xp} XP</Badge>
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
                              <span className="text-muted-foreground">{formatCurrencyBRL(item.total)}</span>
                            </div>
                          ))}
                        </div>

                        <div className="border-t pt-3 flex justify-between items-center">
                          <span className="font-serif font-medium">Total</span>
                          <span className="font-serif font-semibold text-primary">{formatCurrencyBRL(order.total)}</span>
                        </div>

                        {order.tracking_code && (
                          <div className="bg-secondary/50 rounded-lg p-3">
                            <p className="text-sm font-medium mb-1">Rastreamento</p>
                            <div className="flex items-center gap-2">
                              <code className="text-sm bg-background px-2 py-1 rounded">{order.tracking_code}</code>
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
                  );
                })
              )}
            </div>

            {/* ENCOMENDAS */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-lg">Encomendas</h2>
                <Badge variant="secondary">{encomendas.length}</Badge>
              </div>

              {encomendas.length === 0 ? (
                <Card>
                  <CardContent className="py-10 text-center">
                    <p className="text-muted-foreground font-serif">
                      Nenhuma encomenda registrada ainda.
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      (Quando você tiver o fluxo de encomenda, a gente liga aqui com etapas: Em produção → Enviado → Entregue.)
                    </p>
                  </CardContent>
                </Card>
              ) : (
                encomendas.map((o) => (
                  <Card key={o.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <CardTitle className="font-serif text-lg">
                          Encomenda #{o.order_number}
                        </CardTitle>
                        <Badge variant="outline" className={statusColors[o.status] || ''}>
                          {statusLabels[o.status] || o.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {new Date(o.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Etapas: <span className="font-medium">Em produção</span> → <span className="font-medium">Enviado</span> → <span className="font-medium">Entregue</span>
                      </p>
                      <p className="text-sm">
                        Total: <span className="font-serif font-semibold text-primary">{formatCurrencyBRL(o.total)}</span>
                      </p>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* ===== ENDEREÇOS ===== */}
          <TabsContent value="addresses" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={addressDialogOpen} onOpenChange={setAddressDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    onClick={() => {
                      setEditingAddress(null);
                      resetAddressForm();
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Endereço
                  </Button>
                </DialogTrigger>

                <DialogContent className="max-w-lg you-have-a-nice-day">
                  <DialogHeader>
                    <DialogTitle>{editingAddress ? 'Editar Endereço' : 'Novo Endereço'}</DialogTitle>
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
                          onChange={(e) =>
                            setAddressForm({ ...addressForm, state: e.target.value.toUpperCase() })
                          }
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="is_default"
                        checked={addressForm.is_default}
                        onCheckedChange={(checked) =>
                          setAddressForm({ ...addressForm, is_default: checked as boolean })
                        }
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
                  <p className="text-muted-foreground font-serif">Você ainda não cadastrou nenhum endereço.</p>
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
                            <Badge variant="secondary" className="text-xs">
                              Padrão
                            </Badge>
                          )}
                        </div>

                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEditAddress(address)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => handleDeleteAddress(address.id)}
                          >
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

          {/* ===== RELATO ===== */}
          <TabsContent value="testimonial" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="font-serif">Relato de Jornada</CardTitle>
                <p className="text-sm text-muted-foreground font-serif">
                  Seu relato pode aparecer na home quando for aprovado.
                </p>
              </CardHeader>

              <CardContent className="space-y-4">
                {testimonialLoading ? (
                  <p className="text-muted-foreground">Carregando seu relato...</p>
                ) : (
                  <>
                    {myTestimonial ? (
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className={testimonialStatusClass[myTestimonial.status]}>
                              {testimonialStatusLabel[myTestimonial.status]}
                            </Badge>

                            <div className="flex gap-1">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-4 w-4 ${
                                    i < myTestimonial.rating ? 'text-accent fill-accent' : 'text-border'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>

                          <p className="font-serif text-sm text-muted-foreground italic leading-relaxed">
                            “{myTestimonial.text}”
                          </p>

                          <p className="text-xs text-muted-foreground">
                            Enviado em {new Date(myTestimonial.created_at).toLocaleDateString('pt-BR')}
                          </p>
                        </div>

                        <Button onClick={openTestimonialDialog} className="btn-seal">
                          Editar meu relato
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <p className="font-serif text-green-deep/80 mb-2">Seu Grimório ainda está em branco.</p>
                        <p className="font-serif text-muted-foreground mb-5">
                          Conte como foi sua experiência com os aromas da Mahoya e ajude outros aventureiros na escolha.
                        </p>

                        <Button
                          onClick={openTestimonialDialog}
                          variant="default"
                          className="!bg-green-deep !text-parchment hover:!bg-green-deep/90 !border !border-gold"
                        >
                          Escrever meu relato
                        </Button>

                        <p className="text-xs text-muted-foreground mt-3">
                          Seu relato vai para análise antes de aparecer na home.
                        </p>
                      </div>
                    )}

                    <Dialog open={testimonialDialogOpen} onOpenChange={setTestimonialDialogOpen}>
                      <DialogContent className="sm:max-w-xl">
                        <DialogHeader>
                          <DialogTitle className="font-title text-xl text-green-deep text-center">
                            Registrar Relato
                          </DialogTitle>
                        </DialogHeader>

                        <div className="space-y-4">
                          <div>
                            <Label>Sua nota</Label>
                            <div className="mt-2 flex gap-1">
                              {Array.from({ length: 5 }).map((_, i) => {
                                const value = i + 1;
                                return (
                                  <button
                                    key={value}
                                    type="button"
                                    onClick={() => setTestimonialForm((p) => ({ ...p, rating: value }))}
                                    className="p-1"
                                    aria-label={`Nota ${value}`}
                                  >
                                    <Star
                                      className={`h-6 w-6 ${
                                        value <= testimonialForm.rating ? 'text-accent fill-accent' : 'text-border'
                                      }`}
                                    />
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div>
                            <Label>Seu relato</Label>
                            <Textarea
                              value={testimonialForm.text}
                              onChange={(e) => setTestimonialForm((p) => ({ ...p, text: e.target.value }))}
                              rows={6}
                              placeholder='Ex: "O aroma mudou o clima aqui em casa... parece magia."'
                            />
                            <p className="text-xs text-muted-foreground mt-1">Dica: 1–3 frases já ficam incríveis.</p>
                          </div>

                          <Button
                            onClick={handleSaveTestimonial}
                            disabled={savingTestimonial}
                            variant="default"
                            className="w-full !bg-green-deep !text-parchment hover:!bg-green-deep/90 !border !border-gold disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {savingTestimonial ? 'Salvando...' : 'Enviar para avaliação'}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

    </Layout>
  );
};

export default MinhaConta;
