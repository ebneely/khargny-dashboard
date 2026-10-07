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
        setError(err.message || 'This category could not be deleted.');
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
          <DialogTitle><DashboardText>Delete</DashboardText> {categoryName || 'this category'}?</DialogTitle>
          <DialogDescription>
            <DashboardText>Any child categories are reassigned to this category&apos;s parent. If places are still assigned to it, those places are set to</DashboardText> <strong><DashboardText>draft</DashboardText></strong> <DashboardText>(hidden from the site) and the category is removed from the dashboard rather than erased from the database — places must keep pointing at a category that exists.</DashboardText>
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            <DashboardText>Cancel</DashboardText>
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
