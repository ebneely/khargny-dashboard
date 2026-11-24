import { autoSlug } from './utils/slug';

export type SlugFormDraft = { slug?: string };

export type SlugFormInput = {
  /** The form's edit overlay; `slug` is present only once the admin has hand-edited it. */
  draft: SlugFormDraft;
  /** The slug the loaded record carries. */
  loadedSlug: string;
  /** True once the admin has edited either name field. */
  nameEdited: boolean;
  name: string;
  nameEn?: string;
};

/**
 * The slug an edit form shows: the hand-edited value while the edit overlay holds one, else
 * the value generated from a name the admin edited, else the slug the record was loaded with.
 * A saved slug therefore comes back as the loaded slug — never as the generated one — and a
 * fetched record's slug is never clobbered on hydration.
 */
export function slugForForm({ draft, loadedSlug, nameEdited, name, nameEn }: SlugFormInput): string {
  return draft.slug ?? (nameEdited ? autoSlug(name, nameEn) : loadedSlug);
}
