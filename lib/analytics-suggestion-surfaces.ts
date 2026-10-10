import type { SurfaceResponse } from './api/ads-round-b';

export async function suggestionSurfaces(readPage: (page: number) => Promise<SurfaceResponse>) {
  const first = await readPage(1);
  if (!first.meta) return first;
  const data = [...first.data];
  const pages = Math.ceil(first.meta.total / first.meta.limit);
  for (let page = 2; page <= pages; page += 1) {
    const next = await readPage(page);
    if (!next.data.length) throw new Error('surface-catalogue-incomplete');
    data.push(...next.data);
  }
  if (data.length < first.meta.total) throw new Error('surface-catalogue-incomplete');
  return { ...first, data };
}
