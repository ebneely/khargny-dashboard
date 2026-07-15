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
  cityId: string | null;
  cityName: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRestored: () => void;
};

export function CityRestoreDialog({ cityId, cityName, open, onOpenChange, onRestored }: Props) {
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) {
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

  const handleRestore = async () => {
    if (!cityId) return;
    setSubmitting(true);
    setError(null);
    try {
      await adminApi.post(`/v1/admin/cities/${cityId}/restore`);
      toast.success(`"${cityName}" has been restored.`);
      onOpenChange(false);
      onRestored();
    } catch (e: unknown) {
      const err = e as { status?: number; message?: string };
      if (err.status === 403) {
        setError('Only super admins can restore cities.');
      } else if (err.status === 409) {
        setError('This city is not soft-deleted.');
      } else {
        setError(err.message || 'Failed to restore city.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-trace-id="city-restore-dialog">
        <DialogHeader>
          <DialogTitle>Restore {cityName || 'this city'}?</DialogTitle>
          <DialogDescription>
            The city will be restored to its prior status and reappear on the public list.
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button type="button" onClick={handleRestore} disabled={submitting}>
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {submitting ? 'Restoring…' : 'Restore'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
