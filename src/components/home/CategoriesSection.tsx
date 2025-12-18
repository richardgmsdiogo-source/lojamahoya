import { Link } from 'react-router-dom';
import { Sparkles, Droplets, Flame, Heart, Gift, Star } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const categories = [
  {
    id: 'home-spray',
    name: 'Home Spray',
    description: 'Fragrâncias envolventes para seu lar',
    icon: Sparkles,
  },
  {
    id: 'agua-lencois',
    name: 'Água de Lençóis',
    description: 'Aromas suaves para noites serenas',
    icon: Droplets,
  },
  {
    id: 'velas',
    name: 'Velas',
    description: 'Luz e perfume para momentos especiais',
    icon: Flame,
  },
  {
    id: 'sabonetes',
    name: 'Sabonetes',
    description: 'Cuidado artesanal para sua pele',
    icon: Heart,
  },
  {
    id: 'kits',
    name: 'Kits Presente',
    description: 'O presente perfeito para quem você ama',
    icon: Gift,
  },
  {
    id: 'outros',
    name: 'Outros',
    description: 'Óleos, difusores e mais',
    icon: Star,
  },
];

export const CategoriesSection = () => {
  return (
    <section className="py-16 md:py-24">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="font-script text-3xl md:text-4xl lg:text-5xl text-primary mb-4">
            Nossa Coleção
          </h2>
          <p className="font-serif text-muted-foreground max-w-2xl mx-auto">
            Explore nossas categorias e encontre o aroma perfeito para cada momento
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
          {categories.map((category) => (
            <Link key={category.id} to={`/catalogo?categoria=${category.id}`}>
              <Card className="group h-full transition-all duration-300 hover:shadow-lg hover:shadow-accent/10 hover:-translate-y-1 bg-card border-border">
                <CardContent className="p-6 md:p-8 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary transition-colors group-hover:bg-accent/20">
                    <category.icon className="h-8 w-8 text-primary transition-colors group-hover:text-accent" />
                  </div>
                  <h3 className="font-script text-xl md:text-2xl text-primary mb-2">
                    {category.name}
                  </h3>
                  <p className="font-serif text-sm text-muted-foreground">
                    {category.description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};
