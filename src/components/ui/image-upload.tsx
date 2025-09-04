import React, { useState, useCallback } from 'react';
import { Upload, X, Image, FileText } from 'lucide-react';
import { Button } from './button';
import { Card } from './card';
import { useToast } from './use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ImageUploadProps {
  recordType: string;
  recordId: string;
  onImageUploaded?: (imageUrl: string, imageId: string) => void;
  maxFiles?: number;
  className?: string;
}

interface UploadedImage {
  id: string;
  url: string;
  description: string;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  recordType,
  recordId,
  onImageUploaded,
  maxFiles = 5,
  className = ""
}) => {
  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const { toast } = useToast();

  const uploadImage = async (file: File, description?: string) => {
    try {
      setUploading(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${recordType}_${recordId}_${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('data-entry-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('data-entry-images')
        .getPublicUrl(fileName);

      // Save image record to database
      const { data: imageRecord, error: dbError } = await supabase
        .from('data_entry_images')
        .insert({
          record_type: recordType,
          record_id: recordId,
          image_url: urlData.publicUrl,
          description: description || file.name,
          uploaded_by: user.id
        })
        .select()
        .single();

      if (dbError) throw dbError;

      const newImage = {
        id: imageRecord.id,
        url: urlData.publicUrl,
        description: description || file.name
      };

      setImages(prev => [...prev, newImage]);
      onImageUploaded?.(urlData.publicUrl, imageRecord.id);

      toast({
        title: "Image uploaded successfully",
        description: "Your image has been uploaded and saved."
      });

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload image",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length + images.length > maxFiles) {
      toast({
        title: "Too many files",
        description: `Maximum ${maxFiles} images allowed`,
        variant: "destructive"
      });
      return;
    }

    imageFiles.forEach(file => uploadImage(file));
  }, [images.length, maxFiles]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length + images.length > maxFiles) {
      toast({
        title: "Too many files",
        description: `Maximum ${maxFiles} images allowed`,
        variant: "destructive"
      });
      return;
    }

    imageFiles.forEach(file => uploadImage(file));
  };

  const removeImage = async (imageId: string) => {
    try {
      const { error } = await supabase
        .from('data_entry_images')
        .delete()
        .eq('id', imageId);

      if (error) throw error;

      setImages(prev => prev.filter(img => img.id !== imageId));
      
      toast({
        title: "Image removed",
        description: "Image has been deleted successfully."
      });
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Delete failed",
        description: "Failed to remove image",
        variant: "destructive"
      });
    }
  };

  return (
    <div className={className}>
      {/* Upload Area */}
      <Card 
        className={`border-2 border-dashed p-6 text-center transition-colors ${
          dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
        }`}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onDragEnter={() => setDragActive(true)}
        onDragLeave={() => setDragActive(false)}
      >
        <div className="flex flex-col items-center gap-2">
          <Upload className="h-8 w-8 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Drop images here or click to upload</p>
            <p className="text-xs text-muted-foreground">
              PNG, JPG, JPEG up to 10MB ({images.length}/{maxFiles} uploaded)
            </p>
          </div>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            id={`file-upload-${recordType}-${recordId}`}
            disabled={uploading || images.length >= maxFiles}
          />
          <Button
            variant="outline"
            size="sm"
            asChild
            disabled={uploading || images.length >= maxFiles}
          >
            <label htmlFor={`file-upload-${recordType}-${recordId}`} className="cursor-pointer">
              {uploading ? 'Uploading...' : 'Select Files'}
            </label>
          </Button>
        </div>
      </Card>

      {/* Uploaded Images */}
      {images.length > 0 && (
        <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
          {images.map((image) => (
            <Card key={image.id} className="relative group overflow-hidden">
              <div className="aspect-square relative">
                <img
                  src={image.url}
                  alt={image.description}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => removeImage(image.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="p-2">
                <p className="text-xs text-muted-foreground truncate">{image.description}</p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};