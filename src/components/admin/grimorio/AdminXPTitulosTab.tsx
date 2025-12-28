import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { Trophy, Search, Crown, Star } from 'lucide-react';

interface PlayerTitle {
  level: number;
  title: string;
  description: string | null;
}

interface UserWithXP {
  id: string;
  name: string | null;
  email: string | null;
  current_xp: number;
  total_xp: number;
  level: number;
  title: string;
}

// Calcula XP necessário para subir de nível
const xpNeededForLevelUp = (level: number): number => {
  return (level + 1) * 100;
};

// Calcula XP atual dentro do nível
const xpForLevel = (level: number): number => {
  let total = 0;
  for (let i = 2; i <= level; i++) {
    total += i * 100;
  }
  return total;
};

const xpInCurrentLevel = (totalXp: number, level: number): number => {
  return totalXp - xpForLevel(level);
};

export const AdminXPTitulosTab = () => {
  const [users, setUsers] = useState<UserWithXP[]>([]);
  const [titles, setTitles] = useState<PlayerTitle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const getTitleForLevel = (level: number, titlesArr: PlayerTitle[]): string => {
    // Encontra o título mais alto que o usuário tem direito
    const applicableTitles = titlesArr.filter(t => t.level <= level);
    if (applicableTitles.length === 0) return 'Iniciante';
    return applicableTitles.sort((a, b) => b.level - a.level)[0].title;
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      // Buscar títulos
      const { data: titlesData } = await supabase
        .from('player_titles')
        .select('level, title, description')
        .order('level', { ascending: true });

      const titlesArr = titlesData || [];
      setTitles(titlesArr);

      // Buscar usuários com XP
      const { data: xpData } = await supabase
        .from('user_xp')
        .select('user_id, current_xp, total_xp, level');

      // Buscar perfis
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, name, email');

      // Combinar dados
      const combined: UserWithXP[] = (xpData || []).map(xp => {
        const profile = profilesData?.find(p => p.id === xp.user_id);
        return {
          id: xp.user_id,
          name: profile?.name || null,
          email: profile?.email || null,
          current_xp: xp.current_xp,
          total_xp: xp.total_xp,
          level: xp.level,
          title: getTitleForLevel(xp.level, titlesArr),
        };
      });

      // Ordenar por XP total
      combined.sort((a, b) => b.total_xp - a.total_xp);
      setUsers(combined);
      setLoading(false);
    };

    fetchData();
  }, []);

  const filteredUsers = users.filter(u =>
    (u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()))
  );

  const getRankIcon = (index: number) => {
    if (index === 0) return <Crown className="h-5 w-5 text-yellow-500" />;
    if (index === 1) return <Crown className="h-5 w-5 text-gray-400" />;
    if (index === 2) return <Crown className="h-5 w-5 text-amber-600" />;
    return <span className="text-muted-foreground font-mono">#{index + 1}</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-title font-bold flex items-center gap-2">
            <Trophy className="h-6 w-6 text-primary" />
            XP & Títulos dos Jogadores
          </h1>
          <p className="text-muted-foreground">Ranking e progressão de todos os jogadores</p>
        </div>
      </div>

      {/* Legenda de Títulos */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Star className="h-5 w-5" />
            Títulos Disponíveis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {titles.map((t) => (
              <Badge key={t.level} variant="outline" className="px-3 py-1">
                Lvl {t.level}: {t.title}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Busca */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar jogador..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabela de Ranking */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16 text-center">Rank</TableHead>
                <TableHead>Jogador</TableHead>
                <TableHead className="text-center">Nível</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>XP Total</TableHead>
                <TableHead className="w-48">Progresso</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhum jogador encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user, index) => {
                  const currentLevelXp = xpInCurrentLevel(user.total_xp, user.level);
                  const neededXp = xpNeededForLevelUp(user.level);
                  const progressPercent = Math.min((currentLevelXp / neededXp) * 100, 100);

                  return (
                    <TableRow key={user.id}>
                      <TableCell className="text-center">
                        {getRankIcon(index)}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{user.name || 'Sem nome'}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="font-bold">
                          {user.level}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-primary/10 text-primary border-primary/20">
                          {user.title}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm">
                          {user.total_xp.toLocaleString('pt-BR')} XP
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Progress value={progressPercent} className="h-2" />
                          <p className="text-xs text-muted-foreground">
                            {currentLevelXp}/{neededXp} para Lvl {user.level + 1}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
