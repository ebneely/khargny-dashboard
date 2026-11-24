import { describe, expect, it } from 'vitest';
import { slugForForm } from './form-slug';

// The edit-city form keeps its edit overlay after a successful save and only falls back to
// the loaded city for fields the admin did not touch. These cases pin the slug rule the page
// relies on: a hand-edited slug is what a save sends, and a second save sends it again.
const city = { loadedSlug: 'my-custom-city', name: 'Nasr City', nameEn: 'Nasr City' };

type Draft = { slug?: string; name?: string; nameEn?: string };

const shown = (
  draft: Draft,
  over: Partial<{ loadedSlug: string; name: string; nameEn: string; nameEdited: boolean }> = {},
) =>
  slugForForm({
    draft,
    loadedSlug: city.loadedSlug,
    name: draft.name ?? city.name,
    nameEn: draft.nameEn ?? city.nameEn,
    nameEdited: false,
    ...over,
  });

describe('edit form slug', () => {
  it('should show the loaded slug before anything is edited', () => {
    expect(shown({})).toBe('my-custom-city');
  });

  it('should regenerate from the name once the admin edits the name', () => {
    expect(shown({ name: 'Heliopolis' }, { nameEdited: true })).toBe('heliopolis');
  });

  it('should keep regenerating for later name edits until the slug is hand-edited', () => {
    expect(shown({ name: 'Heliopolis' }, { nameEdited: true })).toBe('heliopolis');
    expect(shown({ name: 'Heliopolis', slug: 'masr-el-gedida' }, { nameEdited: true })).toBe('masr-el-gedida');
  });

  it('should keep a hand-edited slug after a save instead of replacing it with the generated one', () => {
    const draft: Draft = { name: 'Heliopolis', slug: 'zamalek-flats' };
    // Before the refetch lands the loaded slug is still the old one...
    expect(shown(draft, { nameEdited: true })).toBe('zamalek-flats');
    // ...and after it lands it is the slug that was saved.
    expect(shown(draft, { nameEdited: true, loadedSlug: 'zamalek-flats' })).toBe('zamalek-flats');
  });

  it('should still show the saved slug after a name-only save, so saving twice sends the same value', () => {
    const draft: Draft = { name: 'Heliopolis' };
    const firstSave = shown(draft, { nameEdited: true });
    expect(firstSave).toBe('heliopolis');
    expect(shown(draft, { nameEdited: true, loadedSlug: firstSave })).toBe(firstSave);
  });

  it('should show an emptied slug box as emptied, so the required field is caught on submit', () => {
    expect(shown({ name: 'Heliopolis', slug: '' }, { nameEdited: true })).toBe('');
  });
});
