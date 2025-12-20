import { Link } from 'react-router-dom';
import { Minus, Plus, Trash2, MessageCircle, ShoppingBag, MapPin, Dice6 } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatCurrencyBRL } from '@/lib/format';

const WHATSAPP_NUMBER = '5531986841995'; // TODO: Substituir pelo número real

interface UserProfile {
  name: string | null;
  email: string | null;
  phone: string | null;
}

interface Address {
  id: string;
  label: string;
  recipient_name: string;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  cep: string;
}

interface D20Roll {
  id: string;
  roll_result: number;
  prize_code: string;
  prize_title: string;
  prize_description: string;
  used_at: string | null;
}

const Pedido = () => {
  const { items, updateQuantity, removeItem, total, clearCart } = useCart();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [notes, setNotes] = useState('');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [d20Roll, setD20Roll] = useState<D20Roll | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (user) {
        const [profileRes, addressesRes, d20Res] = await Promise.all([
          supabase.from('profiles').select('name, email, phone').eq('id', user.id).maybeSingle(),
          supabase.from('customer_addresses').select('*').order('is_default', { ascending: false }),
          supabase.from('d20_rolls').select('*').eq('user_id', user.id).is('used_at', null).maybeSingle(),
        ]);
        
        if (profileRes.data) setProfile(profileRes.data);
        if (addressesRes.data) {
          setAddresses(addressesRes.data);
          const defaultAddr = addressesRes.data.find((a) => a.is_default);
          if (defaultAddr) setSelectedAddressId(defaultAddr.id);
        }
        if (d20Res.data) setD20Roll(d20Res.data);
      }
    };
    fetchData();
  }, [user]);

  const selectedAddress = addresses.find((a) => a.id === selectedAddressId);

  const generateWhatsAppMessage = (orderNumber: number) => {
    let message = `🌿 *Novo Pedido #${orderNumber} - Mahoya*\n\n`;
    if (profile) {
      message += `*Cliente:* ${profile.name || 'Não informado'}\n`;
      if (profile.phone) message += `*Telefone:* ${profile.phone}\n`;
      if (profile.email) message += `*E-mail:* ${profile.email}\n`;
    }
    if (selectedAddress) {
      message += `\n*Endereço de Entrega:*\n`;
      message += `${selectedAddress.recipient_name}\n`;
      message += `${selectedAddress.street}, ${selectedAddress.number}`;
      if (selectedAddress.complement) message += ` - ${selectedAddress.complement}`;
      message += `\n${selectedAddress.neighborhood} - ${selectedAddress.city}/${selectedAddress.state}\n`;
      message += `CEP: ${selectedAddress.cep}\n`;
    }
    message += `\n*Itens do Pedido:*\n`;
    items.forEach((item) => {
      message += `• ${item.product.name} (${item.selectedSize.label}) x${item.quantity} - ${formatCurrencyBRL(item.selectedSize.price * item.quantity)}\n`;
    });
    message += `\n*Total:* ${formatCurrencyBRL(total)}`;
    
    // Include D20 prize if available
    if (d20Roll) {
      message += `\n\n🎲 *Prêmio D20 (Rolou ${d20Roll.roll_result}):*\n`;
      message += `${d20Roll.prize_title} - ${d20Roll.prize_description}\n`;
      message += `Código: ${d20Roll.prize_code}`;
    }
    
    if (notes) message += `\n\n*Observações:* ${notes}`;
    return encodeURIComponent(message);
  };

  const handleFinalizarPedido = async () => {
    if (!isAuthenticated || !user) {
      toast({ title: 'Faça login para finalizar o pedido', variant: 'destructive' });
      return;
    }

    if (items.length === 0) {
      toast({ title: 'Carrinho vazio', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);

    try {
      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          address_id: selectedAddressId || null,
          subtotal: total,
          total: total,
          notes: notes || null,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = items.map((item) => ({
        order_id: order.id,
        product_id: item.product.id,
        product_name: `${item.product.name} - ${item.selectedSize.label}`,
        product_price: item.selectedSize.price,
        quantity: item.quantity,
        total: item.selectedSize.price * item.quantity,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Mark D20 roll as used if applicable
      if (d20Roll) {
        await supabase
          .from('d20_rolls')
          .update({ used_at: new Date().toISOString(), used_in_order_id: order.id })
          .eq('id', d20Roll.id);
      }

      // Open WhatsApp
      window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${generateWhatsAppMessage(order.order_number)}`, '_blank');

      toast({ title: 'Pedido criado com sucesso!' });
      clearCart();
    } catch (error) {
      console.error('Error creating order:', error);
      toast({ title: 'Erro ao criar pedido', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <Layout>
        <div className="container py-16 text-center">
          <ShoppingBag className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="font-script text-3xl text-primary mb-2">Seu pedido está vazio</h1>
          <p className="font-serif text-muted-foreground mb-6">Explore nossa coleção e adicione produtos.</p>
          <Button asChild><Link to="/catalogo">Ver Inventário do Ateliê</Link></Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-8 md:py-12">
        <h1 className="font-script text-4xl text-primary mb-8 text-center">Meu Pedido</h1>
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <Card key={`${item.product.id}-${item.selectedSize.id}`} className="bg-card">
                <CardContent className="p-4 flex gap-4">
                  <img src={item.product.image} alt={item.product.name} className="w-20 h-20 object-cover rounded-lg bg-secondary" />
                  <div className="flex-1">
                    <h3 className="font-script text-lg text-primary">{item.product.name}</h3>
                    <p className="text-sm text-muted-foreground font-serif">{item.selectedSize.label}</p>
                    <p className="font-serif font-medium text-primary">{formatCurrencyBRL(item.selectedSize.price)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => removeItem(item.product.id, item.selectedSize.id)}><Trash2 className="h-4 w-4" /></Button>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.product.id, item.selectedSize.id, item.quantity - 1)}><Minus className="h-3 w-3" /></Button>
                      <span className="w-8 text-center font-serif">{item.quantity}</span>
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.product.id, item.selectedSize.id, item.quantity + 1)}><Plus className="h-3 w-3" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div>
            <Card className="sticky top-24 bg-card">
              <CardContent className="p-6 space-y-4">
                <h3 className="font-script text-xl text-primary">Resumo</h3>
                
                {isAuthenticated && addresses.length > 0 && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Endereço de Entrega
                    </Label>
                    <Select value={selectedAddressId} onValueChange={setSelectedAddressId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um endereço" />
                      </SelectTrigger>
                      <SelectContent>
                        {addresses.map((addr) => (
                          <SelectItem key={addr.id} value={addr.id}>
                            {addr.label} - {addr.street}, {addr.number}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedAddress && (
                      <p className="text-xs text-muted-foreground">
                        {selectedAddress.neighborhood} - {selectedAddress.city}/{selectedAddress.state}
                      </p>
                    )}
                  </div>
                )}

                {isAuthenticated && addresses.length === 0 && (
                  <div className="bg-secondary/50 rounded-lg p-3">
                    <p className="text-sm text-muted-foreground mb-2">Nenhum endereço cadastrado.</p>
                    <Button variant="outline" size="sm" asChild>
                      <Link to="/minha-conta">Cadastrar Endereço</Link>
                    </Button>
                  </div>
                )}

                <div className="flex justify-between font-serif"><span>Subtotal</span><span>{formatCurrencyBRL(total)}</span></div>
                
                {/* D20 Prize Display */}
                {d20Roll && (
                  <div className="bg-primary/10 rounded-lg p-3 border border-primary/20">
                    <div className="flex items-center gap-2 mb-1">
                      <Dice6 className="h-4 w-4 text-primary" />
                      <span className="font-serif text-sm font-medium text-primary">Prêmio D20 (Rolou {d20Roll.roll_result})</span>
                    </div>
                    <p className="font-serif text-sm text-primary/80">{d20Roll.prize_title}</p>
                    <p className="font-serif text-xs text-muted-foreground">{d20Roll.prize_description}</p>
                  </div>
                )}
                
                <div className="border-t pt-4">
                  <Textarea 
                    placeholder="Observações (ex: presente com bilhete)" 
                    value={notes} 
                    onChange={(e) => setNotes(e.target.value)} 
                    className="font-serif" 
                  />
                </div>
                <div className="flex justify-between font-serif text-lg font-semibold text-primary"><span>Total</span><span>{formatCurrencyBRL(total)}</span></div>
                
                {!isAuthenticated ? (
                  <div className="space-y-2">
                    <p className="text-sm text-center text-muted-foreground">Faça login para finalizar o pedido</p>
                    <Button asChild className="w-full">
                      <Link to="/auth">Entrar / Cadastrar</Link>
                    </Button>
                  </div>
                ) : (
                  <Button 
                    onClick={handleFinalizarPedido} 
                    className="w-full font-serif" 
                    size="lg"
                    disabled={isSubmitting}
                  >
                    <MessageCircle className="mr-2 h-4 w-4" />
                    {isSubmitting ? 'Criando pedido...' : 'Finalizar pelo WhatsApp'}
                  </Button>
                )}
                
                <p className="text-xs text-center text-muted-foreground font-serif">
                  O pagamento será combinado diretamente com a loja.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Pedido;
