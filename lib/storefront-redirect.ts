export function storefrontSectionsRedirect(search: string, hash = ''): string | null {
  const params = new URLSearchParams(search);
  const tab = params.get('tab');
  const anchor = hash.replace(/^#/, '');
  if (tab === 'add-section' || anchor === 'add-section' || params.get('add') === 'section') return '/dashboard/collections?add=section';
  if (['sections', 'homepage-sections'].includes(tab ?? '') || ['sections', 'homepage-sections'].includes(anchor)) return '/dashboard/collections';
  if (anchor.startsWith('section-')) return '/dashboard/collections';
  return null;
}
