import { Flame, Leaf, Heart, Sparkles } from 'lucide-react';

export const AboutSection = () => {
  return (
    <section className="py-16 md:py-24 bg-card">
      <div className="container">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Illustration */}
          <div className="relative flex justify-center">
            <div className="relative w-64 h-80 md:w-80 md:h-96">
              {/* Decorative circle */}
              <div className="absolute inset-0 rounded-full bg-secondary/50 blur-3xl" />
              
              {/* Main illustration container */}
              <div className="relative flex items-center justify-center h-full">
                <div className="relative">
                  {/* Bottle shape */}
                  <div className="w-32 h-48 md:w-40 md:h-56 border-2 border-primary rounded-t-full rounded-b-3xl flex items-center justify-center">
                    <Flame className="h-16 w-16 md:h-20 md:w-20 text-accent" />
                  </div>
                  {/* Leaves */}
                  <Leaf className="absolute -top-4 left-1/2 -translate-x-1/2 h-8 w-8 text-primary -rotate-45" />
                  <Leaf className="absolute -top-2 left-1/2 -translate-x-1/2 translate-x-2 h-8 w-8 text-primary rotate-45" />
                  {/* Sparkles */}
                  <Sparkles className="absolute top-1/4 -right-4 h-4 w-4 text-accent animate-sparkle" />
                  <Sparkles className="absolute top-1/2 -left-6 h-3 w-3 text-accent animate-sparkle" />
                </div>
              </div>
            </div>
          </div>

          {/* Text content */}
          <div>
            <h2 className="font-script text-3xl md:text-4xl lg:text-5xl text-primary mb-6">
              Sobre a Mahoya
            </h2>
            <div className="space-y-4 font-serif text-muted-foreground leading-relaxed">
              <p>
                Nascemos da crença de que pequenos rituais transformam o cotidiano em algo 
                extraordinário. <strong className="text-primary">Mahoya</strong> significa a magia que acontece quando 
                duas pessoas compartilham um momento especial.
              </p>
              <p>
                Cada aromatizante, cada vela, cada produto é criado artesanalmente com 
                ingredientes selecionados, pensando em despertar sensações e criar memórias 
                afetivas. Acreditamos que o aroma tem o poder de transportar, acolher e conectar.
              </p>
              <p className="flex items-center gap-2 text-primary font-medium">
                <Heart className="h-4 w-4 text-accent fill-accent" />
                Porque cada momento a dois merece um toque de magia.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
