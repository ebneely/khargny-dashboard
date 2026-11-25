import { describe, expect, it } from 'vitest';
import { MOOD_ACCENTS, MOOD_ICONS, accentOf, moodIconName, nextWeight } from './mood-tokens';

/** The backend seed's icons and accent tokens; the pickers must render every one of them. */
const SEED_ICONS = ['coffee', 'heart', 'users', 'party-popper', 'laptop', 'utensils', 'compass', 'cake-slice'];
const SEED_ACCENTS = ['sky', 'rose', 'amber', 'violet', 'slate', 'orange', 'emerald', 'gold'];

describe('moods', () => {
  it('should cycle a chip through off, 1, 2, 3 and back to off', () => {
    expect(nextWeight(0)).toBe(1);
    expect(nextWeight(1)).toBe(2);
    expect(nextWeight(2)).toBe(3);
    expect(nextWeight(3)).toBe(0);
    // A value outside the levels (never sent by the server) starts over at off.
    expect(nextWeight(9)).toBe(0);
  });

  it('should offer every icon the seed uses', () => {
    for (const icon of SEED_ICONS)
      expect(MOOD_ICONS.map((entry) => entry.value)).toContain(icon);
  });

  it('should offer every accent token the seed uses', () => {
    for (const accent of SEED_ACCENTS)
      expect(MOOD_ACCENTS.map((entry) => entry.value)).toContain(accent);
  });

  it('should draw an unknown icon and accent as the safe fallbacks, never break', () => {
    expect(moodIconName('not-a-lucide-name')).toBe('sparkles');
    expect(moodIconName('coffee')).toBe('coffee');
    expect(accentOf('not-a-token').value).toBe('accent');
    expect(accentOf('rose').value).toBe('rose');
  });
});
