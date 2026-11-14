'use client';

import Link from 'next/link';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { BadgeCatalogue, ManagedBadge } from '@/lib/api/badges';
import { achievementRuleText, badgeGivenBy, cairoDateTime, statusBadgeRules } from '@/lib/badge-rules';
import { localeFor } from '@/lib/locale';
import { useDashboardCopy } from './dashboard-text';
import { RecordCell } from './record-cell';
import { DateCell } from './date-cell';
import { StatusBadge, useSubscriberText } from './subscriber-ui';

/** Every badge a place can carry on 5argny, with how it is earned, who gives it, how often it is recalculated and how many places hold it now. */
export function BadgeCatalogueCard({ catalogue, badges }: { catalogue: BadgeCatalogue; badges: ManagedBadge[] }) {
  const copy = useDashboardCopy();
  const { lang } = useSubscriberText();
  const run = catalogue.lastRun;
  const rule = (badge: ManagedBadge) => badge.family === 'status'
    ? <>{copy(statusBadgeRules[badge.key as keyof typeof statusBadgeRules])}{badge.key === 'price_match' && <> {copy('It is removed when the prices change.')}</>}</>
    : badge.rule ? achievementRuleText(badge.rule, lang) : '—';
  const cadence = (badge: ManagedBadge) => badge.family === 'status' ? <p>{copy('Live: it changes at once')}</p> : <div className="space-y-1"><p>{copy('Once a day when out of date, or Run now')}</p><p className="text-muted-foreground">{copy('Last run')}: {run ? cairoDateTime(run.finishedAt ?? run.startedAt, lang) : copy('No run recorded yet')}</p><p className="text-muted-foreground">{copy('Next check day')}: <DateCell value={catalogue.nextDue.day} /></p></div>;
  const holders = (badge: ManagedBadge) => <Link className="underline tabular-nums" href={`/dashboard/badges?tab=${badge.family === 'status' ? 'status' : 'achievements'}`}>{badge.holderCount.toLocaleString(localeFor(lang))}</Link>;
  const shown = (badge: ManagedBadge) => <StatusBadge status={badge.enabled ? 'active' : 'inactive'}>{copy(badge.enabled ? 'Shown on 5argny' : 'Hidden')}</StatusBadge>;
  return <Card><CardHeader><CardTitle>{copy('All badges')}</CardTitle><CardDescription>{copy('Every badge a place can earn on 5argny, how it gets it and how many places hold it now.')}</CardDescription></CardHeader><CardContent className="min-w-0">
    <div data-list-table="badges" className="min-w-0"><Table layout="list"><TableHeader><TableRow>{['Badge', 'How a place gets it', 'Given by', 'Recalculated', 'Shown on 5argny', 'Holders'].map((label) => <TableHead key={label} className={label === 'Holders' ? 'text-end' : undefined}>{copy(label)}</TableHead>)}</TableRow></TableHeader><TableBody>{badges.map((badge) => <TableRow key={badge.key} data-badge-catalogue={badge.key}>
      <TableCell><RecordCell icon="badge" badgeIcon={badge.icon} nameAr={badge.nameAr} nameEn={badge.nameEn} /><div className="mt-2 space-y-1 text-sm sm:hidden"><p>{rule(badge)}</p><p>{copy('Given by')}: {copy(badgeGivenBy[badge.key])}</p>{cadence(badge)}<p className="flex flex-wrap items-center gap-2">{shown(badge)} {copy('Holders')}: {holders(badge)}</p></div></TableCell>
      <TableCell className="min-w-56 whitespace-normal break-words text-sm">{rule(badge)}</TableCell>
      <TableCell className="whitespace-normal text-sm">{copy(badgeGivenBy[badge.key])}</TableCell>
      <TableCell className="min-w-48 whitespace-normal text-sm">{cadence(badge)}</TableCell>
      <TableCell>{shown(badge)}</TableCell>
      <TableCell className="text-end">{holders(badge)}</TableCell>
    </TableRow>)}</TableBody></Table></div>
  </CardContent></Card>;
}
