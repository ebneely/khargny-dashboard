export interface HomeSection {
  id: string;
  key: string;
  titleAr: string;
  titleEn: string | null;
  kind: 'featured' | 'top_rated' | 'recommended' | 'custom';
  sortOrder: number;
  enabled: boolean;
}

export interface HomePin {
  id: string;
  name: string;
  nameEn: string | null;
  slug?: string;
  cityId?: string;
}

export function sectionOrder(sections: HomeSection[], source: string, target: string): HomeSection[] {
  const reordered = [...sections];
  const sourceIndex = reordered.findIndex((section) => section.id === source);
  const targetIndex = reordered.findIndex((section) => section.id === target);
  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return sections;
  const [section] = reordered.splice(sourceIndex, 1);
  reordered.splice(targetIndex, 0, section);
  return reordered.map((entry, index) => ({ ...entry, sortOrder: index }));
}
