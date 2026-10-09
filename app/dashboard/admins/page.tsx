'use client';

import { PageActions } from '@/components/admin/page-actions';

import { RecordCell } from '@/components/admin/record-cell';
import { DateCell } from '@/components/admin/date-cell';
import { Pager } from '@/components/admin/pager';
import { RowActions } from '@/components/admin/row-actions';
import { DashboardText } from '@/components/admin/dashboard-text';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, ShieldOff, ShieldCheck, Pencil, AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table';
import { StatusBadge } from '@/components/admin/subscriber-ui';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useAdmins } from '@/lib/api/hooks/use-admins';
import { useCurrentSession } from '@/lib/api/hooks/use-current-session';
import { adminApi } from '@/lib/api/admin-client';
import type { Admin } from '@/lib/api/types';

const PAGE_SIZE = 20;

function roleLabel(r: Admin['role']): string {
  if (r === 'super_admin') return 'Super admin';
  if (r === 'admin') return 'Admin';
  // Accounts created before the rename still read 'editor' until migration 0012 runs.
  // Showing the raw value made those rows display a lowercase "editor" in the Role column.
  if ((r as string) === 'editor') return 'Admin';
  if (r === 'viewer') return 'Viewer';
  return r;
}

function statusBadge(s: Admin['status']) {
  return <StatusBadge status={s} />;
}

