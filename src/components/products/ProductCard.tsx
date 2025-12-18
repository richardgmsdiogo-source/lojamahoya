import { useState } from 'react';
import { ShoppingBag, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Product, ProductSize } from '@/types';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/hooks/use-toast';
import { ProductModal } from './ProductModal';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const [selectedSize, setSelectedSize] = useState<ProductSize>(product.sizes[0]);
  const [showModal, setShowModal] = useState(false);
  const { addItem } = useCart();
  const { toast } = useToast();

  const handleAddToCart = () => {
    addItem(product, selectedSize);
    toast({
      title: 'Adicionado ao pedido!',
      description: `${product.name} (${selectedSize.label}) foi adicionado.`,
    });
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      'home-spray': 'Home Spray',
      'agua-lencois': 'Água de Lençóis',
      'velas': 'Velas',
      'sabonetes': 'Sabonetes',
      'kits': 'Kits Presente',
      'outros': 'Outros',
    };
    return labels[category] || category;
  };

  return (
    <>
      <Card className="group overflow-hidden bg-card border-border transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
        <div className="relative aspect-square bg-secondary/30 overflow-hidden">
          <img
            src={product.image}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <Button
            variant="secondary"
            size="icon"
            className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => setShowModal(true)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <span className="absolute top-3 left-3 bg-accent/90 text-accent-foreground text-xs px-2 py-1 rounded font-serif">
            {getCategoryLabel(product.category)}
          </span>
        </div>

        <CardContent className="p-4 md:p-6">
          <h3 className="font-script text-xl md:text-2xl text-primary mb-1">
            {product.name}
          </h3>
          
          <p className="font-serif text-sm text-muted-foreground mb-3 line-clamp-2">
            {product.scentNotes}
          </p>

          {product.sizes.length > 1 && (
            <Select
              value={selectedSize.id}
              onValueChange={(value) => {
                const size = product.sizes.find((s) => s.id === value);
                if (size) setSelectedSize(size);
              }}
            >
              <SelectTrigger className="mb-3 font-serif">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {product.sizes.map((size) => (
                  <SelectItem key={size.id} value={size.id} className="font-serif">
                    {size.label} - R$ {size.price.toFixed(2).replace('.', ',')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="flex items-center justify-between gap-3">
            <span className="font-serif text-lg font-semibold text-primary">
              R$ {selectedSize.price.toFixed(2).replace('.', ',')}
            </span>
            <Button size="sm" onClick={handleAddToCart} className="font-serif">
              <ShoppingBag className="mr-2 h-4 w-4" />
              Adicionar
            </Button>
          </div>
        </CardContent>
      </Card>

      <ProductModal
        product={product}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onAddToCart={handleAddToCart}
        selectedSize={selectedSize}
        onSizeChange={setSelectedSize}
      />
    </>
  );
};
