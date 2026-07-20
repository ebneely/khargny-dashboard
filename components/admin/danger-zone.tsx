'use client';

/**
 * DangerZone — the content reset ("nuke") control.
 *
 * This permanently destroys every place, city, category, amenity, tag and uploaded file.
 * There is no undo and no backup taken. The interaction is deliberately slow:
 *
 *   1. the button opens a dialog, it never fires directly
 *   2. the dialog first runs a DRY RUN and shows exactly what would be destroyed
 *   3. the confirmation phrase must be typed by hand — no checkbox, no pre-filled value
 *
 * Rendered only for super_admin (the page checks the session server-side) and enforced
 * again by the backend's RolesGuard, which is the actual authority.
 */

import * as React from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { adminApi, AdminApiError } from '@/lib/api/admin-client';

const CONFIRM_PHRASE = 'DELETE ALL CONTENT';

interface ResetResult {
  dryRun: boolean;
  rows: Record<string, number>;
  totalRows: number;
  storageObjects: number;
  preserved: string[];
}

export function DangerZone() {
  const [open, setOpen] = React.useState(false);
  const [phrase, setPhrase] = React.useState('');
  const [preview, setPreview] = React.useState<ResetResult | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const reset = () => {
    setPhrase('');
    setPreview(null);
    setError(null);
    setLoading(false);
  };

  // Opening the dialog immediately asks the server what a reset WOULD destroy, so the
  // decision is made against real numbers rather than an abstract warning.
  const openDialog = async () => {
    setOpen(true);
    reset();
    setLoading(true);
    try {
      const result = await adminApi.post<ResetResult>(
        '/v1/admin/maintenance/reset-content',
        { confirm: CONFIRM_PHRASE, dryRun: true },
      );
      setPreview(result);
    } catch (e) {
      const err = e as AdminApiError;
      setError(err.message || 'Could not read the current content counts.');
    } finally {
      setLoading(false);
    }
  };

  const runReset = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await adminApi.post<ResetResult>(
        '/v1/admin/maintenance/reset-content',
        { confirm: CONFIRM_PHRASE },
      );
      toast.success(
        `Deleted ${result.totalRows} rows and ${result.storageObjects} files. Admin accounts kept.`,
      );
      setOpen(false);
      reset();
      // Everything cached client-side now refers to deleted rows.
      window.location.reload();
    } catch (e) {
      const err = e as AdminApiError;
      setError(err.message || 'The reset failed. Nothing may have been deleted.');
      setLoading(false);
    }
  };

  const nonEmpty = preview
    ? Object.entries(preview.rows).filter(([, n]) => n > 0)
    : [];

  return (
    <div
      className="rounded-lg border border-destructive/40 bg-destructive/5 p-5"
      data-trace-id="settings-danger-zone"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
        <div className="min-w-0 flex-1">
          <h3 className="font-medium text-foreground">Reset all content</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Permanently deletes every place, city, category, amenity, tag and uploaded photo
            or video — a clean slate. Admin accounts, sign-ins and the audit log are kept.
            This cannot be undone and no backup is taken.
          </p>
          <Button
            type="button"
            variant="destructive"
            className="mt-4"
            onClick={openDialog}
            data-trace-id="settings-reset-content-open"
          >
            Reset all content…
          </Button>
        </div>
      </div>

      <Dialog
        open={open}
        onOpenChange={(o) => {
          if (!loading) {
            setOpen(o);
            if (!o) reset();
          }
        }}
      >
        <DialogContent data-trace-id="reset-content-dialog">
          <DialogHeader>
            <DialogTitle>Delete all content?</DialogTitle>
            <DialogDescription>
              This is irreversible. Everything listed below is destroyed, including the files
              in storage.
            </DialogDescription>
          </DialogHeader>

          {loading && !preview ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Checking what would be deleted…
            </p>
          ) : preview ? (
            <div className="space-y-3 text-sm">
              {nonEmpty.length === 0 && preview.storageObjects === 0 ? (
                <p className="text-muted-foreground">
                  There is no content to delete — everything is already empty.
                </p>
              ) : (
                <>
                  <ul className="max-h-40 space-y-1 overflow-y-auto rounded-md border bg-background p-3">
                    {nonEmpty.map(([table, count]) => (
                      <li key={table} className="flex justify-between gap-4">
                        <span className="text-muted-foreground">{table}</span>
                        <span className="font-medium tabular-nums">{count}</span>
                      </li>
                    ))}
                    <li className="flex justify-between gap-4 border-t pt-1">
                      <span className="text-muted-foreground">files in storage</span>
                      <span className="font-medium tabular-nums">
                        {preview.storageObjects}
                      </span>
                    </li>
                  </ul>
                  <p className="text-xs text-muted-foreground">
                    Kept: {preview.preserved.join(', ')}.
                  </p>
                </>
              )}
            </div>
          ) : null}

          <div className="space-y-2">
            <label htmlFor="reset-confirm" className="text-sm font-medium">
              Type <code className="rounded bg-muted px-1">{CONFIRM_PHRASE}</code> to confirm
            </label>
            <Input
              id="reset-confirm"
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              placeholder={CONFIRM_PHRASE}
              autoComplete="off"
              data-trace-id="reset-content-confirm-input"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={runReset}
              disabled={loading || phrase !== CONFIRM_PHRASE}
              data-trace-id="reset-content-confirm"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? 'Deleting…' : 'Delete everything'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
