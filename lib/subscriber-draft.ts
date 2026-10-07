export function consumeSubscriberDraft<T>(storage: Pick<Storage, 'getItem' | 'removeItem'>, key: string, token: string | null): T | null {
  const stored = storage.getItem(key);
  storage.removeItem(key);
  if (!stored || !token) return null;
  const envelope = JSON.parse(stored) as { token?: string; draft?: T };
  return envelope.token === token ? envelope.draft ?? null : null;
}

export function sameSubscriberPlaces(first: { id: string }[], second: { id: string }[]): boolean {
  const firstIds = new Set(first.map((place) => place.id));
  const secondIds = new Set(second.map((place) => place.id));
  return firstIds.size === secondIds.size && [...firstIds].every((id) => secondIds.has(id));
}
