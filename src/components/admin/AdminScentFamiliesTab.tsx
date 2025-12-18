import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ScentFamily {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

export const AdminScentFamiliesTab = () => {
  const [scentFamilies, setScentFamilies] = useState<ScentFamily[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editingScent, setEditingScent] = useState<ScentFamily | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: ''
  });
  const { toast } = useToast();

  const fetchScentFamilies = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from('scent_families')
      .select('*')
      .order('name');
    setScentFamilies(data || []);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchScentFamilies();
  }, []);

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const resetForm = () => {
    setFormData({ name: '', slug: '', description: '' });
    setEditingScent(null);
  };

  const openEdit = (scent: ScentFamily) => {
    setEditingScent(scent);
    setFormData({
      name: scent.name,
      slug: scent.slug,
      description: scent.description || ''
    });
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const slug = formData.slug || generateSlug(formData.name);
    const scentData = {
      name: formData.name,
      slug,
      description: formData.description || null
    };

    if (editingScent) {
      const { error } = await supabase
        .from('scent_families')
        .update(scentData)
        .eq('id', editingScent.id);

      if (error) {
        toast({ title: 'Erro', description: 'Erro ao atualizar família olfativa.', variant: 'destructive' });
      } else {
        toast({ title: 'Atualizado', description: 'Família olfativa atualizada.' });
      }
    } else {
      const { error } = await supabase
        .from('scent_families')
        .insert(scentData);

      if (error) {
        if (error.code === '23505') {
          toast({ title: 'Erro', description: 'Já existe uma família com este slug.', variant: 'destructive' });
        } else {
          toast({ title: 'Erro', description: 'Erro ao criar família olfativa.', variant: 'destructive' });
        }
      } else {
        toast({ title: 'Criado', description: 'Família olfativa criada.' });
      }
    }

    setIsOpen(false);
    resetForm();
    fetchScentFamilies();
  };

  const deleteScentFamily = async (id: string) => {
    const { error } = await supabase
      .from('scent_families')
      .delete()
      .eq('id', id);

    if (error) {
      if (error.code === '23503') {
        toast({ 
          title: 'Não é possível excluir', 
          description: 'Esta família olfativa está vinculada a produtos.',
          variant: 'destructive' 
        });
      } else {
        toast({ title: 'Erro', description: 'Erro ao excluir.', variant: 'destructive' });
      }
    } else {
      toast({ title: 'Excluído', description: 'Família olfativa excluída.' });
      fetchScentFamilies();
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Famílias Olfativas ({scentFamilies.length})</CardTitle>
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Família
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingScent ? 'Editar' : 'Nova'} Família Olfativa</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Nome *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Floral, Cítrico, Amadeirado"
                  required
                />
              </div>
              <div>
                <Label>Slug</Label>
                <Input
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder={generateSlug(formData.name) || 'gerado automaticamente'}
                />
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrição da família olfativa"
                  rows={3}
                />
              </div>
              <Button type="submit" className="w-full">
                {editingScent ? 'Atualizar' : 'Criar'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-center text-muted-foreground py-8">Carregando...</p>
        ) : scentFamilies.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Nenhuma família olfativa cadastrada
          </p>
        ) : (
          <div className="space-y-2">
            {scentFamilies.map((scent) => (
              <div 
                key={scent.id}
                className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
              >
                <div>
                  <p className="font-medium">{scent.name}</p>
                  <p className="text-sm text-muted-foreground">{scent.slug}</p>
                  {scent.description && (
                    <p className="text-sm text-muted-foreground mt-1">{scent.description}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" onClick={() => openEdit(scent)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="destructive" size="icon" onClick={() => deleteScentFamily(scent.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
