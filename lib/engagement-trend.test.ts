import { describe, expect, it } from 'vitest';
import { changeAgainstPrevious, trendShape } from './engagement-trend';

describe('change against the previous period', () => {
  it('should report a rise and a fall as signed percentages', () => {
    expect(changeAgainstPrevious(120, 100)).toBeCloseTo(20);
    expect(changeAgainstPrevious(80, 100)).toBeCloseTo(-20);
  });
  it('should report no change as zero, not as unknown', () => {
    expect(changeAgainstPrevious(50, 50)).toBe(0);
  });
  it('should be unknown when the earlier period counted nothing', () => {
    expect(changeAgainstPrevious(40, 0)).toBeNull();
    expect(changeAgainstPrevious(0, 0)).toBeNull();
  });
});

describe('the shape of a daily series', () => {
  it('should place known days across the range and keep the highest value', () => {
    const shape = trendShape(
      [{ date: '2026-11-01', value: 4 }, { date: '2026-11-03', value: 9 }],
      '2026-11-01',
      '2026-11-05',
    );
    expect(shape.days).toBe(5);
    expect(shape.max).toBe(9);
    expect(shape.knownDays).toBe(2);
    expect(shape.segments).toHaveLength(2);
    expect(shape.segments[0][0]).toEqual({ x: 0, value: 4 });
    expect(shape.segments[1][0]).toEqual({ x: 0.5, value: 9 });
  });

  it('should break the drawing where a day has no stored count instead of asserting zero', () => {
    const shape = trendShape(
      [
        { date: '2026-11-01', value: 3 },
        { date: '2026-11-02', value: 5 },
        { date: '2026-11-04', value: 7 },
      ],
      '2026-11-01',
      '2026-11-04',
    );
    expect(shape.segments.map((segment) => segment.length)).toEqual([2, 1]);
  });

  it('should ignore days outside the range and keep a single day centred', () => {
    const shape = trendShape(
      [
        { date: '2026-10-31', value: 99 },
        { date: '2026-11-02', value: 6 },
      ],
      '2026-11-02',
      '2026-11-02',
    );
    expect(shape.days).toBe(1);
    expect(shape.segments).toEqual([[{ x: 0.5, value: 6 }]]);
  });

  it('should never divide by zero when every counted day is zero', () => {
    const shape = trendShape([{ date: '2026-11-02', value: 0 }], '2026-11-02', '2026-11-02');
    expect(shape.max).toBe(1);
  });
});
