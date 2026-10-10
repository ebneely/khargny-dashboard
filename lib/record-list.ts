export function listOffset(value: string | null) {
  const offset = Number(value);
  return Number.isSafeInteger(offset) && offset >= 0 ? offset : 0;
}

export function matchesRecord(text: string, query: string) {
  const normalize = (value: string) => value.normalize('NFKD').replace(/[\u0300-\u036f\u064b-\u065f\u0670]/g, '').replace(/[أإآ]/g, 'ا').toLocaleLowerCase();
  return normalize(text).includes(normalize(query.trim()));
}
