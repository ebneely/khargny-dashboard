export function storefrontSectionsRedirect(search: string, hash = ''): string | null {
  const params = new URLSearchParams(search);
  const tab = params.get('tab');
  const anchor = hash.replace(/^#/, '');
  if (tab === 'add-section' || anchor === 'add-section' || params.get('add') === 'section') return '/dashboard/ads/placements?add=section#add-section';
  if (['sections', 'homepage-sections'].includes(tab ?? '') || ['sections', 'homepage-sections'].includes(anchor)) return '/dashboard/ads/placements#homepage-sections';
  if (anchor.startsWith('section-')) return `/dashboard/ads/placements#${encodeURIComponent(anchor)}`;
  return null;
}
