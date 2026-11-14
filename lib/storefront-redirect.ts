export function storefrontSectionsRedirect(search: string, hash = ''): string | null {
  const params = new URLSearchParams(search);
  const tab = params.get('tab');
  const anchor = hash.replace(/^#/, '');
  if (tab === 'add-section' || anchor === 'add-section' || params.get('add') === 'section') return '/dashboard/places/library/collections?add=section';
  if (['sections', 'homepage-sections'].includes(tab ?? '') || ['sections', 'homepage-sections'].includes(anchor)) return '/dashboard/places/library/collections';
  if (anchor.startsWith('section-')) return '/dashboard/places/library/collections';
  return null;
}