export default function AdminsPage() {
  const router = useRouter();
  const [page, setPage] = useState(0);
  const [pendingDisable, setPendingDisable] = useState<Admin | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Admin | null>(null);
  const [pendingEnable, setPendingEnable] = useState<Admin | null>(null);
  const [actionInFlight, setActionInFlight] = useState<Admin | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const skip = page * PAGE_SIZE;
  const { data, isLoading, isError, refetch } = useAdmins({ skip, limit: PAGE_SIZE });
  const { data: session } = useCurrentSession();

  const currentUserId = session?.user.id;
  const currentUserRole = session?.user.role;
  const isSuperadmin = currentUserRole === 'super_admin';

  const totalLoaded = data?.items.length ?? 0;
  const hasNext = totalLoaded === PAGE_SIZE;

  const handleDelete = async (admin: Admin) => {
    setActionInFlight(admin);
    setActionError(null);
    try {
      await adminApi.delete(`/v1/admin/admins/${admin.id}`);
      toast.success(`${admin.email} has been deleted.`);
      setPendingDelete(null);
      await refetch();
    } catch (e: unknown) {
      const err = e as { status?: number; message?: string };
      // 403 carries a real reason from the server (own account, last super admin) — show it
      // rather than a generic failure, since both are recoverable by doing something else.
      setActionError(err.message || 'Failed to delete admin.');
    } finally {
      setActionInFlight(null);
    }
  };

  const handleDisable = async (admin: Admin) => {
    setActionInFlight(admin);
    setActionError(null);
    try {
      await adminApi.post(`/v1/admin/admins/${admin.id}/disable`);
      toast.success(`${admin.email} has been disabled.`);
      setPendingDisable(null);
      await refetch();
    } catch (e: unknown) {
      const err = e as { status?: number; message?: string };
      if (err.status === 409) {
        setActionError('This admin is already disabled.');
      } else if (err.status === 404) {
        setActionError('This admin no longer exists.');
      } else {
        setActionError(err.message || 'Failed to disable admin.');
      }
    } finally {
      setActionInFlight(null);
    }
  };

  const handleEnable = async (admin: Admin) => {
    setActionInFlight(admin);
    setActionError(null);
    try {
      await adminApi.post(`/v1/admin/admins/${admin.id}/enable`);
      toast.success(`${admin.email} has been re-enabled.`);
      setPendingEnable(null);
      await refetch();
    } catch (e: unknown) {
      const err = e as { status?: number; message?: string };
      if (err.status === 409) {
        // Defensive — the list should not surface Enable on an already-active
        // admin, but a stale list (e.g. opened in two tabs) could let this
        // through. Surface a clear error rather than a silent failure.
        setActionError('This admin is already active.');
        setPendingEnable(null);
      } else if (err.status === 404) {
        setActionError('This admin no longer exists.');
        setPendingEnable(null);
      } else {
        setActionError(err.message || 'Failed to enable admin.');
      }
    } finally {
      setActionInFlight(null);
    }
  };

  // Access-denied for non-superadmin (FR-009). The backend's RolesGuard will
  // also return 403 on every admin route — UI surfaces this defensively.
  if (!isLoading && session && !isSuperadmin) {
    return (
      <div>
        <h1 className="font-display text-2xl font-semibold text-foreground mb-6"><DashboardText>Admins</DashboardText></h1>
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-foreground font-medium"><DashboardText>You don&apos;t have access to this page</DashboardText></p>
            <p className="mt-1 text-sm text-muted-foreground">
              <DashboardText>Admin management is restricted to super admins.</DashboardText>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-semibold text-foreground"><DashboardText>Admins</DashboardText></h1>
            <p className="mt-1 text-sm text-muted-foreground">
              <DashboardText>Manage who can sign in to the dashboard and what they can do.</DashboardText>
            </p>
          </div>
          {isSuperadmin && (
            <PageActions actions={[{ label: 'Add admin', href: '/dashboard/admins/new', icon: <Plus className="size-4" aria-hidden="true" />, traceId: 'admin-new-open' }]} />
          )}
        </div>

        {actionError && (
          <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {actionError}
          </div>
        )}

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-3 p-6">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-10 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : isError ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-3"><DashboardText>Failed to load admins</DashboardText></p>
                <Button variant="outline" onClick={() => refetch()}><DashboardText>Retry</DashboardText></Button>
              </div>
            ) : data && data.items.length > 0 ? (
              <>
                <Table layout="list">
                  <TableHeader>
                    <TableRow>
                      <TableHead><DashboardText>Email</DashboardText></TableHead>
                      <TableHead><DashboardText>Role</DashboardText></TableHead>
                      <TableHead column="status"><DashboardText>Status</DashboardText></TableHead>
                      <TableHead><DashboardText>Last login</DashboardText></TableHead>
                      <TableHead><DashboardText>Created</DashboardText></TableHead>
                      <TableHead className="text-end" column="actions"><DashboardText>Actions</DashboardText></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.items.map((admin) => {
                      const isSelf = currentUserId === admin.id;
                      return (
                        <TableRow key={admin.id}>
                          <TableCell className="font-medium">
                            <Link
                              href={`/dashboard/admins/${admin.id}/edit`}
                              className="hover:text-primary"
                              data-trace-id={`admin-row-${admin.id}-email`}
                            >
                              <RecordCell name={admin.email} chips={isSelf && <span className="text-sm text-muted-foreground"><DashboardText>(you)</DashboardText></span>} />
                            </Link>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {roleLabel(admin.role)}
                          </TableCell>
                          <TableCell column="status">{statusBadge(admin.status)}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            <DateCell value={admin.lastLoginAt} />
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            <DateCell value={admin.createdAt} />
                          </TableCell>
                          <TableCell className="text-end" column="actions">
                            <RowActions recordName={admin.email} actions={[
                              { label: 'Edit', icon: <Pencil aria-hidden="true" />, href: `/dashboard/admins/${admin.id}/edit`, traceId: `admin-row-${admin.id}-edit` },
                              { label: isSelf || admin.status === 'active' ? 'Disable' : 'Enable', icon: isSelf || admin.status === 'active' ? <ShieldOff aria-hidden="true" /> : <ShieldCheck aria-hidden="true" />, disabled: isSelf || actionInFlight?.id === admin.id, destructive: isSelf || admin.status === 'active', title: isSelf ? 'You cannot disable your own account' : undefined, onClick: () => admin.status === 'active' ? setPendingDisable(admin) : setPendingEnable(admin), traceId: `admin-row-${admin.id}-${isSelf ? 'disable-blocked' : admin.status === 'active' ? 'disable' : 'enable'}` },
                              { label: 'Delete', icon: <Trash2 aria-hidden="true" />, destructive: true, disabled: isSelf || actionInFlight?.id === admin.id, title: isSelf ? 'You cannot delete your own account' : undefined, onClick: () => setPendingDelete(admin), traceId: `admin-row-${admin.id}-delete` },
                            ]} />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                <Pager skip={skip} pageSize={PAGE_SIZE} total={undefined} count={totalLoaded} onPrevious={() => setPage((current) => Math.max(0, current - 1))} onNext={() => setPage((current) => current + 1)} nextDisabled={!hasNext} />
              </>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground"><DashboardText>No admins yet</DashboardText></p>
                {isSuperadmin && (
                  <Button
                    variant="outline" className="mt-4 gap-2"
                    onClick={() => router.push('/dashboard/admins/new')}
                    data-trace-id="admin-list-empty-cta"
                  >
                    <Plus className="w-4 h-4" />
                    <DashboardText>Add the first admin</DashboardText>
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog
          open={pendingDelete !== null}
          onOpenChange={(open) => !open && setPendingDelete(null)}
        >
          <DialogContent data-trace-id="admin-delete-confirm">
            <DialogHeader>
              <DialogTitle><DashboardText>Delete</DashboardText> {pendingDelete?.email}?</DialogTitle>
              <DialogDescription>
                <DashboardText>The account is removed from this list, its sessions end immediately and its email becomes available again. What they did stays in the audit log. This cannot be undone — use Disable instead if you may want them back.</DashboardText>
              </DialogDescription>
            </DialogHeader>
            {actionError && (
              <p className="text-sm text-destructive" role="alert">{actionError}</p>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setPendingDelete(null)}
                disabled={!!actionInFlight}
                data-trace-id="admin-delete-cancel"
              >
                <DashboardText>Cancel</DashboardText>
              </Button>
              <Button
                variant="destructive"
                onClick={() => pendingDelete && handleDelete(pendingDelete)}
                disabled={!!actionInFlight}
                data-trace-id="admin-delete-confirm-btn"
              >
                {actionInFlight ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                <DashboardText>Delete admin</DashboardText>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Disable confirm dialog (US-dev-ADM-003 acceptance scenario 1+2) */}
        <Dialog
          open={pendingDisable !== null}
          onOpenChange={(open) => !open && setPendingDisable(null)}
        >
          <DialogContent data-trace-id="admin-disable-confirm">
            <DialogHeader>
              <DialogTitle><DashboardText>Disable</DashboardText> {pendingDisable?.email}?</DialogTitle>
              <DialogDescription>
                <DashboardText>The admin will be marked inactive and signed out within one request. They won&apos;t be able to log in again until you re-enable them.</DashboardText>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setPendingDisable(null)}
                disabled={!!actionInFlight}
                data-trace-id="admin-disable-cancel"
              >
                <DashboardText>Cancel</DashboardText>
              </Button>
              <Button
                variant="destructive"
                onClick={() => pendingDisable && handleDisable(pendingDisable)}
                disabled={!!actionInFlight}
                data-trace-id="admin-disable-confirm-btn"
              >
                {actionInFlight ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                <DashboardText>Disable admin</DashboardText>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Enable confirm dialog (non-destructive but explicit — US-dev-ADM-003 acceptance 4) */}
        <Dialog
          open={pendingEnable !== null}
          onOpenChange={(open) => !open && setPendingEnable(null)}
        >
          <DialogContent data-trace-id="admin-enable-confirm">
            <DialogHeader>
              <DialogTitle><DashboardText>Re-enable</DashboardText> {pendingEnable?.email}?</DialogTitle>
              <DialogDescription>
                <DashboardText>The admin will be able to sign in again immediately.</DashboardText>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setPendingEnable(null)}
                disabled={!!actionInFlight}
                data-trace-id="admin-enable-cancel"
              >
                <DashboardText>Cancel</DashboardText>
              </Button>
              <Button
                onClick={() => pendingEnable && handleEnable(pendingEnable)}
                disabled={!!actionInFlight}
                data-trace-id="admin-enable-confirm-btn"
              >
                {actionInFlight ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                <DashboardText>Re-enable</DashboardText>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
