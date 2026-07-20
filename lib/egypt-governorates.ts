/**
 * Egypt's 27 governorates (المحافظات) — the official administrative divisions.
 *
 * A city's "region" was a free-text input, so the same governorate could be saved as
 * "Cairo", "cairo", "القاهرة" or a typo, and nothing could group or filter by it. This is
 * the fixed list; the value stored is the English name.
 *
 * Grouped by the standard economic regions so the picker is scannable rather than a flat
 * list of 27. The count has been stable since 2011 (Luxor was added in 2009; Helwan and
 * 6th of October were dissolved back into Cairo and Giza in 2011).
 */

export type EgyptRegionGroup =
  | 'greater-cairo'
  | 'alexandria-north-coast'
  | 'delta'
  | 'canal-sinai'
  | 'upper-egypt'
  | 'red-sea-desert';

export interface Governorate {
  /** Stored value — English name. */
  value: string;
  /** Arabic name, shown alongside so an Arabic-first editor can find it. */
  nameAr: string;
  group: EgyptRegionGroup;
  /** Extra search terms: capital city, common alternate spellings. */
  keywords?: string[];
}

export const EGYPT_REGION_GROUP_LABELS: Record<EgyptRegionGroup, string> = {
  'greater-cairo': 'Greater Cairo — القاهرة الكبرى',
  'alexandria-north-coast': 'Alexandria & North Coast — الإسكندرية والساحل',
  delta: 'Nile Delta — الدلتا',
  'canal-sinai': 'Suez Canal & Sinai — القناة وسيناء',
  'upper-egypt': 'Upper Egypt — الصعيد',
  'red-sea-desert': 'Red Sea & Deserts — البحر الأحمر والصحاري',
};

export const EGYPT_GOVERNORATES: Governorate[] = [
  // ── Greater Cairo ────────────────────────────────────────────────────────────────────
  { value: 'Cairo', nameAr: 'القاهرة', group: 'greater-cairo', keywords: ['masr', 'capital', 'new cairo'] },
  { value: 'Giza', nameAr: 'الجيزة', group: 'greater-cairo', keywords: ['pyramids', 'haram', '6th of october', 'sheikh zayed'] },
  { value: 'Qalyubia', nameAr: 'القليوبية', group: 'greater-cairo', keywords: ['banha', 'shubra el kheima', 'qaliubiya'] },

  // ── Alexandria & North Coast ─────────────────────────────────────────────────────────
  { value: 'Alexandria', nameAr: 'الإسكندرية', group: 'alexandria-north-coast', keywords: ['iskandariya', 'north coast'] },
  { value: 'Matrouh', nameAr: 'مطروح', group: 'alexandria-north-coast', keywords: ['marsa matrouh', 'sidi abdel rahman', 'siwa', 'north coast', 'sahel'] },
  { value: 'Beheira', nameAr: 'البحيرة', group: 'alexandria-north-coast', keywords: ['damanhur', 'buhayrah'] },

  // ── Nile Delta ───────────────────────────────────────────────────────────────────────
  { value: 'Dakahlia', nameAr: 'الدقهلية', group: 'delta', keywords: ['mansoura', 'daqahliyah'] },
  { value: 'Gharbia', nameAr: 'الغربية', group: 'delta', keywords: ['tanta', 'mahalla', 'gharbiya'] },
  { value: 'Monufia', nameAr: 'المنوفية', group: 'delta', keywords: ['shibin el kom', 'menofia'] },
  { value: 'Sharqia', nameAr: 'الشرقية', group: 'delta', keywords: ['zagazig', 'sharkia'] },
  { value: 'Kafr El Sheikh', nameAr: 'كفر الشيخ', group: 'delta', keywords: ['baltim'] },
  { value: 'Damietta', nameAr: 'دمياط', group: 'delta', keywords: ['dumyat', 'ras el bar'] },

  // ── Suez Canal & Sinai ───────────────────────────────────────────────────────────────
  { value: 'Port Said', nameAr: 'بورسعيد', group: 'canal-sinai', keywords: ['bor said'] },
  { value: 'Ismailia', nameAr: 'الإسماعيلية', group: 'canal-sinai', keywords: ['ismailiya'] },
  { value: 'Suez', nameAr: 'السويس', group: 'canal-sinai', keywords: ['ain sokhna'] },
  { value: 'North Sinai', nameAr: 'شمال سيناء', group: 'canal-sinai', keywords: ['arish'] },
  { value: 'South Sinai', nameAr: 'جنوب سيناء', group: 'canal-sinai', keywords: ['sharm el sheikh', 'dahab', 'nuweiba', 'taba', 'saint catherine'] },

  // ── Upper Egypt ──────────────────────────────────────────────────────────────────────
  { value: 'Fayoum', nameAr: 'الفيوم', group: 'upper-egypt', keywords: ['tunis village', 'wadi el rayan', 'faiyum'] },
  { value: 'Beni Suef', nameAr: 'بني سويف', group: 'upper-egypt', keywords: [] },
  { value: 'Minya', nameAr: 'المنيا', group: 'upper-egypt', keywords: ['menia', 'tuna el gebel'] },
  { value: 'Assiut', nameAr: 'أسيوط', group: 'upper-egypt', keywords: ['asyut'] },
  { value: 'Sohag', nameAr: 'سوهاج', group: 'upper-egypt', keywords: ['suhag', 'akhmim'] },
  { value: 'Qena', nameAr: 'قنا', group: 'upper-egypt', keywords: ['dendera'] },
  { value: 'Luxor', nameAr: 'الأقصر', group: 'upper-egypt', keywords: ['uqsur', 'karnak', 'valley of the kings'] },
  { value: 'Aswan', nameAr: 'أسوان', group: 'upper-egypt', keywords: ['abu simbel', 'nubia'] },

  // ── Red Sea & Deserts ────────────────────────────────────────────────────────────────
  { value: 'Red Sea', nameAr: 'البحر الأحمر', group: 'red-sea-desert', keywords: ['hurghada', 'el gouna', 'marsa alam', 'safaga', 'soma bay'] },
  { value: 'New Valley', nameAr: 'الوادي الجديد', group: 'red-sea-desert', keywords: ['kharga', 'dakhla', 'farafra', 'wadi gedid'] },
];

export const GOVERNORATE_VALUES = EGYPT_GOVERNORATES.map((g) => g.value);

export function findGovernorate(value: string | null | undefined) {
  if (!value) return undefined;
  const needle = value.trim().toLowerCase();
  return EGYPT_GOVERNORATES.find(
    (g) => g.value.toLowerCase() === needle || g.nameAr === value.trim(),
  );
}
