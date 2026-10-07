export function subscriberReturnPath(): string | null {
  const returnTo = new URLSearchParams(window.location.search).get('subscriberReturn');
  if (!returnTo) return null;
  const [pathname, query] = returnTo.split('?');
  if (!/^\/dashboard\/subscribers\/(new|[a-f0-9-]{36})$/.test(pathname)) return null;
  const token = new URLSearchParams(query).get('placeReturn');
  if (token && !/^[a-f0-9-]{36}$/.test(token)) return null;
  const params = new URLSearchParams();
  if (token) params.set('placeReturn', token);
  if (!pathname.endsWith('/new')) params.set('tab', 'places');
  return params.size ? `${pathname}?${params}` : pathname;
}

export function subscriberPlaceReturn(placeId: string, incomplete = false): string | null {
  const returnTo = subscriberReturnPath();
  if (!returnTo) return null;
  const [pathname, query] = returnTo.split('?');
  const params = new URLSearchParams(query);
  params.set('linkedPlace', placeId);
  if (incomplete) params.set('placeSetupIncomplete', '1');
  return `${pathname}?${params}`;
}
