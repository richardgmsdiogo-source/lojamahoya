import { useEffect, useMemo, useState } from 'react';
import { Star, Quote, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';

type TestimonialRow = {
  id: string;
  rating: number;
  text: string;
  created_at: string;
  level_snapshot: number | null;
  city: string | null;
  state: string | null;
  journey_started_at: string | null;
  profile: { name: string | null } | null;
};

function levelTitle(level: number | null | undefined) {
  const lv = typeof level === 'number' ? level : null;
  if (!lv) return 'Viajante Iniciante';
  if (lv >= 20) return 'Lenda Mahoya';
  if (lv >= 15) return 'Aventureiro(a) Ouro';
  if (lv >= 10) return 'Aventureiro(a) Prata';
  if (lv >= 5) return 'Aventureiro(a) Bronze';
  return 'Viajante Iniciante';
}

function yearFromDate(dateStr?: string | null) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  return d.getFullYear();
}

function Stars({ rating }: { rating: number }) {
  const r = Math.min(5, Math.max(1, rating || 5));
  return (
    <div className="flex gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${i < r ? 'text-accent fill-accent' : 'text-border'}`}
        />
      ))}
    </div>
  );
}

export const TestimonialsSection = () => {
  const [items, setItems] = useState<TestimonialRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    async function fetchTestimonials() {
      setIsLoading(true);

      const { data: tData, error: tErr } = await supabase
        .from('testimonials')
        .select('id, user_id, rating, text, created_at, level_snapshot, city, state, journey_started_at')
        .eq('status', 'approved')
        .order('level_snapshot', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(5);

      if (tErr) {
        console.error('Erro ao carregar testimonials:', tErr);
        setItems([]);
        setIsLoading(false);
        return;
      }

      const rows = (tData ?? []) as Array<any>;

      // Busca nomes no profiles (segunda query)
      const userIds = Array.from(new Set(rows.map(r => r.user_id).filter(Boolean)));

      let profileMap = new Map<string, { name: string | null }>();

      if (userIds.length > 0) {
        const { data: pData, error: pErr } = await supabase
          .from('profiles')
          .select('id, name')
          .in('id', userIds);

        if (pErr) {
          console.warn('Sem permissão/erro ao ler profiles (vai aparecer "Aventureiro(a)"):', pErr);
        } else {
          (pData ?? []).forEach(p => profileMap.set(p.id, { name: p.name }));
        }
      }

      const merged: TestimonialRow[] = rows.map((t) => ({
        ...t,
        profile: profileMap.get(t.user_id) ?? null,
      }));

      setItems(merged);
      setIsLoading(false);
    }


    fetchTestimonials();

    return () => {
      alive = false;
    };
  }, []);

  const hasAny = items.length > 0;

  // Se quiser esconder a seção quando não tiver depoimentos aprovados:
  // if (!isLoading && !hasAny) return null;

  return (
    <section className="py-16 md:py-24">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="font-script text-3xl md:text-4xl lg:text-5xl text-primary mb-4">
            Relatos de Jornada
          </h2>
          <p className="font-serif text-muted-foreground max-w-2xl mx-auto">
            Histórias de quem já vive a magia Mahoya
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !hasAny ? (
          <p className="text-center text-muted-foreground font-serif py-10">
            Ainda não temos relatos publicados. Seja o primeiro a registrar sua jornada ✨
          </p>
        ) : (
          <div className="grid md:grid-cols-3 gap-6 md:gap-8">
            {items.map((t) => {
              const name = t.profile?.name?.trim() || 'Aventureiro(a)';
              const title = levelTitle(t.level_snapshot);
              const year = yearFromDate(t.journey_started_at) || yearFromDate(t.created_at);
              const place =
                [t.city?.trim(), t.state?.trim()].filter(Boolean).join('/') || null;

              return (
                <Card key={t.id} className="relative overflow-hidden bg-card border-border">
                  <CardContent className="p-6 md:p-8">
                    <Quote className="absolute top-4 right-4 h-8 w-8 text-accent/20" />

                    <div className="mb-4">
                      <Stars rating={t.rating} />
                    </div>

                    <p className="font-serif text-muted-foreground mb-6 leading-relaxed italic">
                      “{t.text}”
                    </p>

                    <div className="border-t border-border pt-4">
                      <p className="font-script text-lg text-primary">
                        {name}, {title}
                      </p>
                      <p className="font-serif text-sm text-muted-foreground">
                        {year ? `Jornada ativa desde ${year}` : 'Jornada ativa'}
                        {place ? ` • ${place}` : ''}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
