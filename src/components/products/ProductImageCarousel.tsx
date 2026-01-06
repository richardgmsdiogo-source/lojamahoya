import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface ProductImage {
  id: string;
  image_url: string;
  display_order: number;
}

interface ProductImageCarouselProps {
  productId: string;
  fallbackImage?: string;
  className?: string;
}

export const ProductImageCarousel = ({ productId, fallbackImage, className }: ProductImageCarouselProps) => {
  const [images, setImages] = useState<ProductImage[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchImages = async () => {
      const { data } = await supabase
        .from('product_images')
        .select('*')
        .eq('product_id', productId)
        .order('display_order');
      
      setImages(data || []);
      setIsLoading(false);
    };

    fetchImages();
  }, [productId]);

  const allImages = images.length > 0 
    ? images 
    : fallbackImage 
      ? [{ id: 'fallback', image_url: fallbackImage, display_order: 0 }] 
      : [];

  if (isLoading) {
    return (
      <div className={cn("aspect-square bg-secondary/30 rounded-lg animate-pulse", className)} />
    );
  }

  if (allImages.length === 0) {
    return (
      <div className={cn("aspect-square bg-secondary/30 rounded-lg flex items-center justify-center", className)}>
        <span className="text-muted-foreground text-sm">Sem imagem</span>
      </div>
    );
  }

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? allImages.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === allImages.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className={cn("relative group", className)}>
      {/* Main Image */}
      <div className="aspect-square bg-secondary/30 rounded-lg overflow-hidden">
        <img
          src={allImages[currentIndex].image_url}
          alt={`Imagem ${currentIndex + 1}`}
          className="h-full w-full object-cover transition-all duration-300"
        />
      </div>

      {/* Navigation Arrows - only show if more than 1 image */}
      {allImages.length > 1 && (
        <>
          <Button
            variant="secondary"
            size="icon"
            className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
            onClick={goToPrevious}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
            onClick={goToNext}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </>
      )}

      {/* Dots Indicator */}
      {allImages.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
          {allImages.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={cn(
                "w-2 h-2 rounded-full transition-all",
                index === currentIndex 
                  ? "bg-primary w-4" 
                  : "bg-primary/40 hover:bg-primary/60"
              )}
            />
          ))}
        </div>
      )}

      {/* Thumbnails - show below main image if more than 1 */}
      {allImages.length > 1 && (
        <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
          {allImages.map((img, index) => (
            <button
              key={img.id}
              onClick={() => setCurrentIndex(index)}
              className={cn(
                "flex-shrink-0 w-14 h-14 rounded-md overflow-hidden border-2 transition-all",
                index === currentIndex 
                  ? "border-primary" 
                  : "border-transparent opacity-60 hover:opacity-100"
              )}
            >
              <img
                src={img.image_url}
                alt={`Miniatura ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
