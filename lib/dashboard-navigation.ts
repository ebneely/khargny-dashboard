export function activeNavHref(pathname: string, items: readonly { href: string }[]) {
  return items.filter(({ href }) => pathname === href || (href !== '/dashboard' && pathname.startsWith(href + '/')))
    .sort((first, second) => second.href.length - first.href.length)[0]?.href;
}
