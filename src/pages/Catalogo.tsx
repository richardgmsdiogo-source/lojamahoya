import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Filter } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { ProductCard } from '@/components/products/ProductCard';
import { ProductFilters } from '@/components/products/ProductFilters';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { products } from '@/data/products';

const Catalogo = () => {
  const [searchParams] = useSearchParams();
  const initialCategory = searchParams.get('categoria');
  
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    initialCategory ? [initialCategory] : []
  );
  const [selectedScents, setSelectedScents] = useState<string[]>([]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const categoryMatch = selectedCategories.length === 0 || selectedCategories.includes(product.category);
      const scentMatch = selectedScents.length === 0 || selectedScents.includes(product.scentFamily);
      return categoryMatch && scentMatch;
    });
  }, [selectedCategories, selectedScents]);

  const handleCategoryChange = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );
  };

  const handleScentChange = (scent: string) => {
    setSelectedScents((prev) =>
      prev.includes(scent) ? prev.filter((s) => s !== scent) : [...prev, scent]
    );
  };

  const clearFilters = () => {
    setSelectedCategories([]);
    setSelectedScents([]);
  };

  const FiltersComponent = (
    <ProductFilters
      selectedCategories={selectedCategories}
      selectedScents={selectedScents}
      onCategoryChange={handleCategoryChange}
      onScentChange={handleScentChange}
      onClearFilters={clearFilters}
    />
  );

  return (
    <Layout>
      <div className="container py-8 md:py-12">
        <div className="text-center mb-8">
          <h1 className="font-script text-4xl md:text-5xl text-primary mb-2">Catálogo</h1>
          <p className="font-serif text-muted-foreground">Explore nossa coleção de aromas artesanais</p>
        </div>

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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
            {filteredProducts.length === 0 && (
              <p className="text-center text-muted-foreground font-serif py-12">
                Nenhum produto encontrado com os filtros selecionados.
              </p>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Catalogo;
