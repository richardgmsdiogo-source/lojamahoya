import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Gift, Plus, Trash2, Search, CheckCircle, Clock, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatCurrencyBRL } from '@/lib/format';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface UserBenefit {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  discount_percent: number;
  discount_fixed: number;
  valid_until: string | null;
  is_used: boolean;
  used_at: string | null;
  created_at: string;
  profile?: {
    name: string | null;
    email: string | null;
  };
}

interface Profile {
  id: string;
  name: string | null;
  email: string | null;
}

export const AdminBeneficiosTab = () => {
  const [benefits, setBenefits] = useState<UserBenefit[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const [form, setForm] = useState({
    user_id: '',
    name: '',
    description: '',
    discount_percent: 0,
    discount_fixed: 0,
    valid_until: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);

    const { data: benefitsData } = await supabase
      .from('user_benefits')
      .select('*')
      .order('created_at', { ascending: false });

    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, name, email');

    setProfiles(profilesData || []);

    if (benefitsData) {
      const enriched = benefitsData.map(b => ({
        ...b,
        profile: profilesData?.find(p => p.id === b.user_id),
      }));
      setBenefits(enriched);
    }

    setLoading(false);
  };

  const openCreateDialog = () => {
    setForm({
      user_id: '',
      name: '',
      description: '',
      discount_percent: 0,
      discount_fixed: 0,
      valid_until: '',
    });
    setDialogOpen(true);
  };

  const handleCreate = async () => {
    if (!form.user_id || !form.name) {
      toast({ title: 'Preencha usuário e nome', variant: 'destructive' });
      return;
    }

    const { error } = await supabase.from('user_benefits').insert({
      user_id: form.user_id,
      name: form.name,
      description: form.description || null,
      discount_percent: form.discount_percent,
      discount_fixed: form.discount_fixed,
      valid_until: form.valid_until || null,
    });

    if (error) {
      toast({ title: 'Erro ao criar benefício', variant: 'destructive' });
      return;
    }

    toast({ title: 'Benefício criado!' });
    setDialogOpen(false);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este benefício?')) return;

    const { error } = await supabase.from('user_benefits').delete().eq('id', id);
    if (error) {
      toast({ title: 'Erro ao excluir', variant: 'destructive' });
      return;
    }
    toast({ title: 'Benefício excluído!' });
    fetchData();
  };

  const markAsUsed = async (id: string) => {
    const { error } = await supabase
      .from('user_benefits')
      .update({ is_used: true, used_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      toast({ title: 'Erro ao marcar como usado', variant: 'destructive' });
      return;
    }
    toast({ title: 'Benefício marcado como usado!' });
    fetchData();
  };

  const filteredBenefits = benefits.filter(b =>
    b.profile?.name?.toLowerCase().includes(search.toLowerCase()) ||
    b.profile?.email?.toLowerCase().includes(search.toLowerCase()) ||
    b.name.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (benefit: UserBenefit) => {
    if (benefit.is_used) {
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200">
          <CheckCircle className="h-3 w-3 mr-1" />
          Usado
        </Badge>
      );
    }
    if (benefit.valid_until && new Date(benefit.valid_until) < new Date()) {
      return (
        <Badge className="bg-red-100 text-red-800 border-red-200">
          <XCircle className="h-3 w-3 mr-1" />
          Expirado
        </Badge>
      );
    }
    return (
      <Badge className="bg-blue-100 text-blue-800 border-blue-200">
        <Clock className="h-3 w-3 mr-1" />
        Ativo
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-title font-bold flex items-center gap-2">
            <Gift className="h-6 w-6 text-primary" />
            Benefícios Ativos
          </h1>
          <p className="text-muted-foreground">Gerencie descontos e benefícios dos jogadores</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Benefício
        </Button>
      </div>

      {/* Busca */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por jogador ou benefício..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Jogador</TableHead>
                <TableHead>Benefício</TableHead>
                <TableHead>Desconto</TableHead>
                <TableHead>Validade</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filteredBenefits.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhum benefício encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredBenefits.map(benefit => (
                  <TableRow key={benefit.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{benefit.profile?.name || 'Sem nome'}</p>
                        <p className="text-xs text-muted-foreground">{benefit.profile?.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{benefit.name}</p>
                        {benefit.description && (
                          <p className="text-xs text-muted-foreground">{benefit.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {benefit.discount_percent > 0 && (
                        <Badge variant="outline">{benefit.discount_percent}% OFF</Badge>
                      )}
                      {benefit.discount_fixed > 0 && (
                        <Badge variant="outline">{formatCurrencyBRL(benefit.discount_fixed)} OFF</Badge>
                      )}
                      {benefit.discount_percent === 0 && benefit.discount_fixed === 0 && (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {benefit.valid_until ? (
                        format(new Date(benefit.valid_until), "dd/MM/yyyy", { locale: ptBR })
                      ) : (
                        <span className="text-muted-foreground">Sem prazo</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {getStatusBadge(benefit)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {!benefit.is_used && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => markAsUsed(benefit.id)}
                            title="Marcar como usado"
                          >
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(benefit.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog de criação */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Benefício</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Jogador</Label>
              <Select value={form.user_id} onValueChange={(v) => setForm({ ...form, user_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um jogador" />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name || p.email || 'Sem nome'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Nome do Benefício</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: Desconto Aniversário"
              />
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Descrição do benefício..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Desconto (%)</Label>
                <Input
                  type="number"
                  value={form.discount_percent}
                  onChange={(e) => setForm({ ...form, discount_percent: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Desconto Fixo (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.discount_fixed}
                  onChange={(e) => setForm({ ...form, discount_fixed: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Válido até</Label>
              <Input
                type="date"
                value={form.valid_until}
                onChange={(e) => setForm({ ...form, valid_until: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreate}>Criar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
