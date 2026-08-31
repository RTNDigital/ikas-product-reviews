'use client';

import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, Send } from 'lucide-react';
import { ApiRequests } from '@/lib/api-requests';

interface ReviewReplyFormProps {
  token: string;
  reviewId: string;
  existingReply: string | null;
  onReplied: (reply: string) => void;
}

export function ReviewReplyForm({ token, reviewId, existingReply, onReplied }: ReviewReplyFormProps) {
  const [reply, setReply] = useState(existingReply ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!reply.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await ApiRequests.ikas.replyToReview(token, { reviewId, reply: reply.trim() });
      if (res.status === 200) {
        onReplied(reply.trim());
      } else {
        setError('Yanıt kaydedilemedi.');
      }
    } catch {
      setError('Yanıt kaydedilirken bir hata oluştu.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-2 rounded-md border bg-muted/30 p-3">
      <p className="text-xs font-medium text-muted-foreground">
        {existingReply ? 'Mağaza yanıtını düzenle' : 'Bu yoruma yanıt ver'}
      </p>
      <Textarea
        value={reply}
        onChange={(e) => setReply(e.target.value)}
        placeholder="Müşteriye yanıtınızı yazın..."
        className="min-h-20 bg-background"
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex justify-end">
        <Button size="sm" onClick={handleSubmit} disabled={saving || !reply.trim()}>
          {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
          Yanıtla
        </Button>
      </div>
    </div>
  );
}
