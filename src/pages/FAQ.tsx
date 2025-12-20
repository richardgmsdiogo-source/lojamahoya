import { Layout } from '@/components/layout/Layout';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const faqs = [
  {
    q: '🌿 Os produtos da Mahoya são artesanais?',
    a: `Sim.
Todas as criações da Mahoya são feitas artesanalmente, em pequenos lotes, com atenção aos detalhes, escolha cuidadosa de ingredientes e respeito aos processos.

Por isso, pequenas variações de cor, aroma ou acabamento podem acontecer — e fazem parte do encanto de algo feito à mão.`,
  },
  {
    q: '🕯️ As velas, cheirinhos e sabonetes são naturais?',
    a: `Utilizamos matérias-primas selecionadas e fragrâncias de alta qualidade, sempre priorizando segurança, conforto olfativo e boa performance.

Nem todos os insumos são 100% naturais, pois buscamos equilíbrio entre durabilidade, fixação do aroma e segurança no uso.

Se tiver dúvidas sobre algum ingrediente específico, é só nos chamar.`,
  },
  {
    q: '🌸 Os aromas são muito fortes?',
    a: `Nossos aromas são pensados para envolver, não dominar.

Ainda assim, a percepção de fragrância é algo pessoal. O que é suave para alguém pode ser intenso para outra pessoa.
Por isso, descrevemos cada aroma com cuidado e estamos disponíveis para orientar antes da compra.`,
  },
  {
    q: '🧭 Como escolher o aroma ideal?',
    a: `Você pode usar:
- as famílias olfativas
- a descrição sensorial de cada produto
- ou falar diretamente com a gente

Ajudar na escolha certa também faz parte da nossa jornada com você.`,
  },
  {
    q: '📦 Em quanto tempo meu pedido é enviado?',
    a: `Pedidos de produtos disponíveis em estoque são enviados em até 1 dia útil após a confirmação do pagamento.

Encomendas personalizadas possuem prazo de produção próprio, que varia conforme a criação solicitada.
Nesses casos, o prazo é sempre informado antes da confirmação do pedido.

Após o envio, o prazo de entrega passa a ser conforme o tipo de entrega definido no checkout.`,
  },
  {
    q: '🧾 Posso alterar ou cancelar meu pedido?',
    a: `Se o pedido ainda não tiver sido enviado ou entrado em produção (em caso de encomenda), conseguimos ajustar ou cancelar.

Após o envio ou início da preparação, não é possível realizar alterações, pois cada criação é feita especialmente para você.`,
  },
  {
    q: '🔁 A Mahoya aceita trocas ou devoluções?',
    a: `Sim, dentro de alguns critérios:

• Defeitos ou erro no envio: fazemos troca, reenvio ou estorno.
• Arrependimento: aceitamos devolução em até 7 dias após o recebimento, desde que o produto esteja lacrado e sem uso.
• Produtos utilizados ou abertos: não realizamos trocas ou devoluções, pois são itens de uso pessoal e sensorial.

Para mais detalhes, consulte nossa página de Trocas & Devoluções.`,
  },
  {
    q: '🌿 E se eu não gostar do aroma?',
    a: `A experiência com aromas é pessoal e subjetiva.

Por isso, não realizamos troca de produtos abertos por preferência olfativa.
Em caso de dúvida antes da compra, fale conosco — teremos prazer em orientar melhor.`,
  },
  {
    q: '🔥 As velas são seguras?',
    a: `Sim, desde que usadas corretamente.

Recomendamos:
- não deixar a vela acesa sem supervisão
- manter longe de crianças, pets e materiais inflamáveis
- usar sobre superfície resistente ao calor

As instruções acompanham o produto.`,
  },
  {
    q: '🐾 Os produtos são testados em animais?',
    a: `Não. A Mahoya não realiza testes em animais.`,
  },
  {
    q: '🧪 Posso usar os produtos em qualquer ambiente?',
    a: `Sim, mas sempre respeitando as instruções de uso.

Águas de Lençóis são indicadas para tecidos e ambientes conforme orientação na embalagem.
Home spray deve ser evitado em tecidos, pois a concentração de álcool pode manchar.
Evite uso direto na pele, salvo quando explicitamente indicado.

Demais detalhes de segurança estão na descrição do produto e na embalagem.`,
  },
  {
    q: '📍 Vocês entregam para todo o Brasil?',
    a: `Sim! Enviamos para todo o território nacional.`,
  },
  {
    q: '🌱 Pessoas sensíveis, alérgicas ou gestantes podem usar?',
    a: `Se você possui sensibilidade olfativa, alergias, asma ou está gestante, recomendamos:
- optar por aromas mais suaves
- testar em pequenas quantidades
- consultar um profissional de saúde, se necessário

Em caso de reação adversa, suspenda o uso.`,
  },
  {
    q: '📖 Posso acompanhar minha jornada (XP, nível, etc)?',
    a: `Sim!
Clientes da Mahoya acumulam experiência ao longo da jornada, que pode refletir em níveis, benefícios e pequenas surpresas.

Os detalhes de progressão estão disponíveis no menu Jornada.`,
  },
  {
    q: '📩 Como entro em contato com a Mahoya?',
    a: `Você pode nos chamar pelos canais informados no site ou redes sociais.
Confira na aba Contato.

Respondemos com calma, atenção e carinho — do jeito que a casa pede.`,
  },
];

const FAQ = () => (
  <Layout>
    <div className="container py-12 md:py-20 max-w-3xl">
      <h1 className="font-script text-4xl md:text-5xl text-primary text-center mb-8">
        Perguntas Frequentes
      </h1>

      <Accordion type="single" collapsible className="space-y-4">
        {faqs.map((faq, i) => (
          <AccordionItem key={i} value={`item-${i}`} className="bg-card border border-border rounded-lg px-6">
            <AccordionTrigger className="font-serif text-primary hover:no-underline">
              {faq.q}
            </AccordionTrigger>

            {/* aqui está o pulo do gato: respeitar quebras de linha */}
            <AccordionContent className="font-serif text-muted-foreground whitespace-pre-line leading-relaxed">
              {faq.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <p className="mt-8 text-center font-serif text-muted-foreground italic">
        A Mahoya é um ateliê artesanal. Cuidamos de cada criação — e caminhamos junto com quem escolhe entrar.
      </p>
    </div>
  </Layout>
);

export default FAQ;
