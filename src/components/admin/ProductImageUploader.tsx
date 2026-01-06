import { useState, useRef } from 'react';
import { Upload, X, GripVertical, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ProductImage {
  id: string;
  image_url: string;
  display_order: number;
}

interface ProductImageUploaderProps {
  productId: string;
  images: ProductImage[];
  onImagesChange: () => void;
}

const MAX_IMAGES = 10;

export const ProductImageUploader = ({ productId, images, onImagesChange }: ProductImageUploaderProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = MAX_IMAGES - images.length;
    if (files.length > remainingSlots) {
      toast({
        title: 'Limite de imagens',
        description: `Você pode adicionar no máximo ${remainingSlots} imagem(ns) mais.`,
        variant: 'destructive'
      });
      return;
    }

    setIsUploading(true);
    
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${productId}/${Date.now()}-${i}.${fileExt}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(fileName, file, { cacheControl: '3600', upsert: false });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          toast({
            title: 'Erro no upload',
            description: `Erro ao enviar ${file.name}`,
            variant: 'destructive'
          });
          continue;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('product-images')
          .getPublicUrl(fileName);

        // Save to database
        const { error: dbError } = await supabase
          .from('product_images')
          .insert({
            product_id: productId,
            image_url: urlData.publicUrl,
            display_order: images.length + i
          });

        if (dbError) {
          console.error('DB error:', dbError);
          toast({
            title: 'Erro ao salvar',
            description: `Erro ao salvar ${file.name}`,
            variant: 'destructive'
          });
        }
      }

      toast({
        title: 'Sucesso',
        description: 'Imagens enviadas com sucesso!'
      });
      onImagesChange();
    } catch (error) {
      console.error('Error uploading:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao fazer upload das imagens',
        variant: 'destructive'
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = async (image: ProductImage) => {
    try {
      // Extract file path from URL
      const urlParts = image.image_url.split('/product-images/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        await supabase.storage.from('product-images').remove([filePath]);
      }

      // Remove from database
      await supabase.from('product_images').delete().eq('id', image.id);
      
      toast({ title: 'Removida', description: 'Imagem removida com sucesso.' });
      onImagesChange();
    } catch (error) {
      console.error('Error removing:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao remover imagem',
        variant: 'destructive'
      });
    }
  };

  const handleReorder = async (fromIndex: number, toIndex: number) => {
    const newImages = [...images];
    const [moved] = newImages.splice(fromIndex, 1);
    newImages.splice(toIndex, 0, moved);

    // Update all display_order values
    try {
      await Promise.all(
        newImages.map((img, idx) =>
          supabase
            .from('product_images')
            .update({ display_order: idx })
            .eq('id', img.id)
        )
      );
      onImagesChange();
    } catch (error) {
      console.error('Error reordering:', error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {images.length}/{MAX_IMAGES} imagens
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading || images.length >= MAX_IMAGES}
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Upload className="h-4 w-4 mr-2" />
          )}
          Adicionar Imagens
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-5 gap-2">
          {images
            .sort((a, b) => a.display_order - b.display_order)
            .map((image, index) => (
              <div
                key={image.id}
                className="relative group aspect-square rounded-lg overflow-hidden border border-border"
              >
                <img
                  src={image.image_url}
                  alt={`Imagem ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                  {index > 0 && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleReorder(index, index - 1)}
                    >
                      ←
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handleRemoveImage(image)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                  {index < images.length - 1 && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleReorder(index, index + 1)}
                    >
                      →
                    </Button>
                  )}
                </div>
                {index === 0 && (
                  <span className="absolute bottom-1 left-1 text-[10px] bg-primary text-primary-foreground px-1 rounded">
                    Principal
                  </span>
                )}
              </div>
            ))}
        </div>
      )}

      {images.length === 0 && (
        <div
          className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            Clique para adicionar até {MAX_IMAGES} imagens
          </p>
        </div>
      )}
    </div>
  );
};
