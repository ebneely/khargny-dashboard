import { describe, expect, it } from 'vitest';
import { moveText, peopleLine, peopleNumbers, pickMode, rankText, repeatTimes } from './people';

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

describe('hype rank words', () => {
  it('should write rank and top percent in Western digits', () => {
    expect(rankText({ rank: 12, total: 1240, topPercent: 1 }, 'of', 'top')).toBe('#12 of 1,240 · top 1%');
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
