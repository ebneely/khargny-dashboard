export function supportsBrands(items: { isBrand?: boolean }[]): boolean {
  return items.some((item) => typeof item.isBrand === 'boolean');
}

export function subscriberBrandFields(previous: boolean | undefined, next: boolean): { isBrand?: boolean } {
  return typeof previous === 'boolean' || next ? { isBrand: next } : {};
}
