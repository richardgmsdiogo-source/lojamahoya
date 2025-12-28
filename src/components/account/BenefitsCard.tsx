import { useEffect, useState } from 'react';
import { Gift, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrencyBRL } from '@/lib/format';

interface UserBenefit {
  id: string;
  name: string;
  description: string | null;
  discount_percent: number | null;
  discount_fixed: number | null;
  valid_until: string | null;
  is_used: boolean | null;
  used_at: string | null;
  created_at: string | null;
}

interface BenefitsCardProps {
  userId: string;
}

export const BenefitsCard = ({ userId }: BenefitsCardProps) => {
  const [benefits, setBenefits] = useState<UserBenefit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBenefits();
  }, [userId]);

  const fetchBenefits = async () => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from('user_benefits')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setBenefits(data);
    }

    setLoading(false);
  };

  const isExpired = (validUntil: string | null) => {
    if (!validUntil) return false;
    return new Date(validUntil) < new Date();
  };

  const activeBenefits = benefits.filter(b => !b.is_used && !isExpired(b.valid_until));
  const usedOrExpiredBenefits = benefits.filter(b => b.is_used || isExpired(b.valid_until));

  const formatDiscount = (benefit: UserBenefit) => {
    if (benefit.discount_percent && benefit.discount_percent > 0) {
      return `${benefit.discount_percent}% OFF`;
    }
    if (benefit.discount_fixed && benefit.discount_fixed > 0) {
      return `${formatCurrencyBRL(benefit.discount_fixed)} OFF`;
    }
    return 'Benefício especial';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-serif flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            Meus Benefícios
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="h-16 bg-muted rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="font-serif flex items-center gap-2">
          <Gift className="h-5 w-5 text-primary" />
          Meus Benefícios
          {activeBenefits.length > 0 && (
            <Badge variant="default" className="ml-auto">
              {activeBenefits.length} ativo{activeBenefits.length !== 1 ? 's' : ''}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {benefits.length === 0 ? (
          <div className="text-center py-6">
            <Gift className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-sm text-muted-foreground">
              Você ainda não tem benefícios.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Continue comprando para desbloquear vantagens especiais!
            </p>
          </div>
        ) : (
          <>
            {/* Benefícios ativos */}
            {activeBenefits.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Disponíveis para uso
                </p>
                {activeBenefits.map((benefit) => (
                  <div
                    key={benefit.id}
                    className="rounded-lg border border-primary/30 bg-primary/5 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-serif font-medium">{benefit.name}</p>
                          <Badge variant="default" className="text-xs">
                            {formatDiscount(benefit)}
                          </Badge>
                        </div>
                        {benefit.description && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {benefit.description}
                          </p>
                        )}
                        {benefit.valid_until && (
                          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Válido até {new Date(benefit.valid_until).toLocaleDateString('pt-BR')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Benefícios usados ou expirados */}
            {usedOrExpiredBenefits.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Histórico
                </p>
                {usedOrExpiredBenefits.map((benefit) => {
                  const expired = isExpired(benefit.valid_until);
                  const used = benefit.is_used;
                  
                  return (
                    <div
                      key={benefit.id}
                      className="rounded-lg border bg-muted/30 p-3 opacity-60"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-serif font-medium text-sm line-through">
                              {benefit.name}
                            </p>
                            {used ? (
                              <Badge variant="outline" className="text-xs flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                Usado
                              </Badge>
                            ) : expired ? (
                              <Badge variant="outline" className="text-xs flex items-center gap-1 text-destructive">
                                <XCircle className="h-3 w-3" />
                                Expirado
                              </Badge>
                            ) : null}
                          </div>
                          {used && benefit.used_at && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Usado em {new Date(benefit.used_at).toLocaleDateString('pt-BR')}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
