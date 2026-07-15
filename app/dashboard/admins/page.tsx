'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, ChevronLeft, ChevronRight, ShieldOff, ShieldCheck, Pencil, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
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
  if (r === 'editor') return 'Editor';
  if (r === 'viewer') return 'Viewer';
  return r;
}

function statusBadge(s: Admin['status']) {
  if (s === 'active') return <Badge variant="default">Active</Badge>;
  return <Badge variant="secondary">Disabled</Badge>;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function AdminsPage() {
  const router = useRouter();
  const [page, setPage] = useState(0);
  const [pendingDisable, setPendingDisable] = useState<Admin | null>(null);
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
  const hasPrev = page > 0;

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
        <h1 className="font-display text-2xl font-semibold text-foreground mb-6">Admins</h1>
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-foreground font-medium">You don&apos;t have access to this page</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Admin management is restricted to super admins.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl font-semibold text-foreground">Admins</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage who can sign in to the dashboard and what they can do.
            </p>
          </div>
          {isSuperadmin && (
            <Link href="/dashboard/admins/new">
              <Button className="gap-2" data-trace-id="admin-new-open">
                <Plus className="w-4 h-4" />
                Add admin
              </Button>
            </Link>
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
                <p className="text-muted-foreground mb-3">Failed to load admins</p>
                <Button variant="outline" onClick={() => refetch()}>Retry</Button>
              </div>
            ) : data && data.items.length > 0 ? (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last login</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.items.map((admin) => {
                      const isSelf = currentUserId === admin.id;
                      const disableButton = (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          disabled={actionInFlight?.id === admin.id}
                          onClick={() => setPendingDisable(admin)}
                          data-trace-id={`admin-row-${admin.id}-disable`}
                        >
                          <ShieldOff className="mr-1.5 h-3.5 w-3.5" />
                          Disable
                        </Button>
                      );
                      return (
                        <TableRow key={admin.id}>
                          <TableCell className="font-medium">
                            <Link
                              href={`/dashboard/admins/${admin.id}/edit`}
                              className="hover:text-primary"
                              data-trace-id={`admin-row-${admin.id}-email`}
                            >
                              {admin.email}
                              {isSelf && (
                                <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                              )}
                            </Link>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {roleLabel(admin.role)}
                          </TableCell>
                          <TableCell>{statusBadge(admin.status)}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {formatDate(admin.lastLoginAt)}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {formatDate(admin.createdAt)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="inline-flex items-center gap-1">
                              <Link href={`/dashboard/admins/${admin.id}/edit`}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  data-trace-id={`admin-row-${admin.id}-edit`}
                                >
                                  <Pencil className="mr-1.5 h-3.5 w-3.5" />
                                  Edit
                                </Button>
                              </Link>
                              {isSelf ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive"
                                  disabled
                                  title="You cannot disable your own account"
                                  data-trace-id={`admin-row-${admin.id}-disable-blocked`}
                                >
                                  <ShieldOff className="mr-1.5 h-3.5 w-3.5" />
                                  Disable
                                </Button>
                              ) : admin.status === 'active' ? (
                                disableButton
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-primary"
                                  disabled={actionInFlight?.id === admin.id}
                                  onClick={() => setPendingEnable(admin)}
                                  data-trace-id={`admin-row-${admin.id}-enable`}
                                >
                                  <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
                                  Enable
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                <div className="flex items-center justify-end gap-2 p-4 border-t border-border">
                  <Button
                    variant="outline" size="sm"
                    disabled={!hasPrev}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    data-trace-id="admin-list-prev"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground px-2">Page {page + 1}</span>
                  <Button
                    variant="outline" size="sm"
                    disabled={!hasNext}
                    onClick={() => setPage((p) => p + 1)}
                    data-trace-id="admin-list-next"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No admins yet</p>
                {isSuperadmin && (
                  <Button
                    className="mt-4 gap-2"
                    onClick={() => router.push('/dashboard/admins/new')}
                    data-trace-id="admin-list-empty-cta"
                  >
                    <Plus className="w-4 h-4" />
                    Add the first admin
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Disable confirm dialog (US-dev-ADM-003 acceptance scenario 1+2) */}
        <Dialog
          open={pendingDisable !== null}
          onOpenChange={(open) => !open && setPendingDisable(null)}
        >
          <DialogContent data-trace-id="admin-disable-confirm">
            <DialogHeader>
              <DialogTitle>Disable {pendingDisable?.email}?</DialogTitle>
              <DialogDescription>
                The admin will be marked inactive and signed out within one request.
                They won&apos;t be able to log in again until you re-enable them.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setPendingDisable(null)}
                disabled={!!actionInFlight}
                data-trace-id="admin-disable-cancel"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => pendingDisable && handleDisable(pendingDisable)}
                disabled={!!actionInFlight}
                data-trace-id="admin-disable-confirm-btn"
              >
                {actionInFlight ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Disable admin
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
              <DialogTitle>Re-enable {pendingEnable?.email}?</DialogTitle>
              <DialogDescription>
                The admin will be able to sign in again immediately.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setPendingEnable(null)}
                disabled={!!actionInFlight}
                data-trace-id="admin-enable-cancel"
              >
                Cancel
              </Button>
              <Button
                onClick={() => pendingEnable && handleEnable(pendingEnable)}
                disabled={!!actionInFlight}
                data-trace-id="admin-enable-confirm-btn"
              >
                {actionInFlight ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Re-enable
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
