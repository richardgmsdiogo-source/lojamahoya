import { Layout } from '@/components/layout/Layout';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const faqs = [
  { q: 'Qual o prazo de produção?', a: 'Como nossos produtos são artesanais, o prazo de produção é de 3 a 7 dias úteis, dependendo da disponibilidade.' },
  { q: 'Como funciona a entrega?', a: 'Enviamos para todo o Brasil via Correios ou transportadora. O frete é calculado no momento do pedido via WhatsApp.' },
  { q: 'Posso personalizar os aromas?', a: 'Sim! Para pedidos acima de 5 unidades, oferecemos personalização de aromas. Entre em contato conosco.' },
  { q: 'As velas são seguras?', a: 'Todas as nossas velas são feitas com cera vegetal e pavios de algodão. Sempre use em superfícies estáveis e nunca deixe sem supervisão.' },
  { q: 'Qual a política de trocas?', a: 'Aceitamos trocas em até 7 dias para produtos lacrados. Itens com defeito são substituídos sem custo adicional.' },
];

const FAQ = () => (
  <Layout>
    <div className="container py-12 md:py-20 max-w-3xl">
      <h1 className="font-script text-4xl md:text-5xl text-primary text-center mb-8">Perguntas Frequentes</h1>
      <Accordion type="single" collapsible className="space-y-4">
        {faqs.map((faq, i) => (
          <AccordionItem key={i} value={`item-${i}`} className="bg-card border border-border rounded-lg px-6">
            <AccordionTrigger className="font-serif text-primary hover:no-underline">{faq.q}</AccordionTrigger>
            <AccordionContent className="font-serif text-muted-foreground">{faq.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  </Layout>
);

export default FAQ;
