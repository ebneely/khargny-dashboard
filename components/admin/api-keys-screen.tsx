'use client';

import { PageActions } from './page-actions';
import { StatusBadge } from './subscriber-ui';
import { RecordCell } from '@/components/admin/record-cell';
import { DateCell } from './date-cell';
import { RecordList } from './record-list';
import { DashboardText, useDashboardCopy } from '@/components/admin/dashboard-text';
import { useOptionalDashboardLang } from '@/lib/dashboard-lang';
import { useState } from 'react';
import Link from 'next/link';
import { KeyRound, Plus, RefreshCw, ShieldOff } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useApiKeys } from '@/lib/api/hooks/use-api-keys';
import { useCurrentSession } from '@/lib/api/hooks/use-current-session';
import { revokeApiKey, type ApiKey } from '@/lib/api/api-keys';
import { CreateApiKeyDialog } from './create-api-key-dialog';

export function ApiKeysScreen() {
  const controlCopy = useDashboardCopy();
  const lang = useOptionalDashboardLang()?.lang ?? 'en';
  const [creating, setCreating] = useState(false);
  const [revoking, setRevoking] = useState<ApiKey | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);
  const keys = useApiKeys(1, true);
  const session = useCurrentSession();
  const role = session.data?.user.role ?? '';
  const canCreate = !session.isLoading && !session.isError && ['viewer', 'admin', 'super_admin'].includes(role);

  async function revoke() {
    if (!revoking || isRevoking) return;
    setIsRevoking(true);
    try {
      await revokeApiKey(revoking.id);
      setRevoking(null);
      toast.success('Key revoked. It can no longer access Khargny.');
      await keys.refetch();
    } catch {
      toast.error('Could not revoke this key. Check your session and retry.');
    } finally {
      setIsRevoking(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/dashboard/settings" className="text-sm text-muted-foreground hover:text-foreground"><DashboardText>← Settings</DashboardText></Link>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-semibold"><DashboardText>API keys</DashboardText></h1>
            <p className="mt-2 text-sm text-muted-foreground"><DashboardText>Connect AI assistants without sharing your admin password.</DashboardText></p>
          </div>
          <PageActions actions={[{ label: 'Create key', onClick: () => setCreating(true), allowed: canCreate, viewerAllowed: true, traceId: 'api-keys-create', icon: <Plus className="size-4" aria-hidden="true" /> }]} />
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5" />{role === 'super_admin' ? "All admins' keys" : 'Your keys'}</CardTitle>
          <CardDescription>{role === 'super_admin' ? "You can list and revoke any admin's keys. New keys always belong to you." : 'Only your own keys appear here.'} <DashboardText>Permissions remain capped by each owner&apos;s current role; disabling an owner disables their keys.</DashboardText></CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {session.isError && <p role="alert" className="text-sm text-destructive"><DashboardText>Could not verify your role.</DashboardText> <Button variant="link" size="sm" onClick={() => session.refetch()}><DashboardText>Retry session</DashboardText></Button></p>}
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="text-muted-foreground">{keys.data ? `${keys.data.meta.total} key${keys.data.meta.total === 1 ? '' : 's'}` : 'Your access credentials'}</span>
            <Button variant="outline" size="sm" onClick={() => keys.refetch()} disabled={keys.isLoading}><RefreshCw className="h-4 w-4" /><DashboardText>Refresh</DashboardText></Button>
          </div>
          {keys.isLoading ? (
            <div className="space-y-3" aria-busy="true" aria-label={controlCopy("Loading API keys")}>{[1, 2, 3].map((row) => <div key={row} className="h-12 animate-pulse rounded bg-muted" />)}</div>
          ) : keys.isError ? (
            <p role="alert" className="text-sm text-destructive"><DashboardText>Could not load keys. Check your session and use Refresh to retry.</DashboardText></p>
          ) : !keys.data?.data.length ? (
            <div className="rounded-md border border-dashed p-8 text-center" role="status"><p className="font-medium"><DashboardText>No keys on this page</DashboardText></p><p className="mt-2 text-sm text-muted-foreground"><DashboardText>Create a named key for each AI assistant so you can revoke access independently.</DashboardText></p></div>
          ) : (
            <RecordList scope="api-keys" records={keys.data.data} searchText={(key) => [key.name, key.prefix, key.owner?.email].join(' ')} filters={[{ key: 'status', label: 'Any status', options: [{ value: 'active', label: 'Active' }, { value: 'expired', label: 'Expired' }, { value: 'revoked', label: 'Revoked' }], value: (key) => key.status }]} render={(visible) => <Table layout="list">
              <TableHeader><TableRow><TableHead><DashboardText>Name / prefix</DashboardText></TableHead><TableHead><DashboardText>Permissions</DashboardText></TableHead><TableHead><DashboardText>Created</DashboardText></TableHead><TableHead><DashboardText>Last used</DashboardText></TableHead><TableHead><DashboardText>Expires</DashboardText></TableHead><TableHead column="status"><DashboardText>Status</DashboardText></TableHead><TableHead className="text-right" column="actions"><DashboardText>Action</DashboardText></TableHead></TableRow></TableHeader>
              <TableBody>
                {visible.map((key) => (
                  <TableRow key={key.id}>
                    <TableCell><RecordCell icon="key" name={key.name} /><code className="hidden text-xs text-muted-foreground sm:inline">{key.prefix}…</code>{role === 'super_admin' && key.owner && <p className="hidden max-w-48 truncate text-xs text-muted-foreground sm:block" title={key.owner.email}><DashboardText>Owner:</DashboardText> {key.owner.email}</p>}</TableCell>
                    <TableCell><div className="flex gap-1">{key.scopes.map((scope) => <Badge key={scope} variant="outline">{scope === 'write' ? 'edit' : scope}</Badge>)}</div></TableCell>
                    <TableCell className="whitespace-nowrap text-xs"><DateCell value={key.createdAt} /></TableCell>
                    <TableCell className="whitespace-nowrap text-xs">{key.lastUsedAt ? <DateCell value={key.lastUsedAt} /> : <DashboardText>Never</DashboardText>}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs">{key.expiresAt ? <DateCell value={key.expiresAt} /> : <DashboardText>No expiry</DashboardText>}</TableCell>
                    <TableCell column="status"><StatusBadge status={key.status} /></TableCell>
                    <TableCell className="text-right" column="actions"><Button variant="ghost" size="icon-sm" className="hover:text-destructive focus-visible:text-destructive" onClick={() => setRevoking(key)} disabled={key.status === 'revoked' || !canCreate} aria-label={`${lang === 'ar' ? 'إلغاء مفتاح' : 'Revoke'} ${key.name}`} title={key.status === 'revoked' ? (lang === 'ar' ? 'تم إلغاء هذا المفتاح' : 'This key is already revoked') : !canCreate ? (lang === 'ar' ? 'لا يمكنك إدارة المفاتيح في هذه الجلسة' : 'You cannot manage keys in this session') : undefined}><ShieldOff className="size-4" aria-hidden="true" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>} />
          )}
          <p className="text-sm text-muted-foreground"><DashboardText>Revoked keys stay visible.</DashboardText></p>
        </CardContent>
      </Card>
      {creating && <CreateApiKeyDialog role={role} onClose={() => { setCreating(false); void keys.refetch(); }} onCreated={() => { void keys.refetch(); }} />}
      <Dialog open={revoking !== null} onOpenChange={(open) => { if (!open && !isRevoking) setRevoking(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle><DashboardText>Revoke API key?</DashboardText></DialogTitle><DialogDescription>{revoking?.name} <DashboardText>will immediately lose access.</DashboardText> {role === 'super_admin' && revoking?.owner && <><DashboardText>Owner:</DashboardText> {revoking.owner.email}. </>}<DashboardText>The credential cannot be reactivated; its owner can create a replacement.</DashboardText></DialogDescription></DialogHeader>
          <DialogFooter><Button variant="outline" onClick={() => setRevoking(null)} disabled={isRevoking}><DashboardText>Cancel</DashboardText></Button><Button variant="destructive" onClick={revoke} disabled={isRevoking}>{isRevoking ? 'Revoking…' : 'Revoke key'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
