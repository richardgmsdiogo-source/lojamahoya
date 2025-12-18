import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Droplets, Flame, Heart, Gift, Star, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
}

// Mapeamento de slugs para ícones
const iconMap: Record<string, React.ElementType> = {
  'home-spray': Sparkles,
  'agua-lencois': Droplets,
  'velas': Flame,
  'sabonetes': Heart,
  'kits': Gift,
};

const getIconForCategory = (slug: string) => {
  return iconMap[slug] || Star;
};

export const CategoriesSection = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      
      setCategories(data || []);
      setIsLoading(false);
    };

    fetchCategories();
  }, []);

  if (isLoading) {
    return (
      <section className="py-16 md:py-24">
        <div className="container flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </section>
    );
  }

  if (categories.length === 0) {
    return null;
  }

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
          {categories.map((category) => {
            const Icon = getIconForCategory(category.slug);
            return (
              <Link key={category.id} to={`/catalogo?categoria=${category.id}`}>
                <Card className="group h-full transition-all duration-300 hover:shadow-lg hover:shadow-accent/10 hover:-translate-y-1 bg-card border-border">
                  <CardContent className="p-6 md:p-8 text-center">
                    {category.image_url ? (
                      <div className="mx-auto mb-4 h-16 w-16 rounded-full overflow-hidden bg-secondary">
                        <img 
                          src={category.image_url} 
                          alt={category.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary transition-colors group-hover:bg-accent/20">
                        <Icon className="h-8 w-8 text-primary transition-colors group-hover:text-accent" />
                      </div>
                    )}
                    <h3 className="font-script text-xl md:text-2xl text-primary mb-2">
                      {category.name}
                    </h3>
                    {category.description && (
                      <p className="font-serif text-sm text-muted-foreground">
                        {category.description}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};
