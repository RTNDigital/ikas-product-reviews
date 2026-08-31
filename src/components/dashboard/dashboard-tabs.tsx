'use client';

import { useCallback, useEffect, useState } from 'react';
import { ApiRequests } from '@/lib/api-requests';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertTriangle } from 'lucide-react';
import { ReviewsTab } from './reviews-tab';
import { EmailSettingsTab } from './email-settings-tab';
import { WidgetSettingsTab } from './widget-settings-tab';
import { ImportExportTab } from './import-export-tab';
import { AnalyticsTab } from './analytics-tab';
import type { StoreSettings, WidgetSettings } from './types';

interface DashboardTabsProps {
  token: string;
}

export function DashboardTabs({ token }: DashboardTabsProps) {
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);
  const [widgetSettings, setWidgetSettings] = useState<WidgetSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await ApiRequests.ikas.getSettings(token);
      if (res.status === 200 && res.data?.data) {
        setStoreSettings(res.data.data.storeSettings as StoreSettings);
        setWidgetSettings(res.data.data.widgetSettings as WidgetSettings);
      } else {
        setError(true);
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !storeSettings || !widgetSettings) {
    return (
      <div className="mx-auto max-w-[1200px] p-6">
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>Ayarlar yüklenemedi</AlertTitle>
          <AlertDescription>Lütfen sayfayı yenileyip tekrar deneyin.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1200px] p-6">
      <Tabs defaultValue="reviews">
        <TabsList>
          <TabsTrigger value="reviews">Yorumlar</TabsTrigger>
          <TabsTrigger value="email">E-posta Toplama</TabsTrigger>
          <TabsTrigger value="widget">Widget Ayarları</TabsTrigger>
          <TabsTrigger value="import-export">İçe/Dışa Aktar</TabsTrigger>
          <TabsTrigger value="analytics">Analiz</TabsTrigger>
        </TabsList>
        <TabsContent value="reviews" className="pt-4">
          <ReviewsTab token={token} />
        </TabsContent>
        <TabsContent value="email" className="pt-4">
          <EmailSettingsTab token={token} storeSettings={storeSettings} onSaved={setStoreSettings} />
        </TabsContent>
        <TabsContent value="widget" className="pt-4">
          <WidgetSettingsTab token={token} widgetSettings={widgetSettings} onSaved={setWidgetSettings} />
        </TabsContent>
        <TabsContent value="import-export" className="pt-4">
          <ImportExportTab />
        </TabsContent>
        <TabsContent value="analytics" className="pt-4">
          <AnalyticsTab token={token} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
