import { Star, Quote } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const testimonials = [
  {
    name: 'Marina & Pedro',
    location: 'São Paulo, SP',
    text: 'O home spray Noite Encantada transformou nossos finais de semana. Cada vez que borrifamos, é como se o ambiente se preparasse para um momento especial.',
    rating: 5,
  },
  {
    name: 'Carolina & Lucas',
    location: 'Curitiba, PR',
    text: 'Presenteamos nossos padrinhos com o Kit Romance e foi um sucesso! A qualidade dos produtos é impecável e o aroma é simplesmente divino.',
    rating: 5,
  },
  {
    name: 'Juliana & Rafael',
    location: 'Belo Horizonte, MG',
    text: 'As velas Mahoya têm um perfume que permanece por horas sem ser enjoativo. Viraram essenciais em nossos jantares românticos.',
    rating: 5,
  },
];

export const TestimonialsSection = () => {
  return (
    <section className="py-16 md:py-24">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="font-script text-3xl md:text-4xl lg:text-5xl text-primary mb-4">
            O que dizem nossos clientes
          </h2>
          <p className="font-serif text-muted-foreground max-w-2xl mx-auto">
            Histórias de quem já vive a magia Mahoya
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 md:gap-8">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="relative overflow-hidden bg-card border-border">
              <CardContent className="p-6 md:p-8">
                <Quote className="absolute top-4 right-4 h-8 w-8 text-accent/20" />
                
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 text-accent fill-accent" />
                  ))}
                </div>
                
                <p className="font-serif text-muted-foreground mb-6 leading-relaxed italic">
                  "{testimonial.text}"
                </p>
                
                <div className="border-t border-border pt-4">
                  <p className="font-script text-lg text-primary">{testimonial.name}</p>
                  <p className="font-serif text-sm text-muted-foreground">{testimonial.location}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
