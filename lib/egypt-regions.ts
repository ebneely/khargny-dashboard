/**
 * Egyptian REGIONS — the districts/areas INSIDE a city (Nasr City is a region of Cairo,
 * Smouha of Alexandria, Naama Bay of Sharm El Sheikh).
 *
 * This is the level a visitor actually thinks in: nobody looks for "a cafe in Cairo", they
 * look for "a cafe in Zamalek". The previous version of this file listed the 27
 * governorates, which is one level too high up — Cairo is the city, not the region.
 *
 * Coverage is deliberately deepest where the product is: Greater Cairo, Alexandria, and the
 * Red Sea / South Sinai resort towns. Governorate capitals and notable towns elsewhere are
 * included so no part of Egypt is unreachable.
 *
 * Sourced from the administrative district lists for Cairo and Giza governorates plus the
 * commonly-used area names for each resort city; see the session notes for the references.
 * `city` groups the picker, `governorate` disambiguates same-named areas.
 */

export interface EgyptRegion {
  /** Stored value — English name of the district/area. */
  value: string;
  /** Arabic name, so an Arabic-first editor can find it. */
  nameAr: string;
  /** The city this area belongs to — the picker groups by this. */
  city: string;
  governorate: string;
  /** Extra search terms: alternate spellings, landmarks. */
  keywords?: string[];
}

