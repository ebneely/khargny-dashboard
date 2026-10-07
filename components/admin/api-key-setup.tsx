'use client';

import { DashboardText } from '@/components/admin/dashboard-text';
import { useState } from 'react';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
        <DashboardText>Save this key now. It will not be shown again. Closing this dialog removes it from this page.</DashboardText>
      </div>
      <div className="space-y-2">
        <Label htmlFor="one-time-api-key"><DashboardText>Your API key</DashboardText></Label>
        <div className="flex gap-2">
          <Input id="one-time-api-key" value={secret} readOnly autoComplete="off" spellCheck={false} className="font-mono text-xs" />
          <Button type="button" variant="outline" onClick={() => copy(secret)} aria-label="Copy API key"><Copy className="h-4 w-4" /></Button>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="mcp-client"><DashboardText>AI client</DashboardText></Label>
        <Select value={client} onValueChange={(value) => { if (value) setClient(value as McpClient); }}>
          <SelectTrigger id="mcp-client" className="min-h-11 w-full"><SelectValue /></SelectTrigger>
          <SelectContent>{(['Claude Code', 'Codex', 'ZadLoop'] as const).map((name) => <SelectItem key={name} value={name}>{name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="mcp-entrypoint"><DashboardText>MCP entrypoint on the AI&apos;s computer</DashboardText></Label>
        <Input id="mcp-entrypoint" value={entrypoint} onChange={(event) => setEntrypoint(event.target.value)} placeholder="/absolute/path/to/mcp/src/index.mjs" spellCheck={false} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="mcp-api-url"><DashboardText>API base URL (including /v1)</DashboardText></Label>
        <Input id="mcp-api-url" value={apiUrl} onChange={(event) => setApiUrl(event.target.value)} placeholder="https://your-api-host/v1" spellCheck={false} />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="mcp-config">{client === 'Codex' ? '~/.codex/config.toml' : client === 'Claude Code' ? '.mcp.json (keep private)' : 'Stdio configuration (verify your ZadLoop version)'}</Label>
          <Button type="button" variant="outline" size="sm" disabled={!isReady} onClick={() => copy(snippet)}><DashboardText>Copy config</DashboardText></Button>
        </div>
        <textarea id="mcp-config" readOnly value={snippet} spellCheck={false} className="h-48 w-full resize-y rounded-md border border-input bg-muted p-3 font-mono text-xs" />
      </div>
      {!isReady && <p role="status" className="text-xs text-muted-foreground"><DashboardText>Enter an absolute index.mjs path and an HTTPS API base URL ending in /v1 to enable Copy config. Never put the key in either field.</DashboardText></p>}
      <p className="text-xs text-muted-foreground"><DashboardText>Requires Node 22+ and the backend repository&apos;s mcp folder on the AI&apos;s computer. Replace the path before copying. Never commit this configuration or share it in chat. ZadLoop&apos;s import format is not independently verified; use its command, args and environment fields if JSON import is unavailable.</DashboardText></p>
      <p className="text-xs text-muted-foreground"><DashboardText>For local-file uploads, add KHARGNY_UPLOAD_ROOT to the client&apos;s environment with one absolute local upload folder. Local uploads are disabled without it; URL uploads still work. See mcp/README.md for the exact field to add.</DashboardText></p>
    </div>
  );
}
