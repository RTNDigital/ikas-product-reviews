'use client';

import { useCallback, useEffect, useState } from 'react';
import { ApiRequests } from '@/lib/api-requests';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Save, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import type { EmailLog, Pagination, StoreSettings } from './types';

interface EmailSettingsTabProps {
  token: string;
  storeSettings: StoreSettings;
  onSaved: (settings: StoreSettings) => void;
}

const EMAIL_STATUS_LABEL: Record<string, string> = {
  scheduled: 'Zamanlandı',
  sent: 'Gönderildi',
  failed: 'Başarısız',
  cancelled: 'İptal Edildi',
};

function formatDateTR(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function EmailSettingsTab({ token, storeSettings, onSaved }: EmailSettingsTabProps) {
  const [form, setForm] = useState<StoreSettings>(storeSettings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [logsPage, setLogsPage] = useState(1);
  const [logsPagination, setLogsPagination] = useState<Pagination | null>(null);

  const update = <K extends keyof StoreSettings>(key: K, value: StoreSettings[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await ApiRequests.ikas.updateStoreSettings(token, {
        emailEnabled: form.emailEnabled,
        emailDelay: form.emailDelay,
        emailSubject: form.emailSubject,
        emailFromName: form.emailFromName,
        couponEnabled: form.couponEnabled,
        couponType: form.couponType,
        couponValue: form.couponValue,
        couponMinPurchase: form.couponMinPurchase,
        couponExpiryDays: form.couponExpiryDays,
        reminderEnabled: form.reminderEnabled,
        reminderDelay: form.reminderDelay,
        brandColor: form.brandColor,
      });
      if (res.status === 200) {
        onSaved(form);
        setSaved(true);
      }
    } catch (error) {
      console.error('Error saving store settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const fetchLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const res = await ApiRequests.ikas.getEmailLogs(token, { page: logsPage, limit: 10 });
      const body = res.data as unknown as { data: EmailLog[]; pagination: Pagination };
      if (res.status === 200 && body?.data) {
        setLogs(body.data);
        setLogsPagination(body.pagination);
      }
    } catch (error) {
      console.error('Error fetching email logs:', error);
    } finally {
      setLogsLoading(false);
    }
  }, [token, logsPage]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>E-posta Ayarları</CardTitle>
          <CardDescription>Satın alma sonrası yorum isteği e-postalarını yönetin.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Yorum isteği e-postalarını etkinleştir</Label>
            <Switch checked={form.emailEnabled} onCheckedChange={(v) => update('emailEnabled', v)} />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="emailDelay">Gönderim gecikmesi (gün)</Label>
              <Input
                id="emailDelay"
                type="number"
                min={0}
                value={form.emailDelay}
                onChange={(e) => update('emailDelay', Number(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emailFromName">Gönderen adı</Label>
              <Input
                id="emailFromName"
                value={form.emailFromName}
                onChange={(e) => update('emailFromName', e.target.value)}
                placeholder="Mağaza Adı"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="emailSubject">E-posta konusu</Label>
            <Input
              id="emailSubject"
              value={form.emailSubject}
              onChange={(e) => update('emailSubject', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Kupon Ayarları</CardTitle>
          <CardDescription>Yorum yapan müşterilere indirim kuponu sunun.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Kuponu etkinleştir</Label>
            <Switch checked={form.couponEnabled} onCheckedChange={(v) => update('couponEnabled', v)} />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Kupon tipi</Label>
              <Select value={form.couponType} onValueChange={(v) => update('couponType', v)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Yüzde (%)</SelectItem>
                  <SelectItem value="fixed">Sabit Tutar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="couponValue">Değer</Label>
              <Input
                id="couponValue"
                type="number"
                min={0}
                value={form.couponValue}
                onChange={(e) => update('couponValue', Number(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="couponExpiryDays">Geçerlilik (gün)</Label>
              <Input
                id="couponExpiryDays"
                type="number"
                min={1}
                value={form.couponExpiryDays}
                onChange={(e) => update('couponExpiryDays', Number(e.target.value) || 1)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="couponMinPurchase">Minimum sepet tutarı</Label>
            <Input
              id="couponMinPurchase"
              type="number"
              min={0}
              value={form.couponMinPurchase}
              onChange={(e) => update('couponMinPurchase', Number(e.target.value) || 0)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Hatırlatma</CardTitle>
          <CardDescription>Yanıt verilmeyen isteklerde hatırlatma e-postası gönderin.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Hatırlatmayı etkinleştir</Label>
            <Switch checked={form.reminderEnabled} onCheckedChange={(v) => update('reminderEnabled', v)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reminderDelay">Hatırlatma gecikmesi (gün)</Label>
            <Input
              id="reminderDelay"
              type="number"
              min={1}
              className="w-32"
              value={form.reminderDelay}
              onChange={(e) => update('reminderDelay', Number(e.target.value) || 1)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Marka Rengi</CardTitle>
          <CardDescription>E-posta şablonlarında kullanılacak renk.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <input
              type="color"
              className="h-9 w-16 cursor-pointer rounded-md border border-input bg-transparent"
              value={form.brandColor}
              onChange={(e) => update('brandColor', e.target.value)}
            />
            <Input
              className="w-32"
              value={form.brandColor}
              onChange={(e) => update('brandColor', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

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

      <Card>
        <CardHeader>
          <CardTitle>Son E-posta Kayıtları</CardTitle>
          <CardDescription>Gönderilen ve zamanlanan yorum isteği e-postaları.</CardDescription>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">Henüz e-posta kaydı yok.</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 font-medium">Sipariş</th>
                      <th className="pb-2 font-medium">E-posta</th>
                      <th className="pb-2 font-medium">Tür</th>
                      <th className="pb-2 font-medium">Durum</th>
                      <th className="pb-2 font-medium">Zamanlanan</th>
                      <th className="pb-2 font-medium">Gönderilen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id} className="border-b last:border-0">
                        <td className="py-2">{log.orderId}</td>
                        <td className="py-2">{log.customerEmail}</td>
                        <td className="py-2">{log.type === 'reminder' ? 'Hatırlatma' : 'İstek'}</td>
                        <td className="py-2">
                          <Badge variant={log.status === 'sent' ? 'default' : log.status === 'failed' ? 'destructive' : 'outline'}>
                            {EMAIL_STATUS_LABEL[log.status] ?? log.status}
                          </Badge>
                        </td>
                        <td className="py-2">{formatDateTR(log.scheduledAt)}</td>
                        <td className="py-2">{formatDateTR(log.sentAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {logsPagination && logsPagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 pt-4">
                  <Button size="sm" variant="outline" disabled={logsPage <= 1} onClick={() => setLogsPage((p) => Math.max(1, p - 1))}>
                    <ChevronLeft className="size-4" />
                    Önceki
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Sayfa {logsPagination.page} / {logsPagination.totalPages}
                  </span>
                  <Button size="sm" variant="outline" disabled={!logsPagination.hasMore} onClick={() => setLogsPage((p) => p + 1)}>
                    Sonraki
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