export const EGYPT_REGIONS: EgyptRegion[] = [
  // ══ CAIRO ═════════════════════════════════════════════════════════════════════════════
  { value: 'Downtown', nameAr: 'وسط البلد', city: 'Cairo', governorate: 'Cairo', keywords: ['wust el balad', 'tahrir', 'city centre'] },
  { value: 'Zamalek', nameAr: 'الزمالك', city: 'Cairo', governorate: 'Cairo', keywords: ['gezira', 'island'] },
  { value: 'Garden City', nameAr: 'جاردن سيتي', city: 'Cairo', governorate: 'Cairo' },
  { value: 'Maadi', nameAr: 'المعادي', city: 'Cairo', governorate: 'Cairo', keywords: ['degla', 'old maadi'] },
  { value: 'New Maadi', nameAr: 'المعادي الجديدة', city: 'Cairo', governorate: 'Cairo' },
  { value: 'Zahraa El Maadi', nameAr: 'زهراء المعادي', city: 'Cairo', governorate: 'Cairo' },
  { value: 'Nasr City', nameAr: 'مدينة نصر', city: 'Cairo', governorate: 'Cairo', keywords: ['madinet nasr', 'abbas el akkad', 'makram ebeid'] },
  { value: 'Heliopolis', nameAr: 'مصر الجديدة', city: 'Cairo', governorate: 'Cairo', keywords: ['masr el gedida', 'korba', 'roxy', 'baron'] },
  { value: 'Almaza', nameAr: 'ألماظة', city: 'Cairo', governorate: 'Cairo' },
  { value: 'Sheraton Heliopolis', nameAr: 'شيراتون المطار', city: 'Cairo', governorate: 'Cairo', keywords: ['sheraton', 'airport'] },
  { value: 'Ard El Golf', nameAr: 'أرض الجولف', city: 'Cairo', governorate: 'Cairo' },
  { value: 'Nozha', nameAr: 'النزهة', city: 'Cairo', governorate: 'Cairo' },
  { value: 'New Cairo', nameAr: 'القاهرة الجديدة', city: 'Cairo', governorate: 'Cairo' },
  { value: 'Fifth Settlement', nameAr: 'التجمع الخامس', city: 'Cairo', governorate: 'Cairo', keywords: ['tagamoa khames', 'tagamo3', 'katameya heights'] },
  { value: 'First Settlement', nameAr: 'التجمع الأول', city: 'Cairo', governorate: 'Cairo', keywords: ['tagamoa awal'] },
  { value: 'Rehab City', nameAr: 'مدينة الرحاب', city: 'Cairo', governorate: 'Cairo', keywords: ['el rehab'] },
  { value: 'Madinaty', nameAr: 'مدينتي', city: 'Cairo', governorate: 'Cairo' },
  { value: 'El Shorouk', nameAr: 'الشروق', city: 'Cairo', governorate: 'Cairo' },
  { value: 'El Obour', nameAr: 'العبور', city: 'Cairo', governorate: 'Cairo' },
  { value: 'Badr City', nameAr: 'مدينة بدر', city: 'Cairo', governorate: 'Cairo' },
  { value: 'New Administrative Capital', nameAr: 'العاصمة الإدارية الجديدة', city: 'Cairo', governorate: 'Cairo', keywords: ['capital', 'asema edareya'] },
  { value: 'Mokattam', nameAr: 'المقطم', city: 'Cairo', governorate: 'Cairo' },
  { value: 'Manial', nameAr: 'المنيل', city: 'Cairo', governorate: 'Cairo', keywords: ['roda', 'manyal'] },
  { value: 'Sayeda Zeinab', nameAr: 'السيدة زينب', city: 'Cairo', governorate: 'Cairo' },
  { value: 'Old Cairo', nameAr: 'مصر القديمة', city: 'Cairo', governorate: 'Cairo', keywords: ['masr el qadima', 'coptic cairo'] },
  { value: 'Islamic Cairo', nameAr: 'القاهرة الإسلامية', city: 'Cairo', governorate: 'Cairo', keywords: ['khan el khalili', 'hussein', 'moez'] },
  { value: 'Abdeen', nameAr: 'عابدين', city: 'Cairo', governorate: 'Cairo' },
  { value: 'Azbakeya', nameAr: 'الأزبكية', city: 'Cairo', governorate: 'Cairo' },
  { value: 'Darb El Ahmar', nameAr: 'الدرب الأحمر', city: 'Cairo', governorate: 'Cairo' },
  { value: 'Gamaleya', nameAr: 'الجمالية', city: 'Cairo', governorate: 'Cairo' },
  { value: 'Boulaq', nameAr: 'بولاق', city: 'Cairo', governorate: 'Cairo', keywords: ['abu el ela'] },
  { value: 'Abbassia', nameAr: 'العباسية', city: 'Cairo', governorate: 'Cairo' },
  { value: 'Ghamra', nameAr: 'غمرة', city: 'Cairo', governorate: 'Cairo' },
  { value: 'Ain Shams', nameAr: 'عين شمس', city: 'Cairo', governorate: 'Cairo' },
  { value: 'El Matareya', nameAr: 'المطرية', city: 'Cairo', governorate: 'Cairo' },
  { value: 'El Marg', nameAr: 'المرج', city: 'Cairo', governorate: 'Cairo' },
  { value: 'El Salam City', nameAr: 'مدينة السلام', city: 'Cairo', governorate: 'Cairo' },
  { value: 'Shubra', nameAr: 'شبرا', city: 'Cairo', governorate: 'Cairo' },
  { value: 'Rod El Farag', nameAr: 'روض الفرج', city: 'Cairo', governorate: 'Cairo' },
  { value: 'El Sahel', nameAr: 'الساحل', city: 'Cairo', governorate: 'Cairo' },
  { value: 'El Zeitoun', nameAr: 'الزيتون', city: 'Cairo', governorate: 'Cairo' },
  { value: 'Hadayek El Kobba', nameAr: 'حدائق القبة', city: 'Cairo', governorate: 'Cairo' },
  { value: 'El Waili', nameAr: 'الوايلي', city: 'Cairo', governorate: 'Cairo' },
  { value: 'El Zawya El Hamra', nameAr: 'الزاوية الحمراء', city: 'Cairo', governorate: 'Cairo' },
  { value: 'El Sharabiya', nameAr: 'الشرابية', city: 'Cairo', governorate: 'Cairo' },
  { value: 'El Amiriya', nameAr: 'الأميرية', city: 'Cairo', governorate: 'Cairo' },
  { value: 'Manshiyat Naser', nameAr: 'منشية ناصر', city: 'Cairo', governorate: 'Cairo' },
  { value: 'El Khalifa', nameAr: 'الخليفة', city: 'Cairo', governorate: 'Cairo' },
  { value: 'El Basatin', nameAr: 'البساتين', city: 'Cairo', governorate: 'Cairo' },
  { value: 'Dar El Salam', nameAr: 'دار السلام', city: 'Cairo', governorate: 'Cairo' },
  { value: 'Helwan', nameAr: 'حلوان', city: 'Cairo', governorate: 'Cairo' },
  { value: 'El Maasara', nameAr: 'المعصرة', city: 'Cairo', governorate: 'Cairo' },
  { value: 'Tora', nameAr: 'طرة', city: 'Cairo', governorate: 'Cairo' },
  { value: 'El Tebbin', nameAr: 'التبين', city: 'Cairo', governorate: 'Cairo' },
  { value: '15th of May City', nameAr: 'مدينة ١٥ مايو', city: 'Cairo', governorate: 'Cairo' },

  // ══ GIZA ══════════════════════════════════════════════════════════════════════════════
  { value: 'Dokki', nameAr: 'الدقي', city: 'Giza', governorate: 'Giza' },
  { value: 'Mohandessin', nameAr: 'المهندسين', city: 'Giza', governorate: 'Giza', keywords: ['gameat el dowal', 'arab league'] },
  { value: 'Agouza', nameAr: 'العجوزة', city: 'Giza', governorate: 'Giza' },
  { value: 'Haram', nameAr: 'الهرم', city: 'Giza', governorate: 'Giza', keywords: ['pyramids', 'faisal'] },
  { value: 'Faisal', nameAr: 'فيصل', city: 'Giza', governorate: 'Giza' },
  { value: 'Nazlet El Semman', nameAr: 'نزلة السمان', city: 'Giza', governorate: 'Giza', keywords: ['pyramids', 'sphinx'] },
  { value: 'Hadayek El Ahram', nameAr: 'حدائق الأهرام', city: 'Giza', governorate: 'Giza' },
  { value: 'Giza Square', nameAr: 'ميدان الجيزة', city: 'Giza', governorate: 'Giza' },
  { value: 'Mounib', nameAr: 'المنيب', city: 'Giza', governorate: 'Giza' },
  { value: 'Omraniya', nameAr: 'العمرانية', city: 'Giza', governorate: 'Giza' },
  { value: 'Bulaq El Dakrour', nameAr: 'بولاق الدكرور', city: 'Giza', governorate: 'Giza' },
  { value: 'Imbaba', nameAr: 'إمبابة', city: 'Giza', governorate: 'Giza', keywords: ['kit kat'] },
  { value: 'Kit Kat', nameAr: 'الكيت كات', city: 'Giza', governorate: 'Giza' },
  { value: 'Warraq', nameAr: 'الوراق', city: 'Giza', governorate: 'Giza' },
  { value: 'Talbia', nameAr: 'الطالبية', city: 'Giza', governorate: 'Giza' },
  { value: '6th of October City', nameAr: 'مدينة ٦ أكتوبر', city: '6th of October', governorate: 'Giza', keywords: ['october', 'juhayna square'] },
  { value: 'Sheikh Zayed', nameAr: 'الشيخ زايد', city: '6th of October', governorate: 'Giza', keywords: ['zayed', 'arkan', 'beverly hills'] },
  { value: 'Hadayek October', nameAr: 'حدائق أكتوبر', city: '6th of October', governorate: 'Giza' },
  { value: 'Smart Village', nameAr: 'القرية الذكية', city: '6th of October', governorate: 'Giza' },
  { value: 'Media Production City', nameAr: 'مدينة الإنتاج الإعلامي', city: '6th of October', governorate: 'Giza' },
  { value: 'Kerdasa', nameAr: 'كرداسة', city: 'Giza', governorate: 'Giza' },
  { value: 'Saqqara', nameAr: 'سقارة', city: 'Giza', governorate: 'Giza', keywords: ['step pyramid'] },
  { value: 'Dahshur', nameAr: 'دهشور', city: 'Giza', governorate: 'Giza' },
  { value: 'El Badrashin', nameAr: 'البدرشين', city: 'Giza', governorate: 'Giza', keywords: ['memphis'] },
  { value: 'El Ayyat', nameAr: 'العياط', city: 'Giza', governorate: 'Giza' },
  { value: 'Abu El Numrus', nameAr: 'أبو النمرس', city: 'Giza', governorate: 'Giza' },

  // ══ ALEXANDRIA ════════════════════════════════════════════════════════════════════════
  { value: 'Smouha', nameAr: 'سموحة', city: 'Alexandria', governorate: 'Alexandria' },
  { value: 'Sidi Gaber', nameAr: 'سيدي جابر', city: 'Alexandria', governorate: 'Alexandria' },
  { value: 'Roushdy', nameAr: 'رشدي', city: 'Alexandria', governorate: 'Alexandria' },
  { value: 'Stanley', nameAr: 'ستانلي', city: 'Alexandria', governorate: 'Alexandria' },
  { value: 'San Stefano', nameAr: 'سان ستيفانو', city: 'Alexandria', governorate: 'Alexandria' },
  { value: 'Gleem', nameAr: 'جليم', city: 'Alexandria', governorate: 'Alexandria', keywords: ['glim'] },
  { value: 'Louran', nameAr: 'لوران', city: 'Alexandria', governorate: 'Alexandria' },
  { value: 'Sporting', nameAr: 'سبورتنج', city: 'Alexandria', governorate: 'Alexandria' },
  { value: 'Cleopatra', nameAr: 'كليوباترا', city: 'Alexandria', governorate: 'Alexandria' },
  { value: 'Ibrahimiya', nameAr: 'الإبراهيمية', city: 'Alexandria', governorate: 'Alexandria' },
  { value: 'Camp Caesar', nameAr: 'كامب شيزار', city: 'Alexandria', governorate: 'Alexandria' },
  { value: 'Shatby', nameAr: 'الشاطبي', city: 'Alexandria', governorate: 'Alexandria' },
  { value: 'Raml Station', nameAr: 'محطة الرمل', city: 'Alexandria', governorate: 'Alexandria', keywords: ['mahatet el raml', 'downtown'] },
  { value: 'Mansheya', nameAr: 'المنشية', city: 'Alexandria', governorate: 'Alexandria' },
  { value: 'Anfoushi', nameAr: 'الأنفوشي', city: 'Alexandria', governorate: 'Alexandria', keywords: ['bahary'] },
  { value: 'Bahary', nameAr: 'بحري', city: 'Alexandria', governorate: 'Alexandria' },
  { value: 'El Gomrok', nameAr: 'الجمرك', city: 'Alexandria', governorate: 'Alexandria' },
  { value: 'Karmouz', nameAr: 'كرموز', city: 'Alexandria', governorate: 'Alexandria' },
  { value: 'Moharram Bey', nameAr: 'محرم بك', city: 'Alexandria', governorate: 'Alexandria' },
  { value: 'Kafr Abdo', nameAr: 'كفر عبده', city: 'Alexandria', governorate: 'Alexandria' },
  { value: 'Zizinia', nameAr: 'زيزينيا', city: 'Alexandria', governorate: 'Alexandria' },
  { value: 'Saba Pasha', nameAr: 'سابا باشا', city: 'Alexandria', governorate: 'Alexandria' },
  { value: 'Bulkely', nameAr: 'بولكلي', city: 'Alexandria', governorate: 'Alexandria' },
  { value: 'Fleming', nameAr: 'فلمنج', city: 'Alexandria', governorate: 'Alexandria' },
  { value: 'Victoria', nameAr: 'فيكتوريا', city: 'Alexandria', governorate: 'Alexandria' },
  { value: 'Sidi Bishr', nameAr: 'سيدي بشر', city: 'Alexandria', governorate: 'Alexandria' },
  { value: 'Miami', nameAr: 'ميامي', city: 'Alexandria', governorate: 'Alexandria' },
  { value: 'Asafra', nameAr: 'العصافرة', city: 'Alexandria', governorate: 'Alexandria' },
  { value: 'Mandara', nameAr: 'المندرة', city: 'Alexandria', governorate: 'Alexandria' },
  { value: 'Montaza', nameAr: 'المنتزه', city: 'Alexandria', governorate: 'Alexandria' },
  { value: 'Maamoura', nameAr: 'المعمورة', city: 'Alexandria', governorate: 'Alexandria' },
  { value: 'Abu Qir', nameAr: 'أبو قير', city: 'Alexandria', governorate: 'Alexandria' },
  { value: 'Agami', nameAr: 'العجمي', city: 'Alexandria', governorate: 'Alexandria', keywords: ['bitash', 'hannoville'] },
  { value: 'Bitash', nameAr: 'البيطاش', city: 'Alexandria', governorate: 'Alexandria' },
  { value: 'Hannoville', nameAr: 'هانوفيل', city: 'Alexandria', governorate: 'Alexandria' },
  { value: 'Dekheila', nameAr: 'الدخيلة', city: 'Alexandria', governorate: 'Alexandria' },
  { value: 'Wardian', nameAr: 'الورديان', city: 'Alexandria', governorate: 'Alexandria' },
  { value: 'Amreya', nameAr: 'العامرية', city: 'Alexandria', governorate: 'Alexandria' },
  { value: 'Borg El Arab', nameAr: 'برج العرب', city: 'Borg El Arab', governorate: 'Alexandria' },
  { value: 'New Borg El Arab', nameAr: 'برج العرب الجديدة', city: 'Borg El Arab', governorate: 'Alexandria' },
  { value: 'Sidi Kerir', nameAr: 'سيدي كرير', city: 'Alexandria', governorate: 'Alexandria' },

  // ══ SHARM EL SHEIKH & SOUTH SINAI ═════════════════════════════════════════════════════
  { value: 'Naama Bay', nameAr: 'خليج نعمة', city: 'Sharm El Sheikh', governorate: 'South Sinai' },
  { value: 'Hadaba', nameAr: 'الهضبة', city: 'Sharm El Sheikh', governorate: 'South Sinai', keywords: ['umm el sid', 'om el seid'] },
  { value: 'Sharm El Maya', nameAr: 'شرم المية', city: 'Sharm El Sheikh', governorate: 'South Sinai', keywords: ['old market'] },
  { value: 'Old Market', nameAr: 'السوق القديم', city: 'Sharm El Sheikh', governorate: 'South Sinai' },
  { value: 'Nabq Bay', nameAr: 'خليج نبق', city: 'Sharm El Sheikh', governorate: 'South Sinai' },
  { value: "Shark's Bay", nameAr: 'خليج القرش', city: 'Sharm El Sheikh', governorate: 'South Sinai' },
  { value: 'Ras Nasrani', nameAr: 'رأس نصراني', city: 'Sharm El Sheikh', governorate: 'South Sinai' },
  { value: 'Montazah Sharm', nameAr: 'المنتزه', city: 'Sharm El Sheikh', governorate: 'South Sinai' },
  { value: 'Hay El Nour', nameAr: 'حي النور', city: 'Sharm El Sheikh', governorate: 'South Sinai' },
  { value: 'Rowaysat', nameAr: 'الرويسات', city: 'Sharm El Sheikh', governorate: 'South Sinai' },
  { value: 'Soho Square', nameAr: 'سوهو سكوير', city: 'Sharm El Sheikh', governorate: 'South Sinai' },
  { value: 'Assalah', nameAr: 'العسلة', city: 'Dahab', governorate: 'South Sinai', keywords: ['masbat', 'mashraba'] },
  { value: 'Masbat', nameAr: 'المسبط', city: 'Dahab', governorate: 'South Sinai' },
  { value: 'Mashraba', nameAr: 'المشربة', city: 'Dahab', governorate: 'South Sinai' },
  { value: 'Lighthouse', nameAr: 'اللايت هاوس', city: 'Dahab', governorate: 'South Sinai' },
  { value: 'Blue Hole', nameAr: 'البلو هول', city: 'Dahab', governorate: 'South Sinai' },
  { value: 'Laguna', nameAr: 'اللاجونا', city: 'Dahab', governorate: 'South Sinai' },
  { value: 'Nuweiba', nameAr: 'نويبع', city: 'Nuweiba', governorate: 'South Sinai', keywords: ['ras shitan', 'tarabin'] },
  { value: 'Taba', nameAr: 'طابا', city: 'Taba', governorate: 'South Sinai' },
  { value: 'Saint Catherine', nameAr: 'سانت كاترين', city: 'Saint Catherine', governorate: 'South Sinai', keywords: ['mount sinai'] },
  { value: 'El Tor', nameAr: 'الطور', city: 'El Tor', governorate: 'South Sinai' },
  { value: 'Ras Sudr', nameAr: 'رأس سدر', city: 'Ras Sudr', governorate: 'South Sinai' },

  // ══ HURGHADA & RED SEA ════════════════════════════════════════════════════════════════
  { value: 'Dahar', nameAr: 'الدهار', city: 'Hurghada', governorate: 'Red Sea', keywords: ['old town'] },
  { value: 'Sakkala', nameAr: 'السقالة', city: 'Hurghada', governorate: 'Red Sea', keywords: ['saqqala', 'marina'] },
  { value: 'Sheraton Road', nameAr: 'شارع شيراتون', city: 'Hurghada', governorate: 'Red Sea' },
  { value: 'El Mamsha', nameAr: 'الممشى', city: 'Hurghada', governorate: 'Red Sea', keywords: ['promenade', 'tourist walkway'] },
  { value: 'El Ahyaa', nameAr: 'الأحياء', city: 'Hurghada', governorate: 'Red Sea' },
  { value: 'El Kawther', nameAr: 'الكوثر', city: 'Hurghada', governorate: 'Red Sea' },
  { value: 'Village Road', nameAr: 'طريق الفيلدج', city: 'Hurghada', governorate: 'Red Sea' },
  { value: 'Magawish', nameAr: 'مجاويش', city: 'Hurghada', governorate: 'Red Sea' },
  { value: 'Sahl Hasheesh', nameAr: 'سهل حشيش', city: 'Hurghada', governorate: 'Red Sea' },
  { value: 'Makadi Bay', nameAr: 'خليج مكادي', city: 'Hurghada', governorate: 'Red Sea' },
  { value: 'Soma Bay', nameAr: 'سوما باي', city: 'Safaga', governorate: 'Red Sea' },
  { value: 'Safaga', nameAr: 'سفاجا', city: 'Safaga', governorate: 'Red Sea' },
  { value: 'El Gouna Downtown', nameAr: 'داون تاون الجونة', city: 'El Gouna', governorate: 'Red Sea' },
  { value: 'Abu Tig Marina', nameAr: 'مارينا أبو تيج', city: 'El Gouna', governorate: 'Red Sea' },
  { value: 'Mangroovy Beach', nameAr: 'مانجروفي', city: 'El Gouna', governorate: 'Red Sea' },
  { value: 'Tawila', nameAr: 'الطويلة', city: 'El Gouna', governorate: 'Red Sea' },
  { value: 'Marsa Alam', nameAr: 'مرسى علم', city: 'Marsa Alam', governorate: 'Red Sea' },
  { value: 'Port Ghalib', nameAr: 'بورت غالب', city: 'Marsa Alam', governorate: 'Red Sea' },
  { value: 'El Quseir', nameAr: 'القصير', city: 'El Quseir', governorate: 'Red Sea' },
  { value: 'Ras Ghareb', nameAr: 'رأس غارب', city: 'Ras Ghareb', governorate: 'Red Sea' },

  // ══ NORTH COAST & MATROUH ═════════════════════════════════════════════════════════════
  { value: 'Marsa Matrouh City', nameAr: 'مدينة مرسى مطروح', city: 'Marsa Matrouh', governorate: 'Matrouh', keywords: ['cleopatra beach'] },
  { value: 'Sidi Abdel Rahman', nameAr: 'سيدي عبد الرحمن', city: 'North Coast', governorate: 'Matrouh', keywords: ['sahel'] },
  { value: 'Almaza Bay', nameAr: 'ألماظة باي', city: 'North Coast', governorate: 'Matrouh' },
  { value: 'Marina El Alamein', nameAr: 'مارينا العلمين', city: 'North Coast', governorate: 'Matrouh', keywords: ['marina'] },
  { value: 'New Alamein', nameAr: 'العلمين الجديدة', city: 'North Coast', governorate: 'Matrouh' },
  { value: 'Ras El Hekma', nameAr: 'رأس الحكمة', city: 'North Coast', governorate: 'Matrouh' },
  { value: 'Fouka Bay', nameAr: 'فوكا باي', city: 'North Coast', governorate: 'Matrouh' },
  { value: 'Sidi Heneish', nameAr: 'سيدي حنيش', city: 'North Coast', governorate: 'Matrouh' },
  { value: 'El Dabaa', nameAr: 'الضبعة', city: 'North Coast', governorate: 'Matrouh' },
  { value: 'Siwa Oasis', nameAr: 'واحة سيوة', city: 'Siwa', governorate: 'Matrouh', keywords: ['shali', 'cleopatra spring'] },
  { value: 'Salloum', nameAr: 'السلوم', city: 'Salloum', governorate: 'Matrouh' },

  // ══ LUXOR ═════════════════════════════════════════════════════════════════════════════
  { value: 'Luxor East Bank', nameAr: 'البر الشرقي', city: 'Luxor', governorate: 'Luxor', keywords: ['corniche', 'luxor temple'] },
  { value: 'Luxor West Bank', nameAr: 'البر الغربي', city: 'Luxor', governorate: 'Luxor', keywords: ['valley of the kings', 'qurna'] },
  { value: 'Karnak', nameAr: 'الكرنك', city: 'Luxor', governorate: 'Luxor' },
  { value: 'New Luxor', nameAr: 'الأقصر الجديدة', city: 'Luxor', governorate: 'Luxor' },
  { value: 'Armant', nameAr: 'أرمنت', city: 'Armant', governorate: 'Luxor' },
  { value: 'Esna', nameAr: 'إسنا', city: 'Esna', governorate: 'Luxor' },

  // ══ ASWAN ═════════════════════════════════════════════════════════════════════════════
  { value: 'Aswan Corniche', nameAr: 'كورنيش أسوان', city: 'Aswan', governorate: 'Aswan' },
  { value: 'Elephantine Island', nameAr: 'جزيرة إلفنتين', city: 'Aswan', governorate: 'Aswan' },
  { value: 'Gharb Soheil', nameAr: 'غرب سهيل', city: 'Aswan', governorate: 'Aswan', keywords: ['nubian village'] },
  { value: 'New Aswan', nameAr: 'أسوان الجديدة', city: 'Aswan', governorate: 'Aswan' },
  { value: 'Kom Ombo', nameAr: 'كوم أمبو', city: 'Kom Ombo', governorate: 'Aswan' },
  { value: 'Edfu', nameAr: 'إدفو', city: 'Edfu', governorate: 'Aswan' },
  { value: 'Abu Simbel', nameAr: 'أبو سمبل', city: 'Abu Simbel', governorate: 'Aswan' },

  // ══ CANAL CITIES ══════════════════════════════════════════════════════════════════════
  { value: 'Port Fouad', nameAr: 'بورفؤاد', city: 'Port Said', governorate: 'Port Said' },
  { value: 'El Sharq District', nameAr: 'حي الشرق', city: 'Port Said', governorate: 'Port Said' },
  { value: 'El Arab District', nameAr: 'حي العرب', city: 'Port Said', governorate: 'Port Said' },
  { value: 'El Manakh', nameAr: 'حي المناخ', city: 'Port Said', governorate: 'Port Said' },
  { value: 'El Dawahy', nameAr: 'حي الضواحي', city: 'Port Said', governorate: 'Port Said' },
  { value: 'Ismailia City Centre', nameAr: 'وسط الإسماعيلية', city: 'Ismailia', governorate: 'Ismailia' },
  { value: 'Numra Sitta', nameAr: 'نمرة ٦', city: 'Ismailia', governorate: 'Ismailia' },
  { value: 'Temsah', nameAr: 'التمساح', city: 'Ismailia', governorate: 'Ismailia', keywords: ['lake timsah'] },
  { value: 'Fayed', nameAr: 'فايد', city: 'Fayed', governorate: 'Ismailia' },
  { value: 'Port Tewfik', nameAr: 'بورتوفيق', city: 'Suez', governorate: 'Suez' },
  { value: 'El Arbaeen', nameAr: 'الأربعين', city: 'Suez', governorate: 'Suez' },
  { value: 'Ain Sokhna', nameAr: 'العين السخنة', city: 'Ain Sokhna', governorate: 'Suez' },

  // ══ DELTA ═════════════════════════════════════════════════════════════════════════════
  { value: 'Mansoura City Centre', nameAr: 'وسط المنصورة', city: 'Mansoura', governorate: 'Dakahlia', keywords: ['toriel', 'gedila'] },
  { value: 'New Mansoura', nameAr: 'المنصورة الجديدة', city: 'Mansoura', governorate: 'Dakahlia' },
  { value: 'Talkha', nameAr: 'طلخا', city: 'Talkha', governorate: 'Dakahlia' },
  { value: 'Gamasa', nameAr: 'جمصة', city: 'Gamasa', governorate: 'Dakahlia' },
  { value: 'Mit Ghamr', nameAr: 'ميت غمر', city: 'Mit Ghamr', governorate: 'Dakahlia' },
  { value: 'Tanta City Centre', nameAr: 'وسط طنطا', city: 'Tanta', governorate: 'Gharbia' },
  { value: 'El Mahalla El Kubra', nameAr: 'المحلة الكبرى', city: 'El Mahalla', governorate: 'Gharbia' },
  { value: 'Kafr El Zayat', nameAr: 'كفر الزيات', city: 'Kafr El Zayat', governorate: 'Gharbia' },
  { value: 'Zagazig', nameAr: 'الزقازيق', city: 'Zagazig', governorate: 'Sharqia' },
  { value: '10th of Ramadan', nameAr: 'العاشر من رمضان', city: '10th of Ramadan', governorate: 'Sharqia' },
  { value: 'Belbeis', nameAr: 'بلبيس', city: 'Belbeis', governorate: 'Sharqia' },
  { value: 'Banha', nameAr: 'بنها', city: 'Banha', governorate: 'Qalyubia' },
  { value: 'Shubra El Kheima', nameAr: 'شبرا الخيمة', city: 'Shubra El Kheima', governorate: 'Qalyubia' },
  { value: 'Qanater El Khayreya', nameAr: 'القناطر الخيرية', city: 'Qalyub', governorate: 'Qalyubia' },
  { value: 'Shibin El Kom', nameAr: 'شبين الكوم', city: 'Shibin El Kom', governorate: 'Monufia' },
  { value: 'Sadat City', nameAr: 'مدينة السادات', city: 'Sadat City', governorate: 'Monufia' },
  { value: 'Damanhur', nameAr: 'دمنهور', city: 'Damanhur', governorate: 'Beheira' },
  { value: 'Rashid', nameAr: 'رشيد', city: 'Rashid', governorate: 'Beheira', keywords: ['rosetta'] },
  { value: 'Kafr El Dawar', nameAr: 'كفر الدوار', city: 'Kafr El Dawar', governorate: 'Beheira' },
  { value: 'Wadi El Natrun', nameAr: 'وادي النطرون', city: 'Wadi El Natrun', governorate: 'Beheira' },
  { value: 'Kafr El Sheikh City', nameAr: 'مدينة كفر الشيخ', city: 'Kafr El Sheikh', governorate: 'Kafr El Sheikh' },
  { value: 'Baltim', nameAr: 'بلطيم', city: 'Baltim', governorate: 'Kafr El Sheikh' },
  { value: 'Desouk', nameAr: 'دسوق', city: 'Desouk', governorate: 'Kafr El Sheikh' },
  { value: 'Ras El Bar', nameAr: 'رأس البر', city: 'Ras El Bar', governorate: 'Damietta' },
  { value: 'New Damietta', nameAr: 'دمياط الجديدة', city: 'Damietta', governorate: 'Damietta' },
  { value: 'Ezbet El Borg', nameAr: 'عزبة البرج', city: 'Damietta', governorate: 'Damietta' },

  // ══ UPPER EGYPT ═══════════════════════════════════════════════════════════════════════
  { value: 'Fayoum City', nameAr: 'مدينة الفيوم', city: 'Fayoum', governorate: 'Fayoum' },
  { value: 'Tunis Village', nameAr: 'قرية تونس', city: 'Fayoum', governorate: 'Fayoum', keywords: ['pottery'] },
  { value: 'Lake Qarun', nameAr: 'بحيرة قارون', city: 'Fayoum', governorate: 'Fayoum' },
  { value: 'Wadi El Rayan', nameAr: 'وادي الريان', city: 'Fayoum', governorate: 'Fayoum', keywords: ['waterfalls'] },
  { value: 'Beni Suef City', nameAr: 'مدينة بني سويف', city: 'Beni Suef', governorate: 'Beni Suef' },
  { value: 'New Beni Suef', nameAr: 'بني سويف الجديدة', city: 'Beni Suef', governorate: 'Beni Suef' },
  { value: 'Minya City', nameAr: 'مدينة المنيا', city: 'Minya', governorate: 'Minya' },
  { value: 'New Minya', nameAr: 'المنيا الجديدة', city: 'Minya', governorate: 'Minya' },
  { value: 'Mallawi', nameAr: 'ملوي', city: 'Mallawi', governorate: 'Minya' },
  { value: 'Tuna El Gebel', nameAr: 'تونا الجبل', city: 'Mallawi', governorate: 'Minya' },
  { value: 'Assiut City', nameAr: 'مدينة أسيوط', city: 'Assiut', governorate: 'Assiut' },
  { value: 'New Assiut', nameAr: 'أسيوط الجديدة', city: 'Assiut', governorate: 'Assiut' },
  { value: 'Dairut', nameAr: 'ديروط', city: 'Dairut', governorate: 'Assiut' },
  { value: 'Sohag City', nameAr: 'مدينة سوهاج', city: 'Sohag', governorate: 'Sohag' },
  { value: 'New Sohag', nameAr: 'سوهاج الجديدة', city: 'Sohag', governorate: 'Sohag' },
  { value: 'Akhmim', nameAr: 'أخميم', city: 'Akhmim', governorate: 'Sohag' },
  { value: 'El Balyana', nameAr: 'البلينا', city: 'El Balyana', governorate: 'Sohag', keywords: ['abydos'] },
  { value: 'Qena City', nameAr: 'مدينة قنا', city: 'Qena', governorate: 'Qena' },
  { value: 'Dendera', nameAr: 'دندرة', city: 'Qena', governorate: 'Qena' },
  { value: 'Nag Hammadi', nameAr: 'نجع حمادي', city: 'Nag Hammadi', governorate: 'Qena' },
  { value: 'Qus', nameAr: 'قوص', city: 'Qus', governorate: 'Qena' },

  // ══ NEW VALLEY & NORTH SINAI ══════════════════════════════════════════════════════════
  { value: 'Kharga', nameAr: 'الخارجة', city: 'Kharga', governorate: 'New Valley' },
  { value: 'Dakhla', nameAr: 'الداخلة', city: 'Dakhla', governorate: 'New Valley', keywords: ['mut'] },
  { value: 'Farafra', nameAr: 'الفرافرة', city: 'Farafra', governorate: 'New Valley', keywords: ['white desert'] },
  { value: 'Arish', nameAr: 'العريش', city: 'Arish', governorate: 'North Sinai' },
  { value: 'Bir El Abd', nameAr: 'بئر العبد', city: 'Bir El Abd', governorate: 'North Sinai' },
];

/** Distinct city names, in the order they first appear — used to group the picker. */
export const REGION_CITIES: string[] = Array.from(
  new Set(EGYPT_REGIONS.map((r) => r.city)),
);

export const REGION_VALUES = EGYPT_REGIONS.map((r) => r.value);

export function findRegion(value: string | null | undefined) {
  if (!value) return undefined;
  const needle = value.trim().toLowerCase();
  return EGYPT_REGIONS.find(
    (r) => r.value.toLowerCase() === needle || r.nameAr === value.trim(),
  );
}
