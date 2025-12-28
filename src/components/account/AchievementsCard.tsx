import { useEffect, useState } from 'react';
import { Trophy, Lock, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';

interface Achievement {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  xp_reward: number | null;
  requirement_type: string;
  requirement_value: number | null;
}

interface UserAchievement {
  achievement_id: string;
  unlocked_at: string | null;
}

interface AchievementsCardProps {
  userId: string;
  totalOrders: number;
  totalSpent: number;
  uniqueItems: number;
}

export const AchievementsCard = ({ userId, totalOrders, totalSpent, uniqueItems }: AchievementsCardProps) => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [userId]);

  const fetchData = async () => {
    setLoading(true);
    
    const [achRes, userAchRes] = await Promise.all([
      supabase
        .from('achievements')
        .select('*')
        .eq('is_active', true)
        .order('requirement_value', { ascending: true }),
      supabase
        .from('user_achievements')
        .select('achievement_id, unlocked_at')
        .eq('user_id', userId)
    ]);

    if (!achRes.error && achRes.data) {
      setAchievements(achRes.data);
    }

    if (!userAchRes.error && userAchRes.data) {
      setUserAchievements(userAchRes.data);
    }

    setLoading(false);
  };

  const isUnlocked = (achievementId: string) => {
    return userAchievements.some(ua => ua.achievement_id === achievementId);
  };

  const getProgress = (achievement: Achievement): { current: number; target: number; percent: number } => {
    const target = achievement.requirement_value || 1;
    let current = 0;

    switch (achievement.requirement_type) {
      case 'orders_count':
        current = totalOrders;
        break;
      case 'total_spent':
        current = totalSpent;
        break;
      case 'unique_products':
        current = uniqueItems;
        break;
      case 'manual':
        current = isUnlocked(achievement.id) ? 1 : 0;
        break;
      default:
        current = isUnlocked(achievement.id) ? target : 0;
    }

    const percent = Math.min((current / target) * 100, 100);
    return { current: Math.min(current, target), target, percent };
  };

  const unlockedCount = achievements.filter(a => isUnlocked(a.id) || getProgress(a).percent >= 100).length;

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-serif flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Conquistas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-muted rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (achievements.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-serif flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Conquistas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhuma conquista disponível no momento.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="font-serif flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          Conquistas
          <span className="text-sm text-muted-foreground font-normal">
            ({unlockedCount}/{achievements.length})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3">
          {achievements.map((achievement) => {
            const progress = getProgress(achievement);
            const unlocked = isUnlocked(achievement.id) || progress.percent >= 100;

            return (
              <div
                key={achievement.id}
                className={[
                  'rounded-lg border p-3 transition',
                  unlocked ? 'bg-card' : 'bg-muted/40 opacity-80',
                ].join(' ')}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`text-2xl ${unlocked ? '' : 'grayscale opacity-50'}`}>
                      {achievement.icon || '🏆'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-serif font-medium truncate">{achievement.name}</p>
                        {unlocked && <Check className="h-4 w-4 text-green-500 shrink-0" />}
                      </div>
                      <p className="text-xs text-muted-foreground">{achievement.description}</p>
                      {achievement.xp_reward && achievement.xp_reward > 0 && (
                        <p className="text-xs text-primary mt-1">+{achievement.xp_reward} XP</p>
                      )}
                    </div>
                  </div>
                  <Badge variant="outline" className="shrink-0">
                    {progress.current}/{progress.target}
                  </Badge>
                </div>
                {achievement.requirement_type !== 'manual' && (
                  <Progress value={progress.percent} className="mt-2 h-2" />
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
