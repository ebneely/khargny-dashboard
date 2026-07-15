/**
 * Slug auto-generation helper (T004, F8).
 * Generates a kebab-case slug from an Arabic (or English) display name.
 * ASCII transliteration of common Arabic characters; falls back to
 * stripping diacritics + collapsing non-alphanumerics.
 *
 * Edge cases:
 * - Empty input → ''
 * - Pure Arabic without Latin letters → returns '' (the caller can fall
 *   back to deriving from nameEn per Clarifications Q9, Q10)
 * - Collapses consecutive '-' and trims leading/trailing '-'
 */

const ARABIC_TO_LATIN: Record<string, string> = {
  'ا': 'a', 'أ': 'a', 'إ': 'i', 'آ': 'a',
  'ب': 'b', 'ت': 't', 'ث': 'th', 'ج': 'j',
  'ح': 'h', 'خ': 'kh', 'د': 'd', 'ذ': 'dh',
  'ر': 'r', 'ز': 'z', 'س': 's', 'ش': 'sh',
  'ص': 's', 'ض': 'd', 'ط': 't', 'ظ': 'z',
  'ع': 'a', 'غ': 'gh', 'ف': 'f', 'ق': 'q',
  'ك': 'k', 'ل': 'l', 'م': 'm', 'ن': 'n',
  'ه': 'h', 'و': 'w', 'ي': 'y', 'ى': 'a',
  'ة': 'h', 'ء': '', 'ؤ': 'o', 'ئ': 'e',
  ' ': '-', 'ـ': '-',
};

export function autoSlug(primary: string, fallback?: string): string {
  const source = (primary || '').trim() || (fallback || '').trim();
  if (!source) return '';

  const transliterated = source
    .split('')
    .map((ch) => ARABIC_TO_LATIN[ch] ?? ch)
    .join('');

  return transliterated
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}
