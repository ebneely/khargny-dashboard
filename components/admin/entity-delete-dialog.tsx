'use client';

/**
 * A confirm-then-DELETE dialog for simple catalog rows (amenities, tags).
 *
 * Deleting is irreversible and these rows are referenced by places, so it always asks first
 * and surfaces the backend's reason on failure rather than a generic "something went wrong".
 * Categories keep their own dialog because their delete has extra semantics (child
 * reassignment, soft-delete when places reference them).
 */

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
  /** e.g. "/v1/admin/amenities" — the id is appended. */
  endpoint: string;
  /** e.g. "amenity" — used in the copy. */
  entityLabel: string;
  entityId: string | null;
  entityName: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
  /** Extra sentence explaining the consequence, e.g. what happens to places using it. */
  consequence?: string;
  traceId?: string;
};

export function EntityDeleteDialog({
  endpoint,
  entityLabel,
  entityId,
  entityName,
  open,
  onOpenChange,
  onDeleted,
  consequence,
  traceId,
}: Props) {
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) {
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

  const handleDelete = async () => {
    if (!entityId) return;
    setSubmitting(true);
    setError(null);
    try {
      await adminApi.delete(`${endpoint}/${entityId}`);
      toast.success(`"${entityName}" has been deleted.`);
      onOpenChange(false);
      onDeleted();
    } catch (e: unknown) {
      const err = e as { status?: number; message?: string };
      if (err.status === 404) {
        setError(`This ${entityLabel} no longer exists.`);
      } else if (err.status === 400 || err.status === 409) {
        // The backend knows why (e.g. still referenced) — show its reason, not a guess.
        setError(err.message || `This ${entityLabel} can't be deleted right now.`);
      } else {
        setError(err.message || `Failed to delete ${entityLabel}.`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-trace-id={traceId}>
        <DialogHeader>
          <DialogTitle>Delete {entityName || `this ${entityLabel}`}?</DialogTitle>
          <DialogDescription>
            {consequence ?? `This removes the ${entityLabel} permanently.`}
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={handleDelete} disabled={submitting}>
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {submitting ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
