'use client';

import { useCallback, useRef, useState } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface UploadedPhoto {
  url: string;
  width?: number;
  height?: number;
  sizeBytes?: number;
}

interface PhotoItem extends UploadedPhoto {
  id: string;
  previewUrl: string;
  status: 'uploading' | 'done' | 'error';
  error?: string;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_PHOTOS = 5;

interface PhotoUploadProps {
  merchantId: string;
  onChange: (photos: UploadedPhoto[]) => void;
  onBusyChange?: (busy: boolean) => void;
  maxPhotos?: number;
  disabled?: boolean;
}

function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(objectUrl);
    };
    img.onerror = () => {
      resolve({ width: 0, height: 0 });
      URL.revokeObjectURL(objectUrl);
    };
    img.src = objectUrl;
  });
}

export function PhotoUpload({ merchantId, onChange, onBusyChange, maxPhotos = MAX_PHOTOS, disabled }: PhotoUploadProps) {
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const emitChange = useCallback((items: PhotoItem[]) => {
    const completed = items
      .filter((p) => p.status === 'done')
      .map((p) => ({ url: p.url, width: p.width, height: p.height, sizeBytes: p.sizeBytes }));
    onChange(completed);
    onBusyChange?.(items.some((p) => p.status === 'uploading'));
  }, [onChange, onBusyChange]);

  const uploadFile = useCallback(async (file: File, id: string) => {
    try {
      const { width, height } = await readImageDimensions(file);

      const res = await fetch('/api/reviews/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merchantId, contentType: file.type }),
      });

      if (!res.ok) {
        throw new Error('Presigned URL alınamadı');
      }

      const { uploadUrl, publicUrl } = await res.json();

      const putRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      if (!putRes.ok) {
        throw new Error('Yükleme başarısız');
      }

      setPhotos((prev) => {
        const next = prev.map((p) =>
          p.id === id
            ? { ...p, status: 'done' as const, url: publicUrl, width, height, sizeBytes: file.size }
            : p,
        );
        emitChange(next);
        return next;
      });
    } catch (err) {
      setPhotos((prev) => {
        const next = prev.map((p) =>
          p.id === id ? { ...p, status: 'error' as const, error: err instanceof Error ? err.message : 'Hata' } : p,
        );
        emitChange(next);
        return next;
      });
    }
  }, [merchantId, emitChange]);

  const addFiles = useCallback((fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    const remainingSlots = maxPhotos - photos.length;
    if (remainingSlots <= 0) return;

    const validFiles: File[] = [];
    for (const file of files) {
      if (validFiles.length >= remainingSlots) break;
      if (!ALLOWED_TYPES.includes(file.type)) continue;
      if (file.size > MAX_SIZE) continue;
      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    const newItems: PhotoItem[] = validFiles.map((file) => ({
      id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
      url: '',
      previewUrl: URL.createObjectURL(file),
      status: 'uploading',
      sizeBytes: file.size,
    }));

    setPhotos((prev) => {
      const next = [...prev, ...newItems];
      emitChange(next);
      return next;
    });

    newItems.forEach((item, index) => {
      uploadFile(validFiles[index], item.id);
    });
  }, [photos.length, maxPhotos, emitChange, uploadFile]);

  const removePhoto = useCallback((id: string) => {
    setPhotos((prev) => {
      const item = prev.find((p) => p.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      const next = prev.filter((p) => p.id !== id);
      emitChange(next);
      return next;
    });
  }, [emitChange]);

  const canAddMore = photos.length < maxPhotos && !disabled;

  return (
    <div className="space-y-3">
      {photos.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {photos.map((photo) => (
            <div key={photo.id} className="relative size-20 overflow-hidden rounded-md border bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.previewUrl} alt="Yüklenen fotoğraf" className="size-full object-cover" />
              {photo.status === 'uploading' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <Loader2 className="size-5 animate-spin text-white" />
                </div>
              )}
              {photo.status === 'error' && (
                <div className="absolute inset-0 flex items-center justify-center bg-destructive/70 p-1 text-center text-[10px] text-white">
                  {photo.error || 'Hata'}
                </div>
              )}
              <button
                type="button"
                onClick={() => removePhoto(photo.id)}
                aria-label="Fotoğrafı kaldır"
                className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {canAddMore && (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
          }}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed p-6 text-center text-sm text-muted-foreground transition-colors hover:border-ring hover:text-foreground',
            isDragging && 'border-ring bg-accent text-foreground',
          )}
        >
          <ImagePlus className="size-6" />
          <span>Fotoğraf eklemek için tıklayın veya sürükleyin</span>
          <span className="text-xs">JPEG, PNG, WebP · en fazla 10MB · en fazla {maxPhotos} fotoğraf</span>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) addFiles(e.target.files);
              e.target.value = '';
            }}
          />
        </div>
      )}
    </div>
  );
}
