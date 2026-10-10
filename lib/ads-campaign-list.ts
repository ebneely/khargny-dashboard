import type { AdCampaign } from './api/ads';

export async function readCampaignList(read: (skip?: number, limit?: number) => Promise<unknown>): Promise<AdCampaign[]> {
  const rows: AdCampaign[] = [];
  let answer = await read();
  for (;;) {
    if (Array.isArray(answer)) return rows.length ? [...rows, ...answer] : answer;
    const page = answer as { data?: AdCampaign[]; meta?: { total?: number; skip?: number; limit?: number } } | null;
    if (!Array.isArray(page?.data)) throw new Error('Invalid campaigns response');
    rows.push(...page.data);
    if (rows.length >= (page.meta?.total ?? rows.length)) return rows;
    if (!page.data.length) throw new Error('Incomplete campaigns response');
    answer = await read((page.meta?.skip ?? rows.length - page.data.length) + page.data.length, page.meta?.limit ?? 100);
  }
}
