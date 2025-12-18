import { Link } from 'react-router-dom';
import { Sparkles, Leaf } from 'lucide-react';
import { Button } from '@/components/ui/button';
import mahoyaLogo from '@/assets/mahoya-logo.png';

export const HeroSection = () => {
  return (
    <section className="relative overflow-hidden py-12 md:py-16 lg:py-20">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 opacity-20">
          <Sparkles className="h-8 w-8 text-accent animate-sparkle" />
        </div>
        <div className="absolute top-40 right-20 opacity-20">
          <Leaf className="h-6 w-6 text-primary" />
        </div>
        <div className="absolute bottom-20 left-1/4 opacity-20">
          <Sparkles className="h-4 w-4 text-accent animate-sparkle" />
        </div>
        <div className="absolute bottom-40 right-1/3 opacity-20">
          <Leaf className="h-5 w-5 text-primary" />
        </div>
      </div>

      <div className="container relative">
        <div className="mx-auto max-w-3xl text-center">
          {/* Logo - increased size */}
          <img 
            src={mahoyaLogo} 
            alt="Mahoya - Magia Feita a Dois" 
            className="mx-auto mb-6 h-48 w-auto md:h-64 lg:h-72 animate-fade-in object-contain"
          />
          
          {/* Main heading - reduced letter-spacing and line-height */}
          <h1 className="font-script text-3xl md:text-4xl lg:text-5xl text-primary mb-3 animate-fade-in tracking-tight leading-tight">
            Magia feita a dois em forma de aroma
          </h1>
          
          {/* Subtitle - reduced spacing and size */}
          <p className="font-serif text-base md:text-lg text-muted-foreground mb-6 max-w-xl mx-auto leading-normal tracking-normal animate-fade-in">
            Descubra nossa coleção artesanal de aromatizantes, velas e itens de bem-estar. 
            Cada produto é pensado para criar momentos especiais.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center animate-fade-in">
            <Button asChild size="lg" className="font-serif text-sm">
              <Link to="/catalogo">
                <Leaf className="mr-2 h-4 w-4" />
                Ver Coleção
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="font-serif text-sm border-accent text-accent hover:bg-accent hover:text-accent-foreground">
              <Link to="/auth">
                <Sparkles className="mr-2 h-4 w-4" />
                Entrar / Cadastrar
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};
