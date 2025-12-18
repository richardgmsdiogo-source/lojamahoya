import { Leaf, Flame, Heart, Sparkles } from 'lucide-react';

const benefits = [
  {
    icon: Leaf,
    title: 'Feito Artesanalmente',
    description: 'Cada produto é criado à mão com atenção aos detalhes e muito carinho.',
  },
  {
    icon: Sparkles,
    title: 'Ingredientes Selecionados',
    description: 'Utilizamos apenas matérias-primas de qualidade e origem consciente.',
  },
  {
    icon: Heart,
    title: 'Pensado para Dois',
    description: 'Aromas desenvolvidos para criar conexão e momentos especiais a dois.',
  },
  {
    icon: Flame,
    title: 'Produção Limitada',
    description: 'Lotes exclusivos que garantem a qualidade e singularidade de cada item.',
  },
];

export const BenefitsSection = () => {
  return (
    <section className="py-16 md:py-24 bg-secondary/30">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="font-script text-3xl md:text-4xl lg:text-5xl text-primary mb-4">
            Por que escolher Mahoya?
          </h2>
          <p className="font-serif text-muted-foreground max-w-2xl mx-auto">
            Cada detalhe é pensado para proporcionar uma experiência sensorial única
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {benefits.map((benefit, index) => (
            <div
              key={index}
              className="text-center p-6 rounded-lg bg-card shadow-sm transition-all duration-300 hover:shadow-md"
            >
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent/20">
                <benefit.icon className="h-7 w-7 text-accent" />
              </div>
              <h3 className="font-script text-xl text-primary mb-2">{benefit.title}</h3>
              <p className="font-serif text-sm text-muted-foreground leading-relaxed">
                {benefit.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
