'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AlertCircle, Loader2 } from 'lucide-react';
import { ReviewForm } from '@/components/review-form/review-form';

interface ValidateResponse {
  valid: boolean;
  error?: string;
  merchantId?: string;
  orderId?: string;
  customerEmail?: string;
  brandColor?: string;
  couponEnabled?: boolean;
  couponType?: string;
  couponValue?: number;
}

type PageState = 'loading' | 'valid' | 'invalid';

export default function ReviewTokenPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token;

  const [state, setState] = useState<PageState>('loading');
  const [data, setData] = useState<ValidateResponse | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    fetch(`/api/reviews/validate-token?token=${encodeURIComponent(token)}`)
      .then((res) => res.json())
      .then((json: ValidateResponse) => {
        if (cancelled) return;
        setData(json);
        setState(json.valid ? 'valid' : 'invalid');
      })
      .catch(() => {
        if (!cancelled) setState('invalid');
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-6 px-4 py-10">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">Ürün Değerlendirmesi</h1>
        <p className="mt-1 text-sm text-muted-foreground">Deneyiminizi bizimle paylaşın</p>
      </div>

      {state === 'loading' && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border bg-card p-10 text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
          <span className="text-sm">Yükleniyor...</span>
        </div>
      )}

      {state === 'invalid' && (
        <div className="flex flex-col items-center gap-3 rounded-lg border bg-card p-10 text-center">
          <AlertCircle className="size-8 text-destructive" />
          <h2 className="text-lg font-medium">Bağlantı geçersiz</h2>
          <p className="text-sm text-muted-foreground">
            {data?.error === 'Token expired'
              ? 'Bu değerlendirme bağlantısının süresi dolmuş veya daha önce kullanılmış.'
              : 'Bu değerlendirme bağlantısı geçersiz. Lütfen e-postanızdaki bağlantıyı kontrol edin.'}
          </p>
        </div>
      )}

      {state === 'valid' && data && token && (
        <ReviewForm
          token={token}
          merchantId={data.merchantId!}
          customerEmail={data.customerEmail!}
          brandColor={data.brandColor}
          couponEnabled={data.couponEnabled}
          couponType={data.couponType}
          couponValue={data.couponValue}
        />
      )}
    </main>
  );
}
