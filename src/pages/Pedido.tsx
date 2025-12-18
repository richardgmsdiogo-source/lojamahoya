import { Link } from 'react-router-dom';
import { Minus, Plus, Trash2, MessageCircle, ShoppingBag } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const WHATSAPP_NUMBER = '5511999999999'; // TODO: Substituir pelo número real

interface UserProfile {
  name: string | null;
  email: string | null;
  phone: string | null;
}

const Pedido = () => {
  const { items, updateQuantity, removeItem, total, clearCart } = useCart();
  const { user } = useAuth();
  const [notes, setNotes] = useState('');
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('name, email, phone')
          .eq('id', user.id)
          .maybeSingle();
        setProfile(data);
      }
    };
    fetchProfile();
  }, [user]);

  const formatCurrency = (value: number) => `R$ ${value.toFixed(2).replace('.', ',')}`;

  const generateWhatsAppMessage = () => {
    let message = `🌿 *Novo Pedido - Mahoya*\n\n`;
    if (profile) {
      message += `*Cliente:* ${profile.name || 'Não informado'}\n`;
      if (profile.phone) message += `*Telefone:* ${profile.phone}\n`;
      if (profile.email) message += `*E-mail:* ${profile.email}\n`;
      message += `\n`;
    }
    message += `*Itens do Pedido:*\n`;
    items.forEach((item) => {
      message += `• ${item.product.name} (${item.selectedSize.label}) x${item.quantity} - ${formatCurrency(item.selectedSize.price * item.quantity)}\n`;
    });
    message += `\n*Total Estimado:* ${formatCurrency(total)}`;
    if (notes) message += `\n\n*Observações:* ${notes}`;
    return encodeURIComponent(message);
  };

  const handleWhatsApp = () => {
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${generateWhatsAppMessage()}`, '_blank');
  };

  if (items.length === 0) {
    return (
      <Layout>
        <div className="container py-16 text-center">
          <ShoppingBag className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="font-script text-3xl text-primary mb-2">Seu pedido está vazio</h1>
          <p className="font-serif text-muted-foreground mb-6">Explore nossa coleção e adicione produtos.</p>
          <Button asChild><Link to="/catalogo">Ver Catálogo</Link></Button>
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
                    <p className="font-serif font-medium text-primary">{formatCurrency(item.selectedSize.price)}</p>
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
                <div className="flex justify-between font-serif"><span>Subtotal</span><span>{formatCurrency(total)}</span></div>
                <div className="border-t pt-4"><Textarea placeholder="Observações (ex: presente com bilhete)" value={notes} onChange={(e) => setNotes(e.target.value)} className="font-serif" /></div>
                <div className="flex justify-between font-serif text-lg font-semibold text-primary"><span>Total</span><span>{formatCurrency(total)}</span></div>
                <Button onClick={handleWhatsApp} className="w-full font-serif" size="lg"><MessageCircle className="mr-2 h-4 w-4" />Finalizar pelo WhatsApp</Button>
                <p className="text-xs text-center text-muted-foreground font-serif">O pagamento será combinado diretamente com a loja.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Pedido;
