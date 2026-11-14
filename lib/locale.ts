/** Arabic dates and numbers with Western digits (owner rule: 0-9 everywhere). */
export const AR_LOCALE = 'ar-EG-u-nu-latn';
/** Number locale for a dashboard language: Arabic keeps Western digits. */
export const localeFor = (lang: string) => (lang === 'ar' ? AR_LOCALE : 'en');
