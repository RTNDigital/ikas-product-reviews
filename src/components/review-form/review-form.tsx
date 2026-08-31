'use client';

import { useMemo, useState } from 'react';
import { Loader2, PartyPopper, Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { StarInput } from './star-input';
import { PhotoUpload, type UploadedPhoto } from './photo-upload';

interface ReviewFormProps {
  token: string;
  merchantId: string;
  customerEmail: string;
  brandColor?: string;
  couponEnabled?: boolean;
  couponType?: string;
  couponValue?: number;
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || `product-${Date.now()}`;
}

export function ReviewForm({ token, merchantId, customerEmail, brandColor, couponEnabled, couponType, couponValue }: ReviewFormProps) {
  const accentColor = brandColor || '#111827';

  const [customerName, setCustomerName] = useState('');
  const [productName, setProductName] = useState('');
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [photosBusy, setPhotosBusy] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ reviewStatus: string; couponCode: string | null } | null>(null);

  const bodyTooShort = body.trim().length > 0 && body.trim().length < 10;
  const canSubmit = useMemo(
    () => rating >= 1 && body.trim().length >= 10 && productName.trim().length > 0 && !photosBusy && !submitting,
    [rating, body, productName, photosBusy, submitting],
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/reviews/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewToken: token,
          merchantId,
          productId: slugify(productName),
          productName: productName.trim(),
          customerName: customerName.trim() || undefined,
          rating,
          title: title.trim() || undefined,
          body: body.trim(),
          photos,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error || 'Yorumunuz gönderilemedi. Lütfen tekrar deneyin.');
        setSubmitting(false);
        return;
      }

      setResult({ reviewStatus: json.reviewStatus, couponCode: json.couponCode });
    } catch {
      setError('Bir hata oluştu. Lütfen internet bağlantınızı kontrol edip tekrar deneyin.');
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-lg border bg-card p-8 text-center">
        <PartyPopper className="size-10" style={{ color: accentColor }} />
        <h2 className="text-xl font-semibold">Teşekkürler!</h2>
        <p className="text-sm text-muted-foreground">
          {result.reviewStatus === 'published'
            ? 'Yorumunuz yayınlandı.'
            : 'Yorumunuz alındı ve incelendikten sonra yayınlanacak.'}
        </p>
        {result.couponCode && (
          <div className="mt-2 flex flex-col items-center gap-2 rounded-md border border-dashed p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Ticket className="size-4" style={{ color: accentColor }} />
              İndirim kodunuz hazır
            </div>
            <code className="rounded bg-muted px-3 py-1.5 text-lg font-bold tracking-wider">{result.couponCode}</code>
            {couponEnabled && couponType && couponValue !== undefined && (
              <span className="text-xs text-muted-foreground">
                {couponType === 'percentage' ? `%${couponValue} indirim` : `${couponValue} birim indirim`}
              </span>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 rounded-lg border bg-card p-6">
      <p className="text-sm text-muted-foreground">
        Değerlendirmeniz <span className="font-medium text-foreground">{customerEmail}</span> adresine yapılan sipariş için gönderilecek.
      </p>

      <div className="space-y-2">
        <Label htmlFor="productName">Ürün adı</Label>
        <Input
          id="productName"
          value={productName}
          onChange={(e) => setProductName(e.target.value)}
          placeholder="Değerlendirdiğiniz ürünün adı"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="customerName">Adınız (opsiyonel)</Label>
        <Input
          id="customerName"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          placeholder="Yorumunuzda görünecek isim"
        />
      </div>

      <div className="space-y-2">
        <Label>Puanınız</Label>
        <StarInput value={rating} onChange={setRating} color={accentColor} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">Başlık (opsiyonel)</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Yorumunuzu özetleyin"
          maxLength={120}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="body">Yorumunuz</Label>
        <Textarea
          id="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Ürün hakkındaki düşüncelerinizi paylaşın (en az 10 karakter)"
          rows={5}
          required
        />
        {bodyTooShort && <p className="text-xs text-destructive">En az 10 karakter yazmalısınız.</p>}
      </div>

      <div className="space-y-2">
        <Label>Fotoğraf ekle (opsiyonel)</Label>
        <PhotoUpload merchantId={merchantId} onChange={setPhotos} onBusyChange={setPhotosBusy} />
      </div>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <Button
        type="submit"
        disabled={!canSubmit}
        style={{ backgroundColor: accentColor, borderColor: accentColor }}
        className="text-white hover:opacity-90"
      >
        {submitting && <Loader2 className="size-4 animate-spin" />}
        Yorumu Gönder
      </Button>
    </form>
  );
}
