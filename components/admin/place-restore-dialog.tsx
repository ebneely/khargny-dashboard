'use client';

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

  React.useEffect(() => {
    if (!open) {
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

  const handleRestore = async () => {
    if (!placeId) return;
    setSubmitting(true);
    setError(null);
    try {
      await adminApi.post(`/v1/admin/places/${placeId}/restore`, {});
      toast.success(`"${placeName}" has been restored (as a draft).`);
      onOpenChange(false);
      onRestored();
    } catch (e: unknown) {
      const err = e as { message?: string };
      setError(err.message || 'Failed to restore place.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-trace-id="place-restore-dialog">
        <DialogHeader>
          <DialogTitle>Restore {placeName || 'this place'}?</DialogTitle>
          <DialogDescription>
            The place returns as a draft — it stays hidden from the public list until you publish it again.
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
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
