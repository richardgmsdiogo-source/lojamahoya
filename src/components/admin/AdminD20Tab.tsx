import { useState, useEffect } from 'react';
import { Dice6, UserPlus, Trash2, Search, CheckCircle, Clock, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface EligibleUser {
  id: string;
  user_id: string;
  enabled_at: string;
  profile: {
    name: string | null;
    email: string | null;
  } | null;
  roll: {
    roll_result: number;
    prize_code: string;
    prize_title: string;
    used_at: string | null;
  } | null;
}

export const AdminD20Tab = () => {
  const [eligibleUsers, setEligibleUsers] = useState<EligibleUser[]>([]);
  const [allUsers, setAllUsers] = useState<{ id: string; name: string | null; email: string | null }[]>([]);
  const [searchEmail, setSearchEmail] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchData = async () => {
    setIsLoading(true);
    
    // Fetch eligible users
    const { data: eligible } = await supabase
      .from('d20_eligible_users')
      .select(`
        id,
        user_id,
        enabled_at
      `);

    if (eligible) {
      // Fetch profiles for eligible users
      const userIds = eligible.map(e => e.user_id);
      const [profilesRes, rollsRes] = await Promise.all([
        supabase.from('profiles').select('id, name, email').in('id', userIds),
        supabase.from('d20_rolls').select('user_id, roll_result, prize_code, prize_title, used_at').in('user_id', userIds),
      ]);

      const enriched = eligible.map(e => ({
        ...e,
        profile: profilesRes.data?.find(p => p.id === e.user_id) || null,
        roll: rollsRes.data?.find(r => r.user_id === e.user_id) || null,
      }));
      
      setEligibleUsers(enriched);
    }

    // Fetch all profiles for adding new users
    const { data: allProfiles } = await supabase
      .from('profiles')
      .select('id, name, email');
    
    setAllUsers(allProfiles || []);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const addUser = async (userId: string) => {
    const { error } = await supabase
      .from('d20_eligible_users')
      .insert({ user_id: userId });

    if (error) {
      toast({ title: 'Erro', description: 'Usuário já está habilitado ou erro ao adicionar.', variant: 'destructive' });
    } else {
      toast({ title: 'Sucesso', description: 'Usuário habilitado para o D20!' });
      fetchData();
    }
    setSearchEmail('');
  };

  const removeUser = async (id: string) => {
    const { error } = await supabase
      .from('d20_eligible_users')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ title: 'Erro', description: 'Erro ao remover usuário.', variant: 'destructive' });
    } else {
      toast({ title: 'Removido', description: 'Usuário removido da promoção.' });
      fetchData();
    }
  };

  const resetUserRoll = async (userId: string, userName: string | null) => {
    const { error } = await supabase
      .from('d20_rolls')
      .delete()
      .eq('user_id', userId);

    if (error) {
      toast({ title: 'Erro', description: 'Erro ao resetar dado.', variant: 'destructive' });
    } else {
      toast({ title: 'Resetado', description: `Dado de ${userName || 'usuário'} foi resetado.` });
      fetchData();
    }
  };

  const filteredUsers = allUsers.filter(u =>
    !eligibleUsers.some(e => e.user_id === u.id) &&
    (u.email?.toLowerCase().includes(searchEmail.toLowerCase()) || 
     u.name?.toLowerCase().includes(searchEmail.toLowerCase()))
  );

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Adicionar Usuário
          </CardTitle>
          <CardDescription>
            Busque por email ou nome para habilitar o D20
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por email ou nome..."
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {searchEmail && (
            <div className="max-h-48 overflow-y-auto space-y-2">
              {filteredUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum usuário encontrado
                </p>
              ) : (
                filteredUsers.slice(0, 5).map((user) => (
                  <div 
                    key={user.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-sm">{user.name || 'Sem nome'}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                    <Button size="sm" onClick={() => addUser(user.id)}>
                      Adicionar
                    </Button>
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Dice6 className="h-5 w-5" />
            Usuários Habilitados ({eligibleUsers.length})
          </CardTitle>
          <CardDescription>
            Usuários que podem ver a promoção do D20
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center text-muted-foreground py-8">Carregando...</p>
          ) : eligibleUsers.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum usuário habilitado ainda
            </p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {eligibleUsers.map((eu) => (
                <div 
                  key={eu.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium text-sm">{eu.profile?.name || 'Sem nome'}</p>
                    <p className="text-xs text-muted-foreground">{eu.profile?.email}</p>
                    {eu.roll ? (
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={eu.roll.used_at ? "secondary" : "default"} className="text-xs">
                          🎲 {eu.roll.roll_result} - {eu.roll.prize_code}
                        </Badge>
                        {eu.roll.used_at ? (
                          <Badge variant="outline" className="text-xs flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" /> Usado
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs flex items-center gap-1">
                            <Clock className="h-3 w-3" /> Pendente
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic mt-1">Ainda não rolou</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {eu.roll && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="icon" title="Resetar dado">
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Resetar dado de {eu.profile?.name || 'usuário'}?</AlertDialogTitle>
                            <AlertDialogDescription>
                              O resultado atual (🎲 {eu.roll.roll_result} - {eu.roll.prize_code}) será apagado e o cliente poderá rolar novamente.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => resetUserRoll(eu.user_id, eu.profile?.name)}>
                              Resetar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                    <Button 
                      variant="destructive" 
                      size="icon"
                      onClick={() => removeUser(eu.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
