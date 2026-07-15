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
  categoryId: string | null;
  categoryName: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
};

export function CategoryDeleteDialog({ categoryId, categoryName, open, onOpenChange, onDeleted }: Props) {
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) {
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

  const handleDelete = async () => {
    if (!categoryId) return;
    setSubmitting(true);
    setError(null);
    try {
      await adminApi.delete(`/v1/admin/categories/${categoryId}`);
      toast.success(`"${categoryName}" has been deleted.`);
      onOpenChange(false);
      onDeleted();
    } catch (e: unknown) {
      const err = e as { status?: number; message?: string };
      if (err.status === 400) {
        setError('Cannot delete category with associated places.');
      } else if (err.status === 404) {
        setError('This category no longer exists.');
      } else {
        setError(err.message || 'Failed to delete category.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-trace-id="category-delete-dialog">
        <DialogHeader>
          <DialogTitle>Delete {categoryName || 'this category'}?</DialogTitle>
          <DialogDescription>
            Categories with associated places cannot be deleted. Any child categories will be reassigned to the deleted category&apos;s parent.
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
