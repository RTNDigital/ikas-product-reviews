'use client';

import { useCallback, useEffect, useState } from 'react';
import { ApiRequests } from '@/lib/api-requests';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2, MessageSquare, Star, Reply, ImageIcon, Mail } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import type { AnalyticsData } from './types';

interface AnalyticsTabProps {
  token: string;
}

const TR_SHORT_MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

function formatDateTR(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getDate()} ${TR_SHORT_MONTHS[d.getMonth()]}`;
}

export function AnalyticsTab({ token }: AnalyticsTabProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState('30');

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ApiRequests.ikas.getAnalytics(token, { days: parseInt(days, 10) });
      const body = res.data as unknown as { data: AnalyticsData };
      if (res.status === 200 && body?.data) {
        setData(body.data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [token, days]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return <div className="py-8 text-center text-muted-foreground">Analiz verileri yüklenemedi.</div>;
  }

  const { summary, daily, distribution, topProducts } = data;
  const distributionData = ['5', '4', '3', '2', '1'].map((rating) => ({
    rating: `${rating} Yıldız`,
    count: distribution[rating] ?? 0,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Label htmlFor="dateRange">Tarih Aralığı</Label>
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger id="dateRange" className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Son 7 Gün</SelectItem>
            <SelectItem value="30">Son 30 Gün</SelectItem>
            <SelectItem value="90">Son 90 Gün</SelectItem>
            <SelectItem value="3650">Tümü</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Toplam Yorum</CardTitle>
            <MessageSquare className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{summary.totalReviews.toLocaleString('tr-TR')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ortalama Puan</CardTitle>
            <Star className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{summary.averageRating.toFixed(1)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Yanıt Oranı</CardTitle>
            <Reply className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">%{summary.responseRate}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Fotoğraflı Yorum</CardTitle>
            <ImageIcon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">%{summary.photoReviewPercent}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">E-posta Dönüşümü</CardTitle>
            <Mail className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">%{summary.emailConversionRate}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Yorum Trendi</CardTitle>
        </CardHeader>
        <CardContent>
          {daily.length === 0 ? (
            <div className="flex h-[300px] items-center justify-center text-muted-foreground">Henüz veri yok</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={daily}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={formatDateTR} fontSize={12} />
                <YAxis fontSize={12} allowDecimals={false} />
                <Tooltip
                  labelFormatter={(label) => formatDateTR(String(label))}
                  formatter={(value) => [Number(value).toLocaleString('tr-TR'), 'Yorum']}
                />
                <Line type="monotone" dataKey="count" stroke="#6f55ff" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Puan Dağılımı</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={distributionData} layout="vertical" margin={{ left: 16 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" fontSize={12} allowDecimals={false} />
              <YAxis type="category" dataKey="rating" fontSize={12} width={70} />
              <Tooltip formatter={(value) => [Number(value).toLocaleString('tr-TR'), 'Yorum']} />
              <Bar dataKey="count" fill="#FFB800" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>En İyi Ürünler</CardTitle>
        </CardHeader>
        <CardContent>
          {topProducts.length === 0 ? (
            <div className="py-6 text-center text-muted-foreground">Henüz veri yok</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 font-medium">Ürün</th>
                    <th className="pb-2 text-right font-medium">Yorum Sayısı</th>
                    <th className="pb-2 text-right font-medium">Ortalama Puan</th>
                  </tr>
                </thead>
                <tbody>
                  {topProducts.map((product) => (
                    <tr key={product.productId} className="border-b last:border-0">
                      <td className="py-2">{product.productName}</td>
                      <td className="py-2 text-right">{product.reviewCount.toLocaleString('tr-TR')}</td>
                      <td className="py-2 text-right">{product.averageRating.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
