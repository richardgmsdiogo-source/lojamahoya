import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Filter, Loader2, ShoppingBag, AlertCircle, Percent, Eye } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/hooks/use-toast';
import { formatCurrencyBRL } from '@/lib/format';
import { Product as CartProduct, ProductCategory } from '@/types';
import { ProductModalDB } from '@/components/products/ProductModalDB';
import { ProductImageCarousel } from '@/components/products/ProductImageCarousel';

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface ScentFamily {
  id: string;
  name: string;
  slug: string;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  original_price: number | null;
  image_url: string | null;
  badge: string | null;
  benefits: string[] | null;
  is_active: boolean;
  category_id: string | null;
  scent_family_id: string | null;
  category?: Category;
  scent_family?: ScentFamily;
  inStock?: boolean;
}

const Catalogo = () => {
  const [searchParams] = useSearchParams();
  const initialCategory = searchParams.get('categoria');
  
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [scentFamilies, setScentFamilies] = useState<ScentFamily[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    initialCategory ? [initialCategory] : []
  );
  const [selectedScentFamilies, setSelectedScentFamilies] = useState<string[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const [{ data: prods }, { data: cats }, { data: scents }, { data: availability }] = await Promise.all([
        supabase
          .from('products')
          .select(`
            *,
            category:categories(id, name, slug),
            scent_family:scent_families(id, name, slug)
          `)
          .eq('is_active', true)
          .order('name'),
        supabase.from('categories').select('*').eq('is_active', true).order('name'),
        supabase.from('scent_families').select('*').order('name'),
        supabase.rpc('get_catalog_availability', { p_only_active: true })
      ]);
      
      // Build availability map
      const stockMap = new Map<string, boolean>();
      (availability || []).forEach((a: { product_id: string; in_stock: boolean }) => {
        stockMap.set(a.product_id, a.in_stock);
      });
      
      // Transform products to include stock availability
      const transformedProducts: Product[] = (prods || []).map((p: any) => ({
        ...p,
        inStock: stockMap.get(p.id) ?? false,
      }));
      
      setProducts(transformedProducts);
      setCategories(cats || []);
      setScentFamilies(scents || []);
      setIsLoading(false);
    };
    
    fetchData();
  }, []);

  const filteredProducts = products.filter((product) => {
    const matchesCategory = selectedCategories.length === 0 || 
      (product.category_id && selectedCategories.includes(product.category_id));
    const matchesScentFamily = selectedScentFamilies.length === 0 || 
      (product.scent_family_id && selectedScentFamilies.includes(product.scent_family_id));
    return matchesCategory && matchesScentFamily;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    const aOut = !(a.inStock ?? false);
    const bOut = !(b.inStock ?? false);

    // 1) esgotado vai pro final
    if (aOut !== bOut) return aOut ? 1 : -1;

    // 2) dentro do grupo, ordem alfabética
    return a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' });
  });

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId) 
        ? prev.filter((c) => c !== categoryId) 
        : [...prev, categoryId]
    );
  };

  const handleScentFamilyChange = (scentFamilyId: string) => {
    setSelectedScentFamilies((prev) =>
      prev.includes(scentFamilyId) 
        ? prev.filter((s) => s !== scentFamilyId) 
        : [...prev, scentFamilyId]
    );
  };

  const clearFilters = () => {
    setSelectedCategories([]);
    setSelectedScentFamilies([]);
  };
  
  const hasFilters = selectedCategories.length > 0 || selectedScentFamilies.length > 0;

  const FiltersComponent = (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold mb-3">Categorias</h3>
        <div className="space-y-2">
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center gap-2">
              <Checkbox
                id={`cat-${cat.id}`}
                checked={selectedCategories.includes(cat.id)}
                onCheckedChange={() => handleCategoryChange(cat.id)}
              />
              <Label htmlFor={`cat-${cat.id}`} className="cursor-pointer">{cat.name}</Label>
            </div>
          ))}
        </div>
      </div>

      {scentFamilies.length > 0 && (
        <div>
          <h3 className="font-semibold mb-3">Família Olfativa</h3>
          <div className="space-y-2">
            {scentFamilies.map((scent) => (
              <div key={scent.id} className="flex items-center gap-2">
                <Checkbox
                  id={`scent-${scent.id}`}
                  checked={selectedScentFamilies.includes(scent.id)}
                  onCheckedChange={() => handleScentFamilyChange(scent.id)}
                />
                <Label htmlFor={`scent-${scent.id}`} className="cursor-pointer">{scent.name}</Label>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {hasFilters && (
        <Button variant="outline" size="sm" onClick={clearFilters}>
          Limpar filtros
        </Button>
      )}
    </div>
  );

  return (
    <Layout>
      <div className="container py-8 md:py-12">
        <div className="text-center mb-8">
          <h1 className="font-script text-4xl md:text-5xl text-primary mb-2">Inventário do Ateliê</h1>
          <p className="font-serif text-muted-foreground">Escolha os suprimentos da sua jornada, lembrando que aromas são experiências pessoais. Em caso de dúvida, fale com a gente antes de escolher.</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="flex gap-8">
            {/* Desktop Filters */}
            <div className="hidden md:block w-64 flex-shrink-0">{FiltersComponent}</div>

            {/* Mobile Filter Button */}
            <Sheet>
              <SheetTrigger asChild className="md:hidden fixed bottom-4 right-4 z-40">
                <Button size="lg" className="rounded-full shadow-lg">
                  <Filter className="mr-2 h-4 w-4" />
                  Filtros
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80">{FiltersComponent}</SheetContent>
            </Sheet>

            {/* Products Grid */}
            <div className="flex-1">
              {products.length === 0 ? (
                <p className="text-center text-muted-foreground font-serif py-12">
                  Nenhum produto disponível no momento.
                </p>
              ) : filteredProducts.length === 0 ? (
                <p className="text-center text-muted-foreground font-serif py-12">
                  Nenhum produto encontrado com os filtros selecionados.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {sortedProducts.map((product) => (
                    <ProductCardDB key={product.id} product={product} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

// Componente de card adaptado para produtos do banco
const ProductCardDB = ({ product }: { product: Product }) => {
  const [showModal, setShowModal] = useState(false);
  const { addItem } = useCart();
  const { toast } = useToast();

  const inStock = product.inStock ?? false;
  const isOutOfStock = !inStock;
  const isOnSale = product.original_price && product.original_price > product.price;
  const discountPercent = isOnSale 
    ? Math.round(((product.original_price! - product.price) / product.original_price!) * 100)
    : 0;

  const handleAddToCart = () => {
    if (isOutOfStock) {
      toast({
        title: 'Produto esgotado',
        description: 'Este produto está temporariamente indisponível.',
        variant: 'destructive'
      });
      return;
    }

    // Mapear slug da categoria para o tipo ProductCategory
    const categorySlug = product.category?.slug || 'outros';
    const categoryMap: Record<string, ProductCategory> = {
      'home-spray': 'home-spray',
      'agua-lencois': 'agua-lencois',
      'velas': 'velas',
      'sabonetes': 'sabonetes',
      'kits': 'kits',
    };
    const category: ProductCategory = categoryMap[categorySlug] || 'outros';
    
    // Adaptando para o formato esperado pelo carrinho
    const cartProduct: CartProduct = {
      id: product.id,
      name: product.name,
      category,
      description: product.description || '',
      scentNotes: '',
      price: product.price,
      sizes: [{ id: product.id, label: 'Único', price: product.price }],
      scentFamily: 'floral',
      image: product.image_url || '/placeholder.svg',
    };
    
    addItem(cartProduct, cartProduct.sizes[0]);
    toast({
      title: 'Adicionado ao pedido!',
      description: `${product.name} foi adicionado.`,
    });
  };

  return (
    <>
      <Card className={`group overflow-hidden bg-card border-border transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${isOutOfStock ? 'opacity-75' : ''}`}>
        <div className={`relative ${isOutOfStock ? 'grayscale' : ''}`}>
          <ProductImageCarousel
            productId={product.id}
            fallbackImage={product.image_url || undefined}
          />
          
          {/* View button */}
          <Button
            variant="secondary"
            size="icon"
            className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => setShowModal(true)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          
          {/* Badges container */}
          <div className="absolute top-3 left-3 flex flex-col gap-1 z-10">
            {/* Category badge */}
            {product.category && (
              <Badge className="font-serif bg-primary/90 text-primary-foreground">
                {product.category.name}
              </Badge>
            )}
            
            {/* Esgotado badge */}
            {isOutOfStock && (
              <Badge variant="destructive" className="gap-1 font-serif">
                <AlertCircle className="h-3 w-3" />
                Esgotado
              </Badge>
            )}
            
            {/* Desconto badge */}
            {isOnSale && !isOutOfStock && (
              <Badge className="gap-1 font-serif bg-green-600 hover:bg-green-700">
                <Percent className="h-3 w-3" />
                -{discountPercent}%
              </Badge>
            )}
            
            {/* Custom badge from product */}
            {product.badge && !isOutOfStock && !isOnSale && (
              <Badge className="font-serif bg-accent/90 text-accent-foreground">
                {product.badge}
              </Badge>
            )}
          </div>
        </div>

        <CardContent className="p-4 md:p-6">
          <h3 className="font-script text-xl md:text-2xl text-primary mb-1">
            {product.name}
          </h3>
          
          {product.description && (
            <p className="font-serif text-sm text-muted-foreground mb-3 line-clamp-2">
              {product.description}
            </p>
          )}

          <div className="flex items-center justify-between gap-3">
            <div>
              <span className="font-serif text-lg font-semibold text-primary">
                {formatCurrencyBRL(product.price)}
              </span>
              {isOnSale && (
                <span className="font-serif text-sm text-muted-foreground line-through ml-2">
                  {formatCurrencyBRL(product.original_price!)}
                </span>
              )}
            </div>
            <Button 
              size="sm" 
              onClick={handleAddToCart} 
              className="font-serif"
              disabled={isOutOfStock}
              variant={isOutOfStock ? 'secondary' : 'default'}
            >
              <ShoppingBag className="mr-2 h-4 w-4" />
              {isOutOfStock ? 'Indisponível' : 'Adicionar'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <ProductModalDB
        product={product}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onAddToCart={handleAddToCart}
        isOutOfStock={isOutOfStock}
      />
    </>
  );
};

export default Catalogo;
