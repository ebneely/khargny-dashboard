export type McpClient = 'Claude Code' | 'Codex' | 'ZadLoop';

export function validMcpConnection(entrypoint: string, apiUrl: string) {
  if (!/^(?:[a-zA-Z]:[\\/]|\/|\\\\)/.test(entrypoint) || !entrypoint.endsWith('index.mjs') || entrypoint.includes('khg_live_')) return false;
  try {
    const url = new URL(apiUrl);
    const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    return (url.protocol === 'https:' || (url.protocol === 'http:' && loopback)) && !url.username && !url.password && !url.search && !url.hash && !url.href.includes('khg_live_') && url.pathname.replace(/\/$/, '').endsWith('/v1');
  } catch {
    return false;
  }
}

export function mcpConfig(client: McpClient, entrypoint: string, apiUrl: string, key: string) {
  const env = { KHARGNY_API_URL: apiUrl, KHARGNY_API_KEY: key };
  if (client === 'Codex') {
    return `[mcp_servers.khargny]\ncommand = "node"\nargs = [${JSON.stringify(entrypoint)}]\n\n[mcp_servers.khargny.env]\nKHARGNY_API_URL = ${JSON.stringify(apiUrl)}\nKHARGNY_API_KEY = ${JSON.stringify(key)}`;
  }
  return JSON.stringify({ mcpServers: { khargny: { command: 'node', args: [entrypoint], env } } }, null, 2);
}
