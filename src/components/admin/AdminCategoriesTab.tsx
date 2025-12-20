import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  emoji: string | null;
}

type CategoryForm = {
  name: string;
  slug: string;
  description: string;
  image_url: string;
  emoji: string;
};

const EMOJI_PICKER = [
  '🕯️','✨','🌿','🍃','🌸','💧','🔥','🧼','🎁','🧪','🪵','🧙‍♀️','🌙','⭐','🍯','🫧','🌬️','🧿'
];

export const AdminCategoriesTab = () => {
  const { toast } = useToast();

  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isOpen, setIsOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const [formData, setFormData] = useState<CategoryForm>({
    name: '',
    slug: '',
    description: '',
    image_url: '',
    emoji: ''
  });

  const previewSlug = useMemo(() => {
    return formData.slug || generateSlug(formData.name);
  }, [formData.slug, formData.name]);

  useEffect(() => {
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchCategories() {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('categories')
      .select('id,name,slug,description,image_url,emoji')
      .order('name');

    if (error) {
      toast({ title: 'Erro', description: 'Não foi possível carregar categorias.', variant: 'destructive' });
      setCategories([]);
      setIsLoading(false);
      return;
    }

    setCategories((data || []) as Category[]);
    setIsLoading(false);
  }

  function generateSlug(name: string) {
    return (name || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function resetForm() {
    setFormData({ name: '', slug: '', description: '', image_url: '', emoji: '' });
    setEditingCategory(null);
  }

  function openCreate() {
    resetForm();
    setIsOpen(true);
  }

  function openEdit(cat: Category) {
    setEditingCategory(cat);
    setFormData({
      name: cat.name,
      slug: cat.slug,
      description: cat.description || '',
      image_url: cat.image_url || '',
      emoji: cat.emoji || ''
    });
    setIsOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const slug = (formData.slug || generateSlug(formData.name)).trim();

    if (!formData.name.trim()) {
      toast({ title: 'Atenção', description: 'Informe o nome da categoria.', variant: 'destructive' });
      return;
    }

    const payload = {
      name: formData.name.trim(),
      slug,
      description: formData.description.trim() || null,
      image_url: formData.image_url.trim() || null,
      emoji: formData.emoji.trim() || null,
      updated_at: new Date().toISOString()
    };

    if (editingCategory) {
      const { error } = await supabase
        .from('categories')
        .update(payload)
        .eq('id', editingCategory.id);

      if (error) {
        toast({ title: 'Erro', description: 'Erro ao atualizar categoria.', variant: 'destructive' });
        return;
      }

      toast({ title: 'Atualizado', description: 'Categoria atualizada com sucesso.' });
    } else {
      // insert sem updated_at (se sua tabela tiver gatilho/def padrão, tudo bem)
      const { error } = await supabase.from('categories').insert({
        name: payload.name,
        slug: payload.slug,
        description: payload.description,
        image_url: payload.image_url,
        emoji: payload.emoji
      });

      if (error) {
        toast({ title: 'Erro', description: 'Erro ao criar categoria.', variant: 'destructive' });
        return;
      }

      toast({ title: 'Criado', description: 'Categoria criada com sucesso.' });
    }

    setIsOpen(false);
    resetForm();
    fetchCategories();
  }

  async function deleteCategory(id: string) {
    const { error } = await supabase.from('categories').delete().eq('id', id);

    if (error) {
      toast({ title: 'Erro', description: 'Erro ao excluir categoria.', variant: 'destructive' });
      return;
    }

    toast({ title: 'Excluído', description: 'Categoria excluída.' });
    fetchCategories();
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Categorias</CardTitle>

        <Dialog
          open={isOpen}
          onOpenChange={(open) => {
            setIsOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button className="gap-2" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Nova Categoria
            </Button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCategory ? 'Editar' : 'Nova'} Categoria</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Nome *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                  required
                />
              </div>

              <div>
                <Label>Slug (automático se vazio)</Label>
                <Input
                  value={formData.slug}
                  onChange={(e) => setFormData((p) => ({ ...p, slug: e.target.value }))}
                  placeholder={generateSlug(formData.name) || 'ex: velas-aromaticas'}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Preview: <span className="font-mono">/{previewSlug || '-'}</span>
                </p>
              </div>

              <div>
                <Label>Descrição</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                  rows={3}
                />
              </div>

              <div>
                <Label>Emoji (opcional)</Label>
                <div className="flex items-center gap-3">
                  <Input
                    value={formData.emoji}
                    onChange={(e) => setFormData((p) => ({ ...p, emoji: e.target.value }))}
                    placeholder="Ex: 🕯️"
                    className="w-24 text-center text-lg"
                    inputMode="text"
                  />
                  <div className="text-sm text-muted-foreground">
                    Preview:{' '}
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-secondary text-2xl">
                      {formData.emoji?.trim() || '—'}
                    </span>
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap gap-2">
                  {EMOJI_PICKER.map((em) => (
                    <Button
                      key={em}
                      type="button"
                      variant="outline"
                      className="h-10 w-10 p-0 text-xl"
                      onClick={() => setFormData((p) => ({ ...p, emoji: em }))}
                      title={`Usar ${em}`}
                    >
                      {em}
                    </Button>
                  ))}
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-10"
                    onClick={() => setFormData((p) => ({ ...p, emoji: '' }))}
                    title="Limpar emoji"
                  >
                    Limpar
                  </Button>
                </div>

                <p className="mt-2 text-xs text-muted-foreground">
                  Dica: se você preencher <b>Imagem</b>, ela tem prioridade. Se não, usa o emoji.
                </p>
              </div>

              <div>
                <Label>URL da Imagem (opcional)</Label>
                <Input
                  value={formData.image_url}
                  onChange={(e) => setFormData((p) => ({ ...p, image_url: e.target.value }))}
                  placeholder="https://..."
                />
              </div>

              <Button type="submit" className="w-full">
                {editingCategory ? 'Atualizar' : 'Criar'} Categoria
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <p className="text-center text-muted-foreground py-8">Carregando...</p>
        ) : categories.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Nenhuma categoria cadastrada</p>
        ) : (
          <div className="space-y-2">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
              >
                <div className="flex items-center gap-4">
                  {cat.image_url ? (
                    <img
                      src={cat.image_url}
                      alt={cat.name}
                      className="w-12 h-12 object-cover rounded"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded bg-secondary flex items-center justify-center text-2xl">
                      {cat.emoji || '🏷️'}
                    </div>
                  )}

                  <div>
                    <p className="font-medium">{cat.name}</p>
                    <p className="text-xs text-muted-foreground">/{cat.slug}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="icon" onClick={() => openEdit(cat)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="destructive" size="icon" onClick={() => deleteCategory(cat.id)}>
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
