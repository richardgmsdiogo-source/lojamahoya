import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { MessageCircle, Mail, MapPin } from 'lucide-react';

const WHATSAPP_NUMBER = '5511999999999';

const Contato = () => (
  <Layout>
    <div className="container py-12 md:py-20">
      <h1 className="font-script text-4xl md:text-5xl text-primary text-center mb-12">Contato</h1>
      <div className="grid md:grid-cols-2 gap-12 max-w-4xl mx-auto">
        <Card className="bg-card"><CardContent className="p-6 space-y-4">
          <h2 className="font-script text-2xl text-primary">Envie uma mensagem</h2>
          <div><Label className="font-serif">Nome</Label><Input /></div>
          <div><Label className="font-serif">E-mail</Label><Input type="email" /></div>
          <div><Label className="font-serif">Mensagem</Label><Textarea rows={4} /></div>
          <Button className="w-full font-serif">Enviar</Button>
        </CardContent></Card>
        <div className="space-y-6">
          <div><h2 className="font-script text-2xl text-primary mb-4">Fale conosco</h2><p className="font-serif text-muted-foreground">Prefere um atendimento mais rápido? Chame a gente no WhatsApp!</p></div>
          <Button asChild variant="outline" size="lg" className="w-full font-serif border-accent text-accent hover:bg-accent hover:text-accent-foreground">
            <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer"><MessageCircle className="mr-2 h-4 w-4" />Falar no WhatsApp</a>
          </Button>
          <div className="space-y-3 pt-4 border-t">
            <p className="flex items-center gap-3 font-serif text-muted-foreground"><Mail className="h-4 w-4 text-primary" />contato@mahoya.com.br</p>
            <p className="flex items-center gap-3 font-serif text-muted-foreground"><MapPin className="h-4 w-4 text-primary" />São Paulo, SP</p>
          </div>
        </div>
      </div>
    </div>
  </Layout>
);

export default Contato;
