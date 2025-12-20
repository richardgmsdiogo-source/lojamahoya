import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MessageCircle, Instagram, Mail, MapPin } from 'lucide-react';

const WHATSAPP_NUMBER = '5531986841995';
const INSTAGRAM_URL = 'https://instagram.com/lojamahoya'; // <- ajuste
const EMAIL = 'lojamahoya@gmail.com';

const Contato = () => (
  <Layout>
    <div className="container py-12 md:py-20">
      <h1 className="font-script text-4xl md:text-5xl text-primary text-center mb-10">
        Contato
      </h1>

      <div className="max-w-2xl mx-auto">
        <Card className="bg-card">
          <CardContent className="p-8 md:p-10">
            <div className="text-center space-y-2 mb-8">
              <h2 className="font-script text-2xl text-primary">Fale com a Mahoya</h2>
              <p className="font-serif text-muted-foreground">
                Atendimento por WhatsApp e Instagram. Também respondemos por e-mail.
              </p>
            </div>

            <div className="grid gap-3">
              <Button
                asChild
                size="lg"
                className="w-full font-serif"
              >
                <a
                  href={`https://wa.me/${WHATSAPP_NUMBER}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  WhatsApp
                </a>
              </Button>

              <Button
                asChild
                variant="outline"
                size="lg"
                className="w-full font-serif border-accent text-accent hover:bg-accent hover:text-accent-foreground"
              >
                <a
                  href={INSTAGRAM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Instagram className="mr-2 h-4 w-4" />
                  Instagram
                </a>
              </Button>

              <Button
                asChild
                variant="outline"
                size="lg"
                className="w-full font-serif"
              >
                <a href={`mailto:${EMAIL}`}>
                  <Mail className="mr-2 h-4 w-4" />
                  {EMAIL}
                </a>
              </Button>
            </div>

            <div className="mt-8 pt-6 border-t">
              <p className="flex items-center justify-center gap-3 font-serif text-muted-foreground">
                <MapPin className="h-4 w-4 text-primary" />
                Santa Luzia, MG
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  </Layout>
);

export default Contato;
