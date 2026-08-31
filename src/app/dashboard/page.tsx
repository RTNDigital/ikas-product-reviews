'use client';

import { useCallback, useEffect, useState } from 'react';
import { TokenHelpers } from '@/helpers/token-helpers';
import { AppBridgeHelper } from '@ikas/app-helpers';
import { DashboardTabs } from '@/components/dashboard/dashboard-tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Loader2 } from 'lucide-react';

export default function DashboardPage() {
  const [token, setToken] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState(false);

  const initializeDashboard = useCallback(async () => {
    try {
      const fetchedToken = await TokenHelpers.getTokenForIframeApp();
      if (fetchedToken) {
        setToken(fetchedToken);
      } else {
        setTokenError(true);
      }
    } catch (error) {
      console.error('Error initializing dashboard:', error);
      setTokenError(true);
    }
  }, []);

  // Close the loader shown by the ikas platform when opening the iframe
  useEffect(() => {
    AppBridgeHelper.closeLoader();
  }, []);

  useEffect(() => {
    initializeDashboard();
  }, [initializeDashboard]);

  if (tokenError) {
    return (
      <div className="mx-auto max-w-[1200px] p-6">
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>Oturum başlatılamadı</AlertTitle>
          <AlertDescription>
            Uygulama yalnızca ikas yönetim paneli içinden açılabilir. Lütfen sayfayı ikas panelinden yeniden açın.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <DashboardTabs token={token} />;
}
