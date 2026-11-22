/** Decision 0009: every metric as All, People, New or Returning, with Repeat x, and the hype rank words. Pure rules. */

export type PeopleMode = 'all' | 'people' | 'new' | 'returning';
export const PEOPLE_MODES: PeopleMode[] = ['all', 'people', 'new', 'returning'];

/** What the server prepared for one metric: different people, and how many of them were new in the window. */
export interface PeopleCell { people: number; newPeople: number }
export interface PeopleNumbers { all: number; people: number; new: number; returning: number; repeat: number | null }

/** Repeat x to one decimal: 32,987 actions by 9,410 people is 3.5. */
export function repeatTimes(all: number, people: number): number | null {
  return people > 0 ? Math.round((all / people) * 10) / 10 : null;
}

/** The four ways to show one count. People never outnumber actions; new + returning is always the people. */
export function peopleNumbers(all: number, cell?: PeopleCell | null): PeopleNumbers {
  const people = Math.min(cell?.people ?? 0, all);
  const fresh = Math.min(cell?.newPeople ?? 0, people);
  return { all, people, new: fresh, returning: people - fresh, repeat: repeatTimes(all, people) };
}

/** The number a column shows in a mode; null when the server has nothing prepared for it (groups, Live). */
export function pickMode(all: number, cell: PeopleCell | null | undefined, mode: PeopleMode): number | null {
  if (mode === 'all') return all;
  if (!cell) return null;
  return peopleNumbers(all, cell)[mode];
}

export interface HypeRankInfo {
  rank: number;
  total: number;
  topPercent: number;
  /** Places gained (+) or lost (-) against a week ago; null when it had no hype then. */
  moved: number | null;
  areaRank?: { rank: number; total: number } | null;
  categoryRank?: { rank: number; total: number } | null;
}

const group = (n: number) => n.toLocaleString('en-US');

/** "#12 of 1,240 · top 1%" in Western digits, in both languages. */
export function rankText(r: Pick<HypeRankInfo, 'rank' | 'total' | 'topPercent'>, of: string, top: string): string {
  return `#${group(r.rank)} ${of} ${group(r.total)} · ${top} ${r.topPercent}%`;
}

/** The week's movement as an arrow and a number: "▲ 4", "▼ 2", or "" when it did not move or is new. */
export function moveText(moved: number | null): string {
  if (!moved) return '';
  return `${moved > 0 ? '▲' : '▼'} ${group(Math.abs(moved))}`;
}

/** Under a site total: "410 people · 62% new · 3.0× each". Empty when nothing is prepared or nobody did it. */
export function peopleLine(all: number, cell: PeopleCell | null | undefined, words: { people: string; fresh: string; each: string }): string {
  const n = peopleNumbers(all, cell);
  if (!n.people || n.repeat === null) return '';
  // The isolate marks keep "3.0×" in this order inside an Arabic sentence.
  return `${group(n.people)} ${words.people} · ${Math.round((n.new / n.people) * 100)}% ${words.fresh} · ⁦${n.repeat.toFixed(1)}×⁩ ${words.each}`;
}
