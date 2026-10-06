'use client';

import { useState } from 'react';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { API_BASE_URL } from '@/lib/config';
import { mcpConfig, validMcpConnection, type McpClient } from '@/lib/api/mcp-config';

export function ApiKeySetup({ secret }: { secret: string }) {
  const [client, setClient] = useState<McpClient>('Claude Code');
  const [entrypoint, setEntrypoint] = useState('');
  const [apiUrl, setApiUrl] = useState(API_BASE_URL ? `${API_BASE_URL.replace(/\/$/, '')}/v1` : '');
  const snippet = mcpConfig(client, entrypoint, apiUrl, secret);
  const isReady = validMcpConnection(entrypoint, apiUrl);

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied. Keep this credential private.');
    } catch {
      toast.error('Clipboard access failed. Select and copy the text manually.');
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm" role="status">
        Save this key now. It will not be shown again. Closing this dialog removes it from this page.
      </div>
      <div className="space-y-2">
        <Label htmlFor="one-time-api-key">Your API key</Label>
        <div className="flex gap-2">
          <Input id="one-time-api-key" value={secret} readOnly autoComplete="off" spellCheck={false} className="font-mono text-xs" />
          <Button type="button" variant="outline" onClick={() => copy(secret)} aria-label="Copy API key"><Copy className="h-4 w-4" /></Button>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="mcp-client">AI client</Label>
        <select id="mcp-client" value={client} onChange={(event) => setClient(event.target.value as McpClient)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
          {(['Claude Code', 'Codex', 'ZadLoop'] as const).map((name) => <option key={name}>{name}</option>)}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="mcp-entrypoint">MCP entrypoint on the AI&apos;s computer</Label>
        <Input id="mcp-entrypoint" value={entrypoint} onChange={(event) => setEntrypoint(event.target.value)} placeholder="/absolute/path/to/mcp/src/index.mjs" spellCheck={false} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="mcp-api-url">API base URL (including /v1)</Label>
        <Input id="mcp-api-url" value={apiUrl} onChange={(event) => setApiUrl(event.target.value)} placeholder="https://your-api-host/v1" spellCheck={false} />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="mcp-config">{client === 'Codex' ? '~/.codex/config.toml' : client === 'Claude Code' ? '.mcp.json (keep private)' : 'Stdio configuration (verify your ZadLoop version)'}</Label>
          <Button type="button" variant="outline" size="sm" disabled={!isReady} onClick={() => copy(snippet)}>Copy config</Button>
        </div>
        <textarea id="mcp-config" readOnly value={snippet} spellCheck={false} className="h-48 w-full resize-y rounded-md border border-input bg-muted p-3 font-mono text-xs" />
      </div>
      {!isReady && <p role="status" className="text-xs text-muted-foreground">Enter an absolute index.mjs path and an HTTPS API base URL ending in /v1 to enable Copy config. Never put the key in either field.</p>}
      <p className="text-xs text-muted-foreground">Requires Node 22+ and the backend repository&apos;s mcp folder on the AI&apos;s computer. Replace the path before copying. Never commit this configuration or share it in chat. ZadLoop&apos;s import format is not independently verified; use its command, args and environment fields if JSON import is unavailable.</p>
      <p className="text-xs text-muted-foreground">For local-file uploads, add KHARGNY_UPLOAD_ROOT to the client&apos;s environment with one absolute local upload folder. Local uploads are disabled without it; URL uploads still work. See mcp/README.md for the exact field to add.</p>
    </div>
  );
}
