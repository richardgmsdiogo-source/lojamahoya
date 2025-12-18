import { useEffect, useState } from 'react';
import { Star, Trophy, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';

interface UserXP {
  current_xp: number;
  total_xp: number;
  level: number;
}

interface XPCardProps {
  userId: string;
}

// Calcula XP necessário para atingir um nível
const xpForLevel = (level: number): number => {
  let total = 0;
  for (let i = 2; i <= level; i++) {
    total += i * 100;
  }
  return total;
};

// Calcula XP necessário para o próximo nível
const xpForNextLevel = (currentLevel: number): number => {
  return xpForLevel(currentLevel + 1);
};

// Calcula XP atual dentro do nível
const xpInCurrentLevel = (totalXp: number, level: number): number => {
  const xpForCurrentLevel = xpForLevel(level);
  return totalXp - xpForCurrentLevel;
};

// Calcula quanto XP é necessário para subir de nível
const xpNeededForLevelUp = (level: number): number => {
  return (level + 1) * 100;
};

export const XPCard = ({ userId }: XPCardProps) => {
  const [xpData, setXpData] = useState<UserXP | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchXP = async () => {
      const { data, error } = await supabase
        .from('user_xp')
        .select('current_xp, total_xp, level')
        .eq('user_id', userId)
        .maybeSingle();

      if (!error && data) {
        setXpData(data);
      } else {
        // Se não existe registro, criar um com valores padrão
        setXpData({ current_xp: 0, total_xp: 0, level: 1 });
      }
      setLoading(false);
    };

    fetchXP();
  }, [userId]);

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/20">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-6 bg-muted rounded w-1/3"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-2 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!xpData) return null;

  const currentLevelXp = xpInCurrentLevel(xpData.total_xp, xpData.level);
  const neededForLevelUp = xpNeededForLevelUp(xpData.level);
  const progressPercent = Math.min((currentLevelXp / neededForLevelUp) * 100, 100);

  return (
    <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/20 overflow-hidden relative">
      {/* Decoração de fundo */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary/5 rounded-full translate-y-1/2 -translate-x-1/2" />
      
      <CardContent className="p-6 relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center">
                <Trophy className="h-7 w-7 text-primary" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                {xpData.level}
              </div>
            </div>
            <div>
              <h3 className="font-serif text-lg font-semibold">Nível {xpData.level}</h3>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                {xpData.total_xp.toLocaleString('pt-BR')} XP total
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-primary font-medium">
              <Star className="h-4 w-4 fill-primary" />
              <span>{currentLevelXp}</span>
              <span className="text-muted-foreground">/ {neededForLevelUp}</span>
            </div>
            <p className="text-xs text-muted-foreground">para o próximo nível</p>
          </div>
        </div>

        <div className="space-y-2">
          <Progress value={progressPercent} className="h-3 bg-primary/10" />
          <p className="text-xs text-center text-muted-foreground">
            {progressPercent.toFixed(0)}% para o Nível {xpData.level + 1}
          </p>
        </div>

        <div className="mt-4 pt-4 border-t border-border/50">
          <p className="text-xs text-muted-foreground text-center">
            🎲 Ganhe XP em cada compra e desbloqueie vantagens especiais!
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
