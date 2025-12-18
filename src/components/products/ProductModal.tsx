import { X, ShoppingBag, Sparkles, Flame, Leaf } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Product, ProductSize } from '@/types';

interface ProductModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: () => void;
  selectedSize: ProductSize;
  onSizeChange: (size: ProductSize) => void;
}

export const ProductModal: React.FC<ProductModalProps> = ({
  product,
  isOpen,
  onClose,
  onAddToCart,
  selectedSize,
  onSizeChange,
}) => {
  const handleAdd = () => {
    onAddToCart();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-script text-3xl text-primary">
            {product.name}
          </DialogTitle>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Image */}
          <div className="aspect-square bg-secondary/30 rounded-lg overflow-hidden">
            <img
              src={product.image}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          </div>

          {/* Details */}
          <div className="space-y-4">
            <div>
              <h4 className="font-serif font-medium text-primary mb-2 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-accent" />
                Notas Olfativas
              </h4>
              <p className="font-serif text-muted-foreground">{product.scentNotes}</p>
            </div>

            <div>
              <h4 className="font-serif font-medium text-primary mb-2 flex items-center gap-2">
                <Leaf className="h-4 w-4 text-primary" />
                Descrição
              </h4>
              <p className="font-serif text-muted-foreground">{product.description}</p>
            </div>

            {product.howToUse && (
              <div>
                <h4 className="font-serif font-medium text-primary mb-2">Como Usar</h4>
                <p className="font-serif text-muted-foreground text-sm">{product.howToUse}</p>
              </div>
            )}

            {product.ritualSuggestion && (
              <div className="bg-secondary/50 p-4 rounded-lg">
                <h4 className="font-serif font-medium text-primary mb-2 flex items-center gap-2">
                  <Flame className="h-4 w-4 text-accent" />
                  Sugestão de Ritual a Dois
                </h4>
                <p className="font-serif text-muted-foreground text-sm italic">
                  {product.ritualSuggestion}
                </p>
              </div>
            )}

            {/* Size selector */}
            {product.sizes.length > 1 && (
              <div>
                <label className="font-serif font-medium text-primary mb-2 block">
                  Tamanho
                </label>
                <Select
                  value={selectedSize.id}
                  onValueChange={(value) => {
                    const size = product.sizes.find((s) => s.id === value);
                    if (size) onSizeChange(size);
                  }}
                >
                  <SelectTrigger className="font-serif">
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
              </div>
            )}

            {/* Price and add to cart */}
            <div className="pt-4 border-t border-border">
              <div className="flex items-center justify-between mb-4">
                <span className="font-serif text-2xl font-semibold text-primary">
                  R$ {selectedSize.price.toFixed(2).replace('.', ',')}
                </span>
              </div>
              <Button onClick={handleAdd} className="w-full font-serif" size="lg">
                <ShoppingBag className="mr-2 h-4 w-4" />
                Adicionar ao Pedido
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
