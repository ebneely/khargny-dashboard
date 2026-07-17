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
  onDeleted: () => void;
};

export function PlaceDeleteDialog({ placeId, placeName, open, onOpenChange, onDeleted }: Props) {
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) {
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

  const handleDelete = async () => {
    if (!placeId) return;
    setSubmitting(true);
    setError(null);
    try {
      await adminApi.delete(`/v1/admin/places/${placeId}`);
      toast.success(`"${placeName}" has been deleted.`);
      onOpenChange(false);
      onDeleted();
    } catch (e: unknown) {
      const err = e as { message?: string };
      setError(err.message || 'Failed to delete place.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-trace-id="place-delete-dialog">
        <DialogHeader>
          <DialogTitle>Delete {placeName || 'this place'}?</DialogTitle>
          <DialogDescription>
            This place will be hidden from the public list. You can restore it later from the Deleted filter.
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={handleDelete} disabled={submitting} data-trace-id="place-delete-confirm">
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {submitting ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
