import { useState, useEffect } from 'react';
import { Dice6, UserPlus, Trash2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface EligibleUser {
  id: string;
  user_id: string;
  enabled_at: string;
  profile: {
    name: string | null;
    email: string | null;
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
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', userIds);

      const enriched = eligible.map(e => ({
        ...e,
        profile: profiles?.find(p => p.id === e.user_id) || null
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
                  <div>
                    <p className="font-medium text-sm">{eu.profile?.name || 'Sem nome'}</p>
                    <p className="text-xs text-muted-foreground">{eu.profile?.email}</p>
                  </div>
                  <Button 
                    variant="destructive" 
                    size="icon"
                    onClick={() => removeUser(eu.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
