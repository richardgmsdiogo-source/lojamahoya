import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { Award, Plus, Pencil, Trash2, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Achievement {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  xp_reward: number;
  requirement_type: string;
  requirement_value: number;
  is_active: boolean;
}

interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
  profile?: {
    name: string | null;
    email: string | null;
  };
}

const requirementTypes = [
  { value: 'manual', label: 'Manual' },
  { value: 'orders_count', label: 'Número de Pedidos' },
  { value: 'total_spent', label: 'Total Gasto' },
  { value: 'level', label: 'Nível' },
];

const iconOptions = ['🏆', '⭐', '🎖️', '🌟', '🧙', '💎', '🔥', '🎯', '👑', '🛒', '💰', '🎁'];

export const AdminConquistasTab = () => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAchievement, setEditingAchievement] = useState<Achievement | null>(null);
  const [viewingUsers, setViewingUsers] = useState<string | null>(null);
  const { toast } = useToast();

  const [form, setForm] = useState({
    name: '',
    description: '',
    icon: '🏆',
    xp_reward: 0,
    requirement_type: 'manual',
    requirement_value: 0,
    is_active: true,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);

    const { data: achievementsData } = await supabase
      .from('achievements')
      .select('*')
      .order('created_at', { ascending: false });

    setAchievements(achievementsData || []);

    // Buscar conquistas desbloqueadas
    const { data: userAchData } = await supabase
      .from('user_achievements')
      .select('id, user_id, achievement_id, unlocked_at');

    if (userAchData && userAchData.length > 0) {
      const userIds = [...new Set(userAchData.map(ua => ua.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', userIds);

      const enriched = userAchData.map(ua => ({
        ...ua,
        profile: profiles?.find(p => p.id === ua.user_id),
      }));

      setUserAchievements(enriched);
    }

    setLoading(false);
  };

  const openCreateDialog = () => {
    setEditingAchievement(null);
    setForm({
      name: '',
      description: '',
      icon: '🏆',
      xp_reward: 0,
      requirement_type: 'manual',
      requirement_value: 0,
      is_active: true,
    });
    setDialogOpen(true);
  };

  const openEditDialog = (achievement: Achievement) => {
    setEditingAchievement(achievement);
    setForm({
      name: achievement.name,
      description: achievement.description || '',
      icon: achievement.icon,
      xp_reward: achievement.xp_reward,
      requirement_type: achievement.requirement_type,
      requirement_value: achievement.requirement_value,
      is_active: achievement.is_active,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name) {
      toast({ title: 'Nome obrigatório', variant: 'destructive' });
      return;
    }

    if (editingAchievement) {
      const { error } = await supabase
        .from('achievements')
        .update({
          name: form.name,
          description: form.description || null,
          icon: form.icon,
          xp_reward: form.xp_reward,
          requirement_type: form.requirement_type,
          requirement_value: form.requirement_value,
          is_active: form.is_active,
        })
        .eq('id', editingAchievement.id);

      if (error) {
        toast({ title: 'Erro ao atualizar', variant: 'destructive' });
        return;
      }
      toast({ title: 'Conquista atualizada!' });
    } else {
      const { error } = await supabase.from('achievements').insert({
        name: form.name,
        description: form.description || null,
        icon: form.icon,
        xp_reward: form.xp_reward,
        requirement_type: form.requirement_type,
        requirement_value: form.requirement_value,
        is_active: form.is_active,
      });

      if (error) {
        toast({ title: 'Erro ao criar', variant: 'destructive' });
        return;
      }
      toast({ title: 'Conquista criada!' });
    }

    setDialogOpen(false);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta conquista?')) return;

    const { error } = await supabase.from('achievements').delete().eq('id', id);
    if (error) {
      toast({ title: 'Erro ao excluir', variant: 'destructive' });
      return;
    }
    toast({ title: 'Conquista excluída!' });
    fetchData();
  };

  const getUsersWithAchievement = (achievementId: string) => {
    return userAchievements.filter(ua => ua.achievement_id === achievementId);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-title font-bold flex items-center gap-2">
            <Award className="h-6 w-6 text-primary" />
            Conquistas
          </h1>
          <p className="text-muted-foreground">Gerencie as conquistas dos jogadores</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Conquista
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Ícone</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Requisito</TableHead>
                <TableHead className="text-center">XP</TableHead>
                <TableHead className="text-center">Usuários</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : achievements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhuma conquista cadastrada
                  </TableCell>
                </TableRow>
              ) : (
                achievements.map(ach => {
                  const usersCount = getUsersWithAchievement(ach.id).length;
                  return (
                    <TableRow key={ach.id}>
                      <TableCell className="text-2xl">{ach.icon}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{ach.name}</p>
                          {ach.description && (
                            <p className="text-xs text-muted-foreground">{ach.description}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {requirementTypes.find(r => r.value === ach.requirement_type)?.label}
                          {ach.requirement_value > 0 && `: ${ach.requirement_value}`}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">+{ach.xp_reward} XP</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setViewingUsers(viewingUsers === ach.id ? null : ach.id)}
                        >
                          <Users className="h-4 w-4 mr-1" />
                          {usersCount}
                        </Button>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={ach.is_active ? 'default' : 'secondary'}>
                          {ach.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(ach)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(ach.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
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

      {/* Lista de usuários com conquista */}
      {viewingUsers && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Usuários com "{achievements.find(a => a.id === viewingUsers)?.name}"
            </CardTitle>
          </CardHeader>
          <CardContent>
            {getUsersWithAchievement(viewingUsers).length === 0 ? (
              <p className="text-muted-foreground">Nenhum usuário desbloqueou esta conquista ainda.</p>
            ) : (
              <div className="space-y-2">
                {getUsersWithAchievement(viewingUsers).map(ua => (
                  <div key={ua.id} className="flex justify-between items-center p-2 bg-muted/50 rounded">
                    <div>
                      <p className="font-medium">{ua.profile?.name || 'Sem nome'}</p>
                      <p className="text-xs text-muted-foreground">{ua.profile?.email}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(ua.unlocked_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dialog de criação/edição */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingAchievement ? 'Editar Conquista' : 'Nova Conquista'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex: Primeira Compra"
                />
              </div>
              <div className="space-y-2">
                <Label>Ícone</Label>
                <Select value={form.icon} onValueChange={(v) => setForm({ ...form, icon: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {iconOptions.map(icon => (
                      <SelectItem key={icon} value={icon}>{icon}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Descrição da conquista..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Requisito</Label>
                <Select
                  value={form.requirement_type}
                  onValueChange={(v) => setForm({ ...form, requirement_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {requirementTypes.map(rt => (
                      <SelectItem key={rt.value} value={rt.value}>{rt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Valor do Requisito</Label>
                <Input
                  type="number"
                  value={form.requirement_value}
                  onChange={(e) => setForm({ ...form, requirement_value: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Recompensa em XP</Label>
              <Input
                type="number"
                value={form.xp_reward}
                onChange={(e) => setForm({ ...form, xp_reward: Number(e.target.value) })}
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={form.is_active}
                onCheckedChange={(c) => setForm({ ...form, is_active: c })}
              />
              <Label>Ativo</Label>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave}>
                {editingAchievement ? 'Salvar' : 'Criar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
