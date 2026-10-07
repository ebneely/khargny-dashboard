'use client';

import { DashboardText } from '@/components/admin/dashboard-text';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { createApiKey, type ApiKeyScope } from '@/lib/api/api-keys';
import { ApiKeySetup } from './api-key-setup';

export function CreateApiKeyDialog({ role, onClose, onCreated }: { role: string; onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState<ApiKeyScope[]>(['read']);
  const [expires, setExpires] = useState('');
  const [secret, setSecret] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const active = useRef(true);
  const canEdit = role === 'admin' || role === 'super_admin';
  const canCreate = canEdit || role === 'viewer';

  useEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);

  function close() {
    active.current = false;
    setSecret(null);
    onClose();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving || !canCreate) return;
    const allowed = scopes.filter((scope) => canEdit || scope === 'read');
    const expiry = expires ? new Date(expires) : null;
    if (!name.trim() || !allowed.length || (expiry && (!Number.isFinite(expiry.getTime()) || expiry.getTime() <= Date.now()))) {
      setError('Enter a name, select a permission, and choose a future expiry if needed.');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const result = await createApiKey({ name: name.trim(), scopes: allowed, ...(expiry ? { expiresAt: expiry.toISOString() } : {}) });
      if (!active.current) return;
      setSecret(result.key);
      onCreated();
    } catch {
      if (active.current) setError('Could not create a key. Check your session and try again.');
    } finally {
      if (active.current) setIsSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) close(); }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{secret ? 'Save your new key' : 'Create an API key'}</DialogTitle>
          <DialogDescription><DashboardText>Give an AI assistant access within your own admin role. Keys cannot manage accounts, log in or create other keys.</DashboardText></DialogDescription>
        </DialogHeader>
        {secret ? (
          <>
            <ApiKeySetup secret={secret} />
            <DialogFooter><Button type="button" onClick={close}><DashboardText>I have saved it · Close</DashboardText></Button></DialogFooter>
          </>
        ) : (
          <form onSubmit={submit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="api-key-name"><DashboardText>Name</DashboardText></Label>
              <Input id="api-key-name" value={name} onChange={(event) => setName(event.target.value)} required maxLength={100} placeholder="Claude on my laptop" autoComplete="off" disabled={isSaving} />
            </div>
            <fieldset className="space-y-3" disabled={isSaving}>
              <legend className="mb-2 text-sm font-medium"><DashboardText>Permissions</DashboardText></legend>
              {([{ scope: 'read', label: 'Read content' }, { scope: 'write', label: 'Create and edit content' }, { scope: 'delete', label: 'Delete content and media' }] as const).map(({ scope, label }) => (
                <div key={scope} className="flex items-center gap-3">
                  <Checkbox id={`scope-${scope}`} checked={scopes.includes(scope)} disabled={!canCreate || (!canEdit && scope !== 'read')} onCheckedChange={(checked) => setScopes((current) => checked ? [...current.filter((value) => value !== scope), scope] : current.filter((value) => value !== scope))} aria-describedby={!canEdit && scope !== 'read' ? 'viewer-key-reason' : undefined} />
                  <Label htmlFor={`scope-${scope}`}>{label}</Label>
                </div>
              ))}
              {!canEdit && <p id="viewer-key-reason" className="text-xs text-muted-foreground"><DashboardText>Viewers can create read-only keys. Editing and deleting require an admin role.</DashboardText></p>}
            </fieldset>
            <div className="space-y-2">
              <Label htmlFor="api-key-expiry"><DashboardText>Expiry (optional, your local time)</DashboardText></Label>
              <Input id="api-key-expiry" type="datetime-local" value={expires} onChange={(event) => setExpires(event.target.value)} disabled={isSaving} />
            </div>
            <p className="text-sm text-muted-foreground"><DashboardText>Deletion can permanently remove media files. Give delete permission only when necessary. Closing while creation is in progress can leave a key you must revoke and recreate.</DashboardText></p>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={close}><DashboardText>Cancel</DashboardText></Button>
              <Button type="submit" disabled={isSaving || !canCreate || !name.trim() || !scopes.length}>{isSaving ? 'Creating…' : 'Create key'}</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
