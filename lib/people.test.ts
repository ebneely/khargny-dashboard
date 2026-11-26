import { describe, expect, it } from 'vitest';
import { moveText, peopleLine, peopleNumbers, peopleWindowOf, pickMode, rankCount, rankText, repeatTimes } from './people';

describe('people numbers', () => {
  it('should split people into new and returning with the repeat', () => {
    expect(peopleNumbers(32987, { people: 9410, newPeople: 6120 })).toEqual({ all: 32987, people: 9410, new: 6120, returning: 3290, repeat: 3.5 });
  });
  it('should keep new plus returning equal to people', () => {
    for (const [p, n] of [[10, 0], [10, 10], [10, 4], [1, 1]]) {
      const r = peopleNumbers(99, { people: p, newPeople: n });
      expect(r.new + r.returning).toBe(r.people);
    }
  });
  it('should never show more people than actions', () => {
    expect(peopleNumbers(3, { people: 9, newPeople: 20 })).toMatchObject({ people: 3, new: 3, returning: 0 });
  });
  it.each([[1204, 1150, 1.0], [860, 610, 1.4], [4300, 2050, 2.1], [32987, 9410, 3.5]])('should give repeat %i / %i = %d', (a, p, w) => {
    expect(repeatTimes(a, p)).toBe(w);
  });
  it('should have no repeat when nobody did it', () => expect(repeatTimes(5, 0)).toBeNull());
});

describe('pickMode', () => {
  const cell = { people: 40, newPeople: 10 };
  it('should show all without people data', () => expect(pickMode(100, undefined, 'all')).toBe(100));
  it('should be empty in a people mode without people data', () => expect(pickMode(100, undefined, 'people')).toBeNull());
  it.each([['people', 40], ['new', 10], ['returning', 30]] as const)('should show %s', (mode, want) => expect(pickMode(100, cell, mode)).toBe(want));
});

describe('the people window of a page window', () => {
  it.each([['24h', '24h'], ['7d', '7d'], ['30d', '30d'], ['all', 'all']] as const)('should %s has people in %s', (page, want) => expect(peopleWindowOf(page)).toBe(want));
  it('should none for live, a custom range or nothing chosen', () => {
    expect(peopleWindowOf('live')).toBeNull();
    expect(peopleWindowOf('custom')).toBeNull();
    expect(peopleWindowOf(undefined)).toBeNull();
  });
});

describe('hype rank words', () => {
  it('should write rank and top percent in Western digits', () => {
    expect(rankText({ rank: 12, total: 1240, topPercent: 1 }, 'of', 'top')).toBe('#12 of 1,240 · top 1%');
  });
  it('should write the rank alone, for a column that wraps the top percent to its own line', () => {
    expect(rankCount({ rank: 12, total: 1240 }, 'of')).toBe('#12 of 1,240');
    expect(rankCount({ rank: 1, total: 1 }, 'من')).toBe('#1 من 1');
  });
  it('should write the week movement', () => {
    expect(moveText(4)).toBe('▲ 4');
    expect(moveText(-2)).toBe('▼ 2');
    expect(moveText(0)).toBe('');
    expect(moveText(null)).toBe('');
  });
});

describe('people line under a site total', () => {
  const words = { people: 'people', fresh: 'new', each: 'each' };
  const plain = (s: string) => s.replace(/[⁦⁩]/g, '');
  it('should say the people, the share that is new and the repeat', () => {
    expect(plain(peopleLine(1240, { people: 410, newPeople: 254 }, words))).toBe('410 people · 62% new · 3.0× each');
    expect(plain(peopleLine(32987, { people: 9410, newPeople: 6120 }, words))).toBe('9,410 people · 65% new · 3.5× each');
  });
  it('should be empty when nothing is prepared or nobody did it', () => {
    expect(peopleLine(1240, null, words)).toBe('');
    expect(peopleLine(0, { people: 0, newPeople: 0 }, words)).toBe('');
  });
});
