import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Shield } from 'lucide-react';

const Bullet = ({ children }: { children: React.ReactNode }) => (
  <li className="font-serif text-muted-foreground leading-relaxed">{children}</li>
);

const Para = ({ children }: { children: React.ReactNode }) => (
  <p className="font-serif text-muted-foreground leading-relaxed">{children}</p>
);

const Privacidade = () => {
  return (
    <Layout>
      <div className="container py-10 md:py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h1 className="font-script text-4xl md:text-5xl text-primary mb-3">
              Política de Privacidade
            </h1>
            <p className="font-serif text-muted-foreground">
              Como protegemos seus dados durante sua jornada no ateliê Mahoya.
            </p>
          </div>

          <Card className="bg-card">
            <CardHeader className="pb-4">
              <CardTitle className="font-serif text-lg flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Privacidade e proteção de dados
              </CardTitle>
            </CardHeader>

            <CardContent className="p-6 md:p-8 space-y-6">
                {/* Introdução */}
                <p className="font-serif text-muted-foreground leading-relaxed">
                A Mahoya respeita a sua privacidade e se compromete a proteger os dados pessoais
                compartilhados conosco durante sua jornada em nosso ateliê.
                </p>

                <p className="font-serif text-muted-foreground leading-relaxed">
                Ao acessar nosso site, realizar um cadastro ou efetuar uma compra, você concorda com
                esta Política de Privacidade.
                </p>

                <Separator className="my-6" />

                {/* Quais dados coletamos */}
                <h2 className="font-serif text-base text-primary">Quais dados coletamos</h2>

                <p className="font-serif text-muted-foreground leading-relaxed">
                Coletamos apenas as informações necessárias para oferecer uma boa experiência, como:
                </p>

                <ul className="list-disc pl-5 space-y-1">
                <li className="font-serif text-muted-foreground">Nome</li>
                <li className="font-serif text-muted-foreground">E-mail</li>
                <li className="font-serif text-muted-foreground">Endereço de entrega</li>
                <li className="font-serif text-muted-foreground">
                    Dados de pagamento (processados por plataformas seguras)
                </li>
                <li className="font-serif text-muted-foreground">
                    Histórico de compras e interações no site
                </li>
                </ul>

                <Separator className="my-6" />

                {/* Como utilizamos seus dados */}
                <h2 className="font-serif text-base text-primary">Como utilizamos seus dados</h2>

                <p className="font-serif text-muted-foreground leading-relaxed">
                Seus dados são utilizados para:
                </p>

                <ul className="list-disc pl-5 space-y-1">
                <li className="font-serif text-muted-foreground">Processar pedidos e entregas</li>
                <li className="font-serif text-muted-foreground">Enviar comunicações sobre sua compra</li>
                <li className="font-serif text-muted-foreground">
                    Informar novidades, lançamentos e conteúdos (quando autorizado)
                </li>
                <li className="font-serif text-muted-foreground">Melhorar sua experiência no site</li>
                <li className="font-serif text-muted-foreground">
                    Gerenciar seu progresso como aventureiro (XP, títulos e benefícios)
                </li>
                </ul>

                <Separator className="my-6" />

                {/* Segurança */}
                <h2 className="font-serif text-base text-primary">Segurança das informações</h2>

                <p className="font-serif text-muted-foreground leading-relaxed">
                Adotamos medidas técnicas e organizacionais para proteger seus dados contra acessos
                não autorizados, perda ou uso indevido.
                </p>

                <p className="font-serif text-muted-foreground leading-relaxed">
                Seus dados não são vendidos ou compartilhados com terceiros, exceto quando necessário para:
                </p>

                <ul className="list-disc pl-5 space-y-1">
                <li className="font-serif text-muted-foreground">processamento de pagamentos</li>
                <li className="font-serif text-muted-foreground">logística de entrega</li>
                <li className="font-serif text-muted-foreground">cumprimento de obrigações legais</li>
                </ul>

                <Separator className="my-6" />

                {/* Cookies */}
                <h2 className="font-serif text-base text-primary">Cookies e dados de navegação</h2>

                <p className="font-serif text-muted-foreground leading-relaxed">
                Utilizamos cookies para:
                </p>

                <ul className="list-disc pl-5 space-y-1">
                <li className="font-serif text-muted-foreground">melhorar a navegação</li>
                <li className="font-serif text-muted-foreground">entender o comportamento no site</li>
                <li className="font-serif text-muted-foreground">personalizar sua experiência</li>
                </ul>

                <p className="font-serif text-muted-foreground leading-relaxed">
                Você pode desativar os cookies a qualquer momento nas configurações do seu navegador.
                </p>

                <Separator className="my-6" />

                {/* Direitos */}
                <h2 className="font-serif text-base text-primary">Seus direitos</h2>

                <p className="font-serif text-muted-foreground leading-relaxed">
                Você pode, a qualquer momento:
                </p>

                <ul className="list-disc pl-5 space-y-1">
                <li className="font-serif text-muted-foreground">acessar seus dados</li>
                <li className="font-serif text-muted-foreground">corrigir informações</li>
                <li className="font-serif text-muted-foreground">solicitar exclusão do cadastro</li>
                <li className="font-serif text-muted-foreground">cancelar o recebimento de comunicações</li>
                </ul>

                <p className="font-serif text-muted-foreground leading-relaxed">
                Basta entrar em contato pelos nossos canais oficiais.
                </p>

                <Separator className="my-6" />

                {/* Alterações */}
                <h2 className="font-serif text-base text-primary">Alterações nesta política</h2>

                <p className="font-serif text-muted-foreground leading-relaxed">
                Esta Política de Privacidade pode ser atualizada a qualquer momento.
                Recomendamos a leitura periódica para estar sempre informado.
                </p>

                <Separator className="my-6" />

                {/* Contato */}
                <h2 className="font-serif text-base text-primary">Contato</h2>

                <p className="font-serif text-muted-foreground leading-relaxed">
                Em caso de dúvidas sobre esta política, fale conosco pelos canais oficiais da Mahoya.
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

export default Privacidade;
