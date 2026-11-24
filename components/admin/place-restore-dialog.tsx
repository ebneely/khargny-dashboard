'use client';

import { DashboardText } from '@/components/admin/dashboard-text';
import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { adminApi } from '@/lib/api/admin-client';

type Props = {
  placeId: string | null;
  placeName: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRestored: () => void;
};

export function PlaceRestoreDialog({ placeId, placeName, open, onOpenChange, onRestored }: Props) {
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Clear the last attempt as the dialog closes, so it opens clean next time.
  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setError(null);
      setSubmitting(false);
    }
    onOpenChange(next);
  };

  const handleRestore = async () => {
    if (!placeId) return;
    setSubmitting(true);
    setError(null);
    try {
      await adminApi.post(`/v1/admin/places/${placeId}/restore`, {});
      toast.success(`"${placeName}" has been restored (as a draft).`);
      handleOpenChange(false);
      onRestored();
    } catch (e: unknown) {
      const err = e as { message?: string };
      setError(err.message || 'Failed to restore place.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent data-trace-id="place-restore-dialog">
        <DialogHeader>
          <DialogTitle><DashboardText>Restore</DashboardText> {placeName || 'this place'}?</DialogTitle>
          <DialogDescription>
            <DashboardText>The place returns as a draft — it stays hidden from the public list until you publish it again.</DashboardText>
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={submitting}>
            <DashboardText>Cancel</DashboardText>
          </Button>
          <Button type="button" onClick={handleRestore} disabled={submitting} data-trace-id="place-restore-confirm">
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {submitting ? 'Restoring…' : 'Restore'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
