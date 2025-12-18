import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { categories, scentFamilies } from '@/data/products';

interface ProductFiltersProps {
  selectedCategories: string[];
  selectedScents: string[];
  onCategoryChange: (category: string) => void;
  onScentChange: (scent: string) => void;
  onClearFilters: () => void;
}

export const ProductFilters: React.FC<ProductFiltersProps> = ({
  selectedCategories,
  selectedScents,
  onCategoryChange,
  onScentChange,
  onClearFilters,
}) => {
  const hasFilters = selectedCategories.length > 0 || selectedScents.length > 0;

  return (
    <Card className="sticky top-24 bg-card border-border">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="font-script text-xl text-primary">Filtros</CardTitle>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={onClearFilters} className="font-serif text-xs">
              <X className="mr-1 h-3 w-3" />
              Limpar
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Categories */}
        <div>
          <h4 className="font-serif font-medium text-primary mb-3">Categoria</h4>
          <div className="space-y-2">
            {categories.map((category) => (
              <label
                key={category.id}
                className="flex items-center gap-2 cursor-pointer font-serif text-sm"
              >
                <Checkbox
                  checked={selectedCategories.includes(category.id)}
                  onCheckedChange={() => onCategoryChange(category.id)}
                />
                <span className="text-muted-foreground hover:text-primary transition-colors">
                  {category.name}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Scent Families */}
        <div>
          <h4 className="font-serif font-medium text-primary mb-3">Família Olfativa</h4>
          <div className="space-y-2">
            {scentFamilies.map((scent) => (
              <label
                key={scent.id}
                className="flex items-center gap-2 cursor-pointer font-serif text-sm"
              >
                <Checkbox
                  checked={selectedScents.includes(scent.id)}
                  onCheckedChange={() => onScentChange(scent.id)}
                />
                <span className="text-muted-foreground hover:text-primary transition-colors">
                  {scent.name}
                </span>
              </label>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
