import { adminApi } from './admin-client';

export type ApiKeyScope = 'read' | 'write' | 'delete';

export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  scopes: ApiKeyScope[];
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  status: 'active' | 'revoked' | 'expired';
  owner?: { id: string; email: string; role: string; status: string };
}

export function publicApiKey(row: ApiKey): ApiKey {
  const { id, name, prefix, scopes, createdAt, lastUsedAt, expiresAt, revokedAt, status, owner } = row;
  return { id, name, prefix, scopes, createdAt, lastUsedAt, expiresAt, revokedAt, status,
    ...(owner ? { owner: { id: owner.id, email: owner.email, role: owner.role, status: owner.status } } : {}),
  };
}

export interface ApiKeyList {
  data: ApiKey[];
  meta: { page: number; limit: number; total: number; has_more: boolean };
}

export function createApiKey(input: { name: string; scopes: ApiKeyScope[]; expiresAt?: string }) {
  return adminApi.post<ApiKey & { key: string }>('/v1/admin/api-keys', input);
}

export function revokeApiKey(id: string) {
  return adminApi.delete<ApiKey>(`/v1/admin/api-keys/${id}`);
}
