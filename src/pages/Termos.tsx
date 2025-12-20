import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollText } from 'lucide-react';

const Bullet = ({ children }: { children: React.ReactNode }) => (
  <li className="font-serif text-muted-foreground leading-relaxed">{children}</li>
);

const Para = ({ children }: { children: React.ReactNode }) => (
  <p className="font-serif text-muted-foreground leading-relaxed">{children}</p>
);

const Termos = () => {
  return (
    <Layout>
      <div className="container py-10 md:py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h1 className="font-script text-4xl md:text-5xl text-primary mb-3">
              Termos de Uso
            </h1>
            <p className="font-serif text-muted-foreground">
              Regras simples para uma boa aventura na Mahoya.
            </p>
          </div>

          <Card className="bg-card">
            <CardHeader className="pb-4">
              <CardTitle className="font-serif text-lg flex items-center gap-2">
                <ScrollText className="h-4 w-4 text-primary" />
                Termos e condições
              </CardTitle>
            </CardHeader>

            <CardContent className="p-6 md:p-8 space-y-6">
              <Para>
                Ao acessar o site da Mahoya, você concorda com os Termos de Uso descritos abaixo.
                Caso não concorde, recomendamos que não utilize nossos serviços.
              </Para>

              <Separator />

              <div className="space-y-3">
                <h2 className="font-serif text-base text-primary"> Sobre a Mahoya</h2>
                <Para>
                  A Mahoya é um ateliê artesanal de aromas, onde criamos velas, águas perfumadas,
                  sabonetes e outros itens sensoriais produzidos em pequenos lotes.
                </Para>
                <Para>
                  Todas as descrições, imagens e narrativas fazem parte da identidade da marca e
                  não alteram a natureza comercial do serviço.
                </Para>
              </div>

              <Separator />

              <div className="space-y-3">
                <h2 className="font-serif text-base text-primary"> Cadastro e responsabilidade do usuário</h2>
                <Para>
                  Ao se cadastrar, o aventureiro se compromete a fornecer informações verdadeiras e atualizadas.
                </Para>
                <Para>A Mahoya não se responsabiliza por:</Para>
                <ul className="list-disc pl-5 space-y-1">
                  <Bullet>dados incorretos fornecidos pelo usuário</Bullet>
                  <Bullet>atrasos causados por endereço incompleto ou errado</Bullet>
                </ul>
              </div>

              <Separator />

              <div className="space-y-3">
                <h2 className="font-serif text-base text-primary"> Compras e pagamentos</h2>
                <ul className="list-disc pl-5 space-y-1">
                  <Bullet>Os preços exibidos no site podem ser alterados sem aviso prévio</Bullet>
                  <Bullet>O pedido só é confirmado após a aprovação do pagamento</Bullet>
                  <Bullet>Produtos disponíveis em estoque são enviados em até 1 dia útil</Bullet>
                  <Bullet>Encomendas possuem prazo de produção informado previamente</Bullet>
                </ul>
              </div>

              <Separator />

              <div className="space-y-3">
                <h2 className="font-serif text-base text-primary"> Produtos artesanais e experiência sensorial</h2>
                <Para>Por se tratarem de produtos artesanais e sensoriais:</Para>
                <ul className="list-disc pl-5 space-y-1">
                  <Bullet>pequenas variações de cor, aroma ou aparência podem ocorrer</Bullet>
                  <Bullet>aromas são experiências pessoais e subjetivas</Bullet>
                </ul>
                <Para>Essas variações não caracterizam defeito.</Para>
              </div>

              <Separator />

              <div className="space-y-3">
                <h2 className="font-serif text-base text-primary"> Trocas e devoluções</h2>
                <Para>
                  As regras de trocas e devoluções estão descritas em página específica no site.
                  Ao realizar uma compra, o usuário declara estar ciente e de acordo com essa política.
                </Para>
              </div>

              <Separator />

              <div className="space-y-3">
                <h2 className="font-serif text-base text-primary"> Sistema de XP, títulos e benefícios</h2>
                <Para>
                  A Mahoya pode oferecer sistemas de experiência, títulos e recompensas como forma de gamificação.
                </Para>
                <Para>Esses benefícios:</Para>
                <ul className="list-disc pl-5 space-y-1">
                  <Bullet>não possuem valor monetário</Bullet>
                  <Bullet>podem ser ajustados ou encerrados a qualquer momento</Bullet>
                  <Bullet>seguem regras internas da Mahoya</Bullet>
                </ul>
              </div>

              <Separator />

              <div className="space-y-3">
                <h2 className="font-serif text-base text-primary"> Propriedade intelectual</h2>
                <Para>
                  Todo o conteúdo do site — textos, imagens, nomes, identidade visual e narrativa — é de
                  propriedade da Mahoya.
                </Para>
                <Para>É proibida a reprodução sem autorização prévia.</Para>
              </div>

              <Separator />

              <div className="space-y-3">
                <h2 className="font-serif text-base text-primary"> Alterações nos termos</h2>
                <Para>
                  A Mahoya pode alterar estes Termos de Uso a qualquer momento, visando melhorias ou adequações legais.
                </Para>
                <Para>
                  O uso contínuo do site após alterações implica concordância com os novos termos.
                </Para>
              </div>

              <Separator />

              <div className="space-y-3">
                <h2 className="font-serif text-base text-primary"> Contato</h2>
                <Para>Em caso de dúvidas, entre em contato pelos nossos canais oficiais.</Para>
              </div>

              <p className="text-xs text-muted-foreground font-serif text-center pt-2">
                Última atualização: {new Date().toLocaleDateString('pt-BR')}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Termos;
