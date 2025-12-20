import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { RefreshCcw } from 'lucide-react';

const Para = ({ children }: { children: React.ReactNode }) => (
  <p className="font-serif text-muted-foreground leading-relaxed">{children}</p>
);

const Bullet = ({ children }: { children: React.ReactNode }) => (
  <li className="font-serif text-muted-foreground leading-relaxed">{children}</li>
);

const Trocas = () => {
  return (
    <Layout>
      <div className="container py-10 md:py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h1 className="font-script text-4xl md:text-5xl text-primary mb-3">
              Trocas e Devoluções
            </h1>
            <p className="font-serif text-muted-foreground">
              Um imprevisto? A gente resolve com carinho e transparência.
            </p>
          </div>

          <Card className="bg-card">
            <CardHeader className="pb-4">
              <CardTitle className="font-serif text-lg flex items-center gap-2">
                <RefreshCcw className="h-4 w-4 text-primary" />
                Política de trocas
              </CardTitle>
            </CardHeader>

            <CardContent className="p-6 md:p-8 space-y-6">
                <p className="font-serif text-muted-foreground leading-relaxed">
                Cada criação da Mahoya é feita artesanalmente, em pequenos lotes, com ingredientes selecionados e intenção em cada detalhe.
                Por isso, nossas trocas e devoluções seguem algumas diretrizes para garantir cuidado com você e com nossas criações.
                </p>

                <Separator className="my-6" />

                <h2 className="font-serif text-base text-primary">Produto com defeito ou erro no envio</h2>

                <p className="font-serif text-muted-foreground leading-relaxed">
                Se seu pedido chegar com:
                </p>

                <ul className="list-disc pl-5 space-y-1">
                <li className="font-serif text-muted-foreground">defeito de fabricação</li>
                <li className="font-serif text-muted-foreground">avaria no transporte</li>
                <li className="font-serif text-muted-foreground">item diferente do solicitado</li>
                </ul>

                <p className="font-serif text-muted-foreground leading-relaxed">
                Entre em contato conosco em até 7 dias corridos após o recebimento, informando o ocorrido.
                Após análise, realizaremos a troca, reenvio ou estorno, conforme o caso.
                </p>

                <Separator className="my-6" />

                <h2 className="font-serif text-base text-primary">Arrependimento da compra</h2>

                <p className="font-serif text-muted-foreground leading-relaxed">
                Para compras realizadas online, o cancelamento pode ser solicitado em até 7 dias corridos após o recebimento, desde que:
                </p>

                <ul className="list-disc pl-5 space-y-1">
                <li className="font-serif text-muted-foreground">o produto esteja lacrado</li>
                <li className="font-serif text-muted-foreground">sem sinais de uso</li>
                <li className="font-serif text-muted-foreground">e em sua embalagem original</li>
                </ul>

                <p className="font-serif text-muted-foreground leading-relaxed">
                Nesses casos, o custo do frete de devolução pode ser de responsabilidade do cliente.
                </p>

                <Separator className="my-6" />

                <h2 className="font-serif text-base text-primary">Aromas e preferências pessoais</h2>

                <p className="font-serif text-muted-foreground leading-relaxed">
                A experiência com aromas é única e subjetiva. Por esse motivo, produtos abertos ou utilizados não podem ser trocados
                ou devolvidos, mesmo que o aroma não tenha agradado.
                </p>

                <p className="font-serif text-muted-foreground leading-relaxed">
                Se tiver dúvidas antes de escolher, estamos sempre disponíveis para ajudar a encontrar o aroma que mais combina com sua jornada.
                </p>

                <Separator className="my-6" />

                <h2 className="font-serif text-base text-primary">Encomendas personalizadas</h2>

                <p className="font-serif text-muted-foreground leading-relaxed">
                Produtos feitos sob encomenda ou personalizados:
                </p>

                <ul className="list-disc pl-5 space-y-1">
                <li className="font-serif text-muted-foreground">não podem ser cancelados após o início da produção</li>
                <li className="font-serif text-muted-foreground">nem devolvidos após a entrega, exceto em caso de defeito</li>
                </ul>

                <p className="font-serif text-muted-foreground leading-relaxed">
                O prazo de produção é informado previamente, de acordo com a solicitação.
                </p>

                <Separator className="my-6" />

                <h2 className="font-serif text-base text-primary">Como solicitar troca ou devolução</h2>

                <p className="font-serif text-muted-foreground leading-relaxed">
                Entre em contato pelo nosso canal oficial informando:
                </p>

                <ul className="list-disc pl-5 space-y-1">
                <li className="font-serif text-muted-foreground">número do pedido</li>
                <li className="font-serif text-muted-foreground">nome completo</li>
                <li className="font-serif text-muted-foreground">descrição do ocorrido</li>
                <li className="font-serif text-muted-foreground">fotos, se necessário</li>
                </ul>

                <p className="font-serif text-muted-foreground leading-relaxed">
                Nosso time analisará o caso e retornará com as orientações.
                </p>

                <Separator className="my-6" />

                <h2 className="font-serif text-base text-primary">Considerações finais</h2>

                <p className="font-serif text-muted-foreground leading-relaxed">
                Cuidamos de cada criação com atenção, tempo e intenção. Esperamos que esse cuidado também acompanhe você ao receber sua encomenda.
                </p>
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

export default Trocas;
