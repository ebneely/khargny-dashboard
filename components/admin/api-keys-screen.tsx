'use client';

import { useState } from 'react';
import Link from 'next/link';
import { KeyRound, Plus, RefreshCw } from 'lucide-react';
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

function date(value: string | null, fallback: string) {
  return value ? new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : fallback;
}

export function ApiKeysScreen() {
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [revoking, setRevoking] = useState<ApiKey | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);
  const keys = useApiKeys(page);
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
        <Link href="/dashboard/settings" className="text-sm text-muted-foreground hover:text-foreground">← Settings</Link>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-semibold">API keys</h1>
            <p className="mt-2 text-sm text-muted-foreground">Connect AI assistants without sharing your admin password.</p>
          </div>
          <Button onClick={() => setCreating(true)} disabled={!canCreate} data-trace-id="api-keys-create"><Plus className="h-4 w-4" />Create key</Button>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5" />{role === 'super_admin' ? "All admins' keys" : 'Your keys'}</CardTitle>
          <CardDescription>{role === 'super_admin' ? "You can list and revoke any admin's keys. New keys always belong to you." : 'Only your own keys appear here.'} Permissions remain capped by each owner&apos;s current role; disabling an owner disables their keys.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {session.isError && <p role="alert" className="text-sm text-destructive">Could not verify your role. <Button variant="link" size="sm" onClick={() => session.refetch()}>Retry session</Button></p>}
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="text-muted-foreground">{keys.data ? `${keys.data.meta.total} key${keys.data.meta.total === 1 ? '' : 's'}` : 'Your access credentials'}</span>
            <Button variant="outline" size="sm" onClick={() => keys.refetch()} disabled={keys.isLoading}><RefreshCw className="h-4 w-4" />Refresh</Button>
          </div>
          {keys.isLoading ? (
            <div className="space-y-3" aria-busy="true" aria-label="Loading API keys">{[1, 2, 3].map((row) => <div key={row} className="h-12 animate-pulse rounded bg-muted" />)}</div>
          ) : keys.isError ? (
            <p role="alert" className="text-sm text-destructive">Could not load keys. Check your session and use Refresh to retry.</p>
          ) : !keys.data?.data.length ? (
            <div className="rounded-md border border-dashed p-8 text-center" role="status"><p className="font-medium">No keys on this page</p><p className="mt-2 text-sm text-muted-foreground">Create a named key for each AI assistant so you can revoke access independently.</p></div>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Name / prefix</TableHead><TableHead>Permissions</TableHead><TableHead>Created</TableHead><TableHead>Last used</TableHead><TableHead>Expires</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
              <TableBody>
                {keys.data.data.map((key) => (
                  <TableRow key={key.id}>
                    <TableCell><p className="max-w-48 truncate font-medium" title={key.name}>{key.name}</p><code className="text-xs text-muted-foreground">{key.prefix}…</code>{role === 'super_admin' && key.owner && <p className="max-w-48 truncate text-xs text-muted-foreground" title={key.owner.email}>Owner: {key.owner.email}</p>}</TableCell>
                    <TableCell><div className="flex gap-1">{key.scopes.map((scope) => <Badge key={scope} variant="outline">{scope === 'write' ? 'edit' : scope}</Badge>)}</div></TableCell>
                    <TableCell className="whitespace-nowrap text-xs">{date(key.createdAt, '—')}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs">{date(key.lastUsedAt, 'Never')}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs">{date(key.expiresAt, 'No expiry')}</TableCell>
                    <TableCell><Badge variant={key.status === 'active' ? 'secondary' : 'outline'}>{key.status}</Badge></TableCell>
                    <TableCell className="text-right"><Button variant="outline" size="sm" onClick={() => setRevoking(key)} disabled={key.status === 'revoked' || !canCreate} aria-label={`Revoke ${key.name}`}>Revoke</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <div className="flex items-center justify-between gap-3 border-t pt-4">
            <p className="text-xs text-muted-foreground">Page {page} · 25 per page. Revoked keys stay visible.</p>
            <div className="flex gap-2"><Button variant="outline" size="sm" disabled={page === 1 || keys.isLoading} onClick={() => setPage((value) => value - 1)}>Previous</Button><Button variant="outline" size="sm" disabled={!keys.data?.meta.has_more || keys.isLoading || keys.isError} onClick={() => setPage((value) => value + 1)}>Next</Button></div>
          </div>
        </CardContent>
      </Card>
      {creating && <CreateApiKeyDialog role={role} onClose={() => { setCreating(false); void keys.refetch(); }} onCreated={() => { void keys.refetch(); }} />}
      <Dialog open={revoking !== null} onOpenChange={(open) => { if (!open && !isRevoking) setRevoking(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Revoke API key?</DialogTitle><DialogDescription>{revoking?.name} will immediately lose access. {role === 'super_admin' && revoking?.owner && <>Owner: {revoking.owner.email}. </>}The credential cannot be reactivated; its owner can create a replacement.</DialogDescription></DialogHeader>
          <DialogFooter><Button variant="outline" onClick={() => setRevoking(null)} disabled={isRevoking}>Cancel</Button><Button variant="destructive" onClick={revoke} disabled={isRevoking}>{isRevoking ? 'Revoking…' : 'Revoke key'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
