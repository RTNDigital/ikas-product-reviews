'use client';

import { useState } from 'react';
import { ApiRequests } from '@/lib/api-requests';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Save, Check } from 'lucide-react';
import type { WidgetSettings } from './types';

interface WidgetSettingsTabProps {
  token: string;
  widgetSettings: WidgetSettings;
  onSaved: (settings: WidgetSettings) => void;
}

function FieldRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div>
        <Label>{label}</Label>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
      {children}
    </div>
  );
}

export function WidgetSettingsTab({ token, widgetSettings, onSaved }: WidgetSettingsTabProps) {
  const [form, setForm] = useState<WidgetSettings>(widgetSettings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const update = <K extends keyof WidgetSettings>(key: K, value: WidgetSettings[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await ApiRequests.ikas.updateWidgetSettings(token, {
        reviewsWidgetEnabled: form.reviewsWidgetEnabled,
        reviewsLayout: form.reviewsLayout,
        reviewsPerPage: form.reviewsPerPage,
        reviewsSortDefault: form.reviewsSortDefault,
        showReviewsHeader: form.showReviewsHeader,
        showFilters: form.showFilters,
        showPhotos: form.showPhotos,
        starRatingEnabled: form.starRatingEnabled,
        starRatingStyle: form.starRatingStyle,
        starColor: form.starColor,
        emptyStarBehavior: form.emptyStarBehavior,
        trustBadgeEnabled: form.trustBadgeEnabled,
        trustBadgePosition: form.trustBadgePosition,
        carouselEnabled: form.carouselEnabled,
        carouselAutoplay: form.carouselAutoplay,
        carouselSpeed: form.carouselSpeed,
      });
      if (res.status === 200) {
        onSaved(form);
        setSaved(true);
      }
    } catch (error) {
      console.error('Error saving widget settings:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border">
        <Accordion type="multiple" defaultValue={['reviews-widget']} className="px-4">
          <AccordionItem value="reviews-widget">
            <AccordionTrigger>Yorumlar Widget&apos;ı</AccordionTrigger>
            <AccordionContent className="space-y-1">
              <FieldRow label="Widget&apos;ı etkinleştir">
                <Switch checked={form.reviewsWidgetEnabled} onCheckedChange={(v) => update('reviewsWidgetEnabled', v)} />
              </FieldRow>
              <FieldRow label="Görünüm">
                <Select value={form.reviewsLayout} onValueChange={(v) => update('reviewsLayout', v)}>
                  <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="list">Liste</SelectItem>
                    <SelectItem value="grid">Izgara</SelectItem>
                  </SelectContent>
                </Select>
              </FieldRow>
              <FieldRow label="Sayfa başına yorum">
                <Input
                  type="number"
                  min={1}
                  max={100}
                  className="w-24"
                  value={form.reviewsPerPage}
                  onChange={(e) => update('reviewsPerPage', Number(e.target.value) || 1)}
                />
              </FieldRow>
              <FieldRow label="Varsayılan sıralama">
                <Select value={form.reviewsSortDefault} onValueChange={(v) => update('reviewsSortDefault', v)}>
                  <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">En Yeni</SelectItem>
                    <SelectItem value="highest">En Yüksek Puan</SelectItem>
                    <SelectItem value="lowest">En Düşük Puan</SelectItem>
                    <SelectItem value="helpful">En Faydalı</SelectItem>
                  </SelectContent>
                </Select>
              </FieldRow>
              <FieldRow label="Başlığı göster">
                <Switch checked={form.showReviewsHeader} onCheckedChange={(v) => update('showReviewsHeader', v)} />
              </FieldRow>
              <FieldRow label="Filtreleri göster">
                <Switch checked={form.showFilters} onCheckedChange={(v) => update('showFilters', v)} />
              </FieldRow>
              <FieldRow label="Fotoğrafları göster">
                <Switch checked={form.showPhotos} onCheckedChange={(v) => update('showPhotos', v)} />
              </FieldRow>
              <FieldRow label="Yıldız rengi">
                <input
                  type="color"
                  className="h-9 w-16 cursor-pointer rounded-md border border-input bg-transparent"
                  value={form.starColor}
                  onChange={(e) => update('starColor', e.target.value)}
                />
              </FieldRow>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="star-rating">
            <AccordionTrigger>Yıldız Puanlama</AccordionTrigger>
            <AccordionContent className="space-y-1">
              <FieldRow label="Etkinleştir" description="Ürün kartlarında yıldız puanı gösterir">
                <Switch checked={form.starRatingEnabled} onCheckedChange={(v) => update('starRatingEnabled', v)} />
              </FieldRow>
              <FieldRow label="Stil">
                <Select value={form.starRatingStyle} onValueChange={(v) => update('starRatingStyle', v)}>
                  <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="badge">Rozet</SelectItem>
                    <SelectItem value="inline">Satır İçi</SelectItem>
                  </SelectContent>
                </Select>
              </FieldRow>
              <FieldRow label="Yorumsuz ürünlerde" description="Hiç yorumu olmayan ürünlerde ne yapılsın">
                <Select value={form.emptyStarBehavior} onValueChange={(v) => update('emptyStarBehavior', v)}>
                  <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hide">Gizle</SelectItem>
                    <SelectItem value="show">Boş Göster</SelectItem>
                    <SelectItem value="dash">Tire Göster</SelectItem>
                  </SelectContent>
                </Select>
              </FieldRow>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="trust-badge">
            <AccordionTrigger>Güven Rozeti</AccordionTrigger>
            <AccordionContent className="space-y-1">
              <FieldRow label="Etkinleştir">
                <Switch checked={form.trustBadgeEnabled} onCheckedChange={(v) => update('trustBadgeEnabled', v)} />
              </FieldRow>
              <FieldRow label="Konum">
                <Select value={form.trustBadgePosition} onValueChange={(v) => update('trustBadgePosition', v)}>
                  <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bottom-left">Sol Alt</SelectItem>
                    <SelectItem value="bottom-right">Sağ Alt</SelectItem>
                    <SelectItem value="top-left">Sol Üst</SelectItem>
                    <SelectItem value="top-right">Sağ Üst</SelectItem>
                  </SelectContent>
                </Select>
              </FieldRow>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="carousel">
            <AccordionTrigger>Karusel</AccordionTrigger>
            <AccordionContent className="space-y-1">
              <FieldRow label="Etkinleştir">
                <Switch checked={form.carouselEnabled} onCheckedChange={(v) => update('carouselEnabled', v)} />
              </FieldRow>
              <FieldRow label="Otomatik oynat">
                <Switch checked={form.carouselAutoplay} onCheckedChange={(v) => update('carouselAutoplay', v)} />
              </FieldRow>
              <FieldRow label="Hız (ms)">
                <Input
                  type="number"
                  min={1000}
                  step={500}
                  className="w-28"
                  value={form.carouselSpeed}
                  onChange={(e) => update('carouselSpeed', Number(e.target.value) || 1000)}
                />
              </FieldRow>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      <div className="flex items-center justify-end gap-3">
        {saved && (
          <span className="flex items-center gap-1 text-sm text-emerald-600">
            <Check className="size-4" />
            Kaydedildi
          </span>
        )}
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Değişiklikleri Kaydet
        </Button>
      </div>
    </div>
  );
}
