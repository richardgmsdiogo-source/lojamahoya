import { useState, useEffect } from 'react';
import { Package, Pencil, Calculator, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrencyBRL, formatNumberBR } from '@/lib/format';

interface ProductWithStock {
  id: string;
  name: string;
  slug: string;
  price: number;
  is_active: boolean;
  image_url: string | null;
  category: { name: string } | null;
  finished_goods_stock: { current_quantity: number } | null;
  recipe: { total_cost: number }[] | null;
}

export const AdminFinishedGoodsTab = () => {
  const [products, setProducts] = useState<ProductWithStock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState<ProductWithStock | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  
  // Form state
  const [quantity, setQuantity] = useState('');
  const [priceMode, setPriceMode] = useState<'percentage' | 'value'>('percentage');
  const [profitPercentage, setProfitPercentage] = useState('');
  const [finalPrice, setFinalPrice] = useState('');
  
  const { toast } = useToast();

  const fetchData = async () => {
    setIsLoading(true);
    
    const { data: prods } = await supabase
      .from('products')
      .select(`
        id,
        name,
        slug,
        price,
        is_active,
        image_url,
        category:categories(name),
        finished_goods_stock(current_quantity),
        recipe:recipes(total_cost)
      `)
      .order('name');
    
    // Transform the data to match expected interface
    const transformedProducts: ProductWithStock[] = (prods || []).map((p: any) => {
      const stockRel = p.finished_goods_stock;
      const normalizedStock = Array.isArray(stockRel)
        ? (stockRel[0] ?? null)
        : (stockRel ?? null);

      return {
        ...p,
        finished_goods_stock: normalizedStock,
        recipe: p.recipe || null,
      };
    });
    
    setProducts(transformedProducts);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getCostPrice = (product: ProductWithStock): number => {
    // Pegar o custo da receita ativa
    if (Array.isArray(product.recipe) && product.recipe.length > 0) {
      return product.recipe[0].total_cost || 0;
    }
    return 0;
  };

  const getStock = (product: ProductWithStock): number => {
    return product.finished_goods_stock?.current_quantity || 0;
  };

  const calculateProfitMargin = (costPrice: number, salePrice: number): number => {
    if (costPrice <= 0) return 0;
    return ((salePrice - costPrice) / costPrice) * 100;
  };

  const openEditDialog = (product: ProductWithStock) => {
    setEditingProduct(product);
    const stock = getStock(product);
    const costPrice = getCostPrice(product);
    const margin = calculateProfitMargin(costPrice, product.price);
    
    setQuantity(stock.toString());
    setPriceMode('percentage');
    setProfitPercentage(margin.toFixed(2));
    setFinalPrice(product.price.toString());
    setIsEditDialogOpen(true);
  };

  const handlePercentageChange = (value: string) => {
    setProfitPercentage(value);
    setPriceMode('percentage');
    
    if (editingProduct) {
      const costPrice = getCostPrice(editingProduct);
      const percentage = parseFloat(value) || 0;
      const calculatedPrice = costPrice * (1 + percentage / 100);
      setFinalPrice(calculatedPrice.toFixed(2));
    }
  };

  const handleFinalPriceChange = (value: string) => {
    setFinalPrice(value);
    setPriceMode('value');
    
    if (editingProduct) {
      const costPrice = getCostPrice(editingProduct);
      const price = parseFloat(value) || 0;
      if (costPrice > 0) {
        const percentage = ((price - costPrice) / costPrice) * 100;
        setProfitPercentage(percentage.toFixed(2));
      }
    }
  };

  const handleSaveClick = () => {
    setIsConfirmDialogOpen(true);
  };

  const handleConfirmSave = async () => {
    if (!editingProduct) return;
    
    const newPrice = parseFloat(finalPrice);
    const newQuantity = parseInt(quantity);
    
    if (isNaN(newPrice) || newPrice <= 0) {
      toast({ title: 'Erro', description: 'Preço inválido.', variant: 'destructive' });
      return;
    }
    
    // Atualizar preço do produto
    const { error: priceError } = await supabase
      .from('products')
      .update({ price: newPrice, updated_at: new Date().toISOString() })
      .eq('id', editingProduct.id);
    
    if (priceError) {
      toast({ title: 'Erro', description: 'Erro ao atualizar preço: ' + priceError.message, variant: 'destructive' });
      return;
    }
    
    // Atualizar ou inserir estoque usando upsert
    if (!isNaN(newQuantity) && newQuantity >= 0) {
      const { error: stockError } = await supabase
        .from('finished_goods_stock')
        .upsert(
          { 
            product_id: editingProduct.id, 
            current_quantity: newQuantity, 
            updated_at: new Date().toISOString() 
          },
          { onConflict: 'product_id' }
        );
      
      if (stockError) {
        toast({ title: 'Erro', description: 'Erro ao atualizar estoque: ' + stockError.message, variant: 'destructive' });
        return;
      }
    }
    
    toast({ title: 'Sucesso', description: 'Produto atualizado com sucesso.' });
    setIsEditDialogOpen(false);
    setIsConfirmDialogOpen(false);
    setEditingProduct(null);
    fetchData();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Estoque & Preços de Venda ({products.length})
        </CardTitle>
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
            <div className="grid grid-cols-6 gap-4 p-3 bg-muted rounded-lg font-medium text-sm">
              <span className="col-span-2">Produto</span>
              <span className="text-right">Custo</span>
              <span className="text-right">Preço Venda</span>
              <span className="text-right">Estoque</span>
              <span className="text-right">Ações</span>
            </div>
            
            {products.map((prod) => {
              const costPrice = getCostPrice(prod);
              const stock = getStock(prod);
              const margin = calculateProfitMargin(costPrice, prod.price);
              
              return (
                <div 
                  key={prod.id}
                  className={`grid grid-cols-6 gap-4 p-4 rounded-lg items-center ${
                    prod.is_active ? 'bg-muted/50' : 'bg-muted/30 opacity-60'
                  }`}
                >
                  <div className="col-span-2 flex items-center gap-3">
                    {prod.image_url && (
                      <img 
                        src={prod.image_url}
                        alt={prod.name}
                        loading="lazy"
                        className="w-10 h-10 object-cover rounded"
                      />
                    )}
                    <div>
                      <p className="font-medium">{prod.name}</p>
                      {prod.category && (
                        <p className="text-xs text-muted-foreground">{prod.category.name}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="font-mono">{formatCurrencyBRL(costPrice)}</p>
                  </div>
                  
                  <div className="text-right">
                    <p className="font-mono font-medium">{formatCurrencyBRL(prod.price)}</p>
                    {costPrice > 0 && (
                      <p className={`text-xs ${margin > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {margin > 0 ? '+' : ''}{formatNumberBR(margin, { maximumFractionDigits: 2 })}%
                      </p>
                    )}
                  </div>
                  
                  <div className="text-right">
                    <p className={`font-mono ${stock <= 0 ? 'text-red-600' : ''}`}>
                      {stock} un.
                    </p>
                  </div>
                  
                  <div className="text-right">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => openEditDialog(prod)}
                    >
                      <Pencil className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Dialog de edição */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar {editingProduct?.name}</DialogTitle>
          </DialogHeader>
          
          {editingProduct && (
            <div className="space-y-6">
              {/* Info de custo */}
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Preço de Custo (receita ativa)</p>
                <p className="text-xl font-bold">{formatCurrencyBRL(getCostPrice(editingProduct))}</p>
              </div>
              
              {/* Quantidade em estoque */}
              <div>
                <Label>Quantidade em Estoque</Label>
                <Input
                  type="number"
                  min="0"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="mt-1"
                />
              </div>
              
              {/* Definição de preço */}
              <div className="space-y-4">
                <Label className="flex items-center gap-2">
                  <Calculator className="h-4 w-4" />
                  Definir Preço de Venda
                </Label>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">% de Lucro</Label>
                    <div className="flex items-center gap-1 mt-1">
                      <Input
                        type="number"
                        step="0.01"
                        value={profitPercentage}
                        onChange={(e) => handlePercentageChange(e.target.value)}
                        className={priceMode === 'percentage' ? 'border-primary' : ''}
                      />
                      <span className="text-muted-foreground">%</span>
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-sm text-muted-foreground">Valor Final</Label>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-muted-foreground">R$</span>
                      <Input
                        type="number"
                        step="0.01"
                        value={finalPrice}
                        onChange={(e) => handleFinalPriceChange(e.target.value)}
                        className={priceMode === 'value' ? 'border-primary' : ''}
                      />
                    </div>
                  </div>
                </div>
                
                <p className="text-xs text-muted-foreground">
                  {priceMode === 'percentage' 
                    ? `Preço calculado com base na % de lucro: ${formatCurrencyBRL(parseFloat(finalPrice) || 0)}`
                    : `Margem calculada com base no valor: ${formatNumberBR(parseFloat(profitPercentage) || 0, { maximumFractionDigits: 2 })}%`
                  }
                </p>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  <X className="h-4 w-4 mr-1" />
                  Cancelar
                </Button>
                <Button onClick={handleSaveClick}>
                  <Save className="h-4 w-4 mr-1" />
                  Salvar
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação */}
      <AlertDialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar alterações?</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a alterar o preço e/ou estoque do produto <strong>{editingProduct?.name}</strong>.
              <br /><br />
              <strong>Novo preço:</strong> {formatCurrencyBRL(parseFloat(finalPrice) || 0)}<br />
              <strong>Nova quantidade:</strong> {quantity} unidades
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSave}>
              Confirmar Alterações
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};