import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrencyBRL } from '@/lib/format';

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  original_price: number | null;
  category_id: string | null;
  scent_family_id: string | null;
  image_url: string | null;
  badge: string | null;
  benefits: string[] | null;
  is_active: boolean;
}

interface Category {
  id: string;
  name: string;
}

interface ScentFamily {
  id: string;
  name: string;
}

export const AdminProductsTab = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [scentFamilies, setScentFamilies] = useState<ScentFamily[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    price: '',
    original_price: '',
    category_id: '',
    scent_family_id: '',
    image_url: '',
    badge: '',
    benefits: '',
    is_active: true
  });
  const { toast } = useToast();

  const fetchData = async () => {
    setIsLoading(true);
    const [{ data: prods }, { data: cats }, { data: scents }] = await Promise.all([
      supabase.from('products').select('*').order('name'),
      supabase.from('categories').select('id, name').order('name'),
      supabase.from('scent_families').select('id, name').order('name')
    ]);
    setProducts(prods || []);
    setCategories(cats || []);
    setScentFamilies(scents || []);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
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
    setFormData({
      name: '',
      slug: '',
      description: '',
      price: '',
      original_price: '',
      category_id: '',
      scent_family_id: '',
      image_url: '',
      badge: '',
      benefits: '',
      is_active: true
    });
    setEditingProduct(null);
  };

  const openEdit = (prod: Product) => {
    setEditingProduct(prod);
    setFormData({
      name: prod.name,
      slug: prod.slug,
      description: prod.description || '',
      price: prod.price.toString(),
      original_price: prod.original_price?.toString() || '',
      category_id: prod.category_id || '',
      scent_family_id: prod.scent_family_id || '',
      image_url: prod.image_url || '',
      badge: prod.badge || '',
      benefits: prod.benefits?.join(', ') || '',
      is_active: prod.is_active
    });
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const slug = formData.slug || generateSlug(formData.name);
    const benefits = formData.benefits
      ? formData.benefits.split(',').map(b => b.trim()).filter(Boolean)
      : null;

    const productData = {
      name: formData.name,
      slug,
      description: formData.description || null,
      price: parseFloat(formData.price),
      original_price: formData.original_price ? parseFloat(formData.original_price) : null,
      category_id: formData.category_id || null,
      scent_family_id: formData.scent_family_id || null,
      image_url: formData.image_url || null,
      badge: formData.badge || null,
      benefits,
      is_active: formData.is_active,
      updated_at: new Date().toISOString()
    };

    if (editingProduct) {
      const { error } = await supabase
        .from('products')
        .update(productData)
        .eq('id', editingProduct.id);

      if (error) {
        toast({ title: 'Erro', description: 'Erro ao atualizar produto.', variant: 'destructive' });
      } else {
        toast({ title: 'Atualizado', description: 'Produto atualizado com sucesso.' });
      }
    } else {
      const { error } = await supabase
        .from('products')
        .insert(productData);

      if (error) {
        toast({ title: 'Erro', description: 'Erro ao criar produto.', variant: 'destructive' });
      } else {
        toast({ title: 'Criado', description: 'Produto criado com sucesso.' });
      }
    }

    setIsOpen(false);
    resetForm();
    fetchData();
  };

  const deleteProduct = async (id: string) => {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      if (error.code === '23503') {
        toast({ 
          title: 'Não é possível excluir', 
          description: 'Este produto está vinculado a receitas ou lotes de produção. Desative-o em vez de excluir.',
          variant: 'destructive' 
        });
      } else {
        toast({ title: 'Erro', description: 'Erro ao excluir produto.', variant: 'destructive' });
      }
    } else {
      toast({ title: 'Excluído', description: 'Produto excluído.' });
      fetchData();
    }
  };

  const toggleActive = async (prod: Product) => {
    const { error } = await supabase
      .from('products')
      .update({ is_active: !prod.is_active })
      .eq('id', prod.id);

    if (!error) {
      fetchData();
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Produtos ({products.length})</CardTitle>
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Produto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingProduct ? 'Editar' : 'Novo'} Produto</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nome *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Slug</Label>
                  <Input
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder={generateSlug(formData.name)}
                  />
                </div>
              </div>
              
              <div>
                <Label>Descrição</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Preço (R$) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Preço Original (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.original_price}
                    onChange={(e) => setFormData({ ...formData, original_price: e.target.value })}
                    placeholder="Para mostrar desconto"
                  />
                </div>
              </div>

              <div>
                <Label>Categoria</Label>
                <Select 
                  value={formData.category_id} 
                  onValueChange={(v) => setFormData({ ...formData, category_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
              </Select>
              </div>

              <div>
                <Label>Família Olfativa</Label>
                <Select 
                  value={formData.scent_family_id} 
                  onValueChange={(v) => setFormData({ ...formData, scent_family_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma família olfativa" />
                  </SelectTrigger>
                  <SelectContent>
                    {scentFamilies.map((scent) => (
                      <SelectItem key={scent.id} value={scent.id}>{scent.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>URL da Imagem</Label>
                <Input
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div>
                <Label>Badge (ex: Novo, Promoção)</Label>
                <Input
                  value={formData.badge}
                  onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                />
              </div>

              <div>
                <Label>Benefícios (separados por vírgula)</Label>
                <Input
                  value={formData.benefits}
                  onChange={(e) => setFormData({ ...formData, benefits: e.target.value })}
                  placeholder="Relaxante, 100% natural, Artesanal"
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label>Produto ativo</Label>
              </div>

              <Button type="submit" className="w-full">
                {editingProduct ? 'Atualizar' : 'Criar'} Produto
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-center text-muted-foreground py-8">Carregando...</p>
        ) : products.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Nenhum produto cadastrado
          </p>
        ) : (
          <div className="space-y-2">
            {products.map((prod) => (
              <div 
                key={prod.id}
                className={`flex items-center justify-between p-4 rounded-lg ${
                  prod.is_active ? 'bg-muted/50' : 'bg-muted/30 opacity-60'
                }`}
              >
                <div className="flex items-center gap-4">
                  {prod.image_url && (
                    <img 
                      src={prod.image_url} 
                      alt={prod.name}
                      className="w-12 h-12 object-cover rounded"
                    />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{prod.name}</p>
                      {prod.badge && (
                        <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">
                          {prod.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrencyBRL(prod.price)}
                      {prod.original_price && (
                        <span className="line-through ml-2">{formatCurrencyBRL(prod.original_price)}</span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => toggleActive(prod)}
                    title={prod.is_active ? 'Desativar' : 'Ativar'}
                  >
                    {prod.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => openEdit(prod)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="destructive" size="icon" onClick={() => deleteProduct(prod.id)}>
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
