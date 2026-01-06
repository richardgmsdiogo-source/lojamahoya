import { ShoppingBag, Sparkles, Leaf, Tag, Package } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProductImageCarousel } from './ProductImageCarousel';
import { formatCurrencyBRL } from '@/lib/format';

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

interface ProductModalDBProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: () => void;
  isOutOfStock: boolean;
}

export const ProductModalDB: React.FC<ProductModalDBProps> = ({
  product,
  isOpen,
  onClose,
  onAddToCart,
  isOutOfStock,
}) => {
  const handleAdd = () => {
    onAddToCart();
    onClose();
  };

  const isOnSale = product.original_price && product.original_price > product.price;
  const discountPercent = isOnSale 
    ? Math.round(((product.original_price! - product.price) / product.original_price!) * 100)
    : 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-script text-3xl text-primary">
            {product.name}
          </DialogTitle>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Image Carousel */}
          <ProductImageCarousel 
            productId={product.id} 
            fallbackImage={product.image_url || '/placeholder.svg'}
          />

          {/* Details */}
          <div className="space-y-4">
            {/* Category & Scent Family */}
            <div className="flex flex-wrap gap-2">
              {product.category && (
                <Badge variant="secondary" className="font-serif gap-1">
                  <Package className="h-3 w-3" />
                  {product.category.name}
                </Badge>
              )}
              {product.scent_family && (
                <Badge variant="outline" className="font-serif gap-1">
                  <Sparkles className="h-3 w-3" />
                  {product.scent_family.name}
                </Badge>
              )}
              {product.badge && (
                <Badge className="font-serif bg-accent/90 text-accent-foreground gap-1">
                  <Tag className="h-3 w-3" />
                  {product.badge}
                </Badge>
              )}
            </div>

            {/* Description */}
            {product.description && (
              <div>
                <h4 className="font-serif font-medium text-primary mb-2 flex items-center gap-2">
                  <Leaf className="h-4 w-4 text-primary" />
                  Descrição
                </h4>
                <p className="font-serif text-muted-foreground">{product.description}</p>
              </div>
            )}

            {/* Benefits */}
            {product.benefits && product.benefits.length > 0 && (
              <div>
                <h4 className="font-serif font-medium text-primary mb-2">Benefícios</h4>
                <ul className="font-serif text-muted-foreground text-sm space-y-1">
                  {product.benefits.map((benefit, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-accent">•</span>
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Price and add to cart */}
            <div className="pt-4 border-t border-border">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="font-serif text-2xl font-semibold text-primary">
                    {formatCurrencyBRL(product.price)}
                  </span>
                  {isOnSale && (
                    <>
                      <span className="font-serif text-sm text-muted-foreground line-through ml-2">
                        {formatCurrencyBRL(product.original_price!)}
                      </span>
                      <Badge className="ml-2 bg-green-600 hover:bg-green-700">
                        -{discountPercent}%
                      </Badge>
                    </>
                  )}
                </div>
              </div>
              <Button 
                onClick={handleAdd} 
                className="w-full font-serif" 
                size="lg"
                disabled={isOutOfStock}
                variant={isOutOfStock ? 'secondary' : 'default'}
              >
                <ShoppingBag className="mr-2 h-4 w-4" />
                {isOutOfStock ? 'Produto Indisponível' : 'Adicionar ao Pedido'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
