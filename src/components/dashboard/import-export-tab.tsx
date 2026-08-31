'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UploadCloud, Download } from 'lucide-react';

/**
 * Import/Export tab — P2 feature. Displays a skeleton UI while the CSV
 * import/export backend work is scheduled for a later milestone.
 */
export function ImportExportTab() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Yorumları İçe Aktar</CardTitle>
            <CardDescription>CSV dosyanızdan toplu olarak yorum içe aktarın.</CardDescription>
          </div>
          <Badge variant="secondary">Yakında</Badge>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed py-12 text-center text-muted-foreground">
            <UploadCloud className="size-8" />
            <p className="text-sm">CSV dosyanızı buraya sürükleyin veya seçmek için tıklayın</p>
            <p className="text-xs">Alan eşleştirme (müşteri adı, ürün, puan, yorum metni vb.) burada yapılacak</p>
            <Button variant="outline" disabled>
              Dosya Seç
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Yorumları Dışa Aktar</CardTitle>
            <CardDescription>Tüm yorumlarınızı CSV formatında indirin.</CardDescription>
          </div>
          <Badge variant="secondary">Yakında</Badge>
        </CardHeader>
        <CardContent>
          <Button variant="outline" disabled>
            <Download className="size-4" />
            CSV Olarak Dışa Aktar
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
