'use client';

// Decision 0007, place detail: the team's ★ keywords and the words the search learned for this place. Read only; the
// team promotes or blocks a learned word in Numbers → Search → Learned words.
import * as React from 'react';
import { Bot, Star } from 'lucide-react';
import { adminApi } from '@/lib/api/admin-client';
import { useSubscriberResource } from '@/lib/api/hooks/use-subscriber-resource';
import { useDashboardLang } from '@/lib/dashboard-lang';
import { useDashboardCopy } from '../dashboard-text';
import { RequestError } from '../subscriber-ui';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LearnedEvidence, type LearnedKeyword } from './learned-keywords';

type TeamWord = { name: string; nameEn: string | null };

export function PlaceSearchWords({ placeId }: { placeId: string }) {
  const copy = useDashboardCopy();
  const { lang } = useDashboardLang();
  const load = React.useCallback(
    () => adminApi.get<{ team: TeamWord[]; learned: LearnedKeyword[] }>(`/v1/admin/algorithm/places/${placeId}/keywords`),
    [placeId],
  );
  const resource = useSubscriberResource(load);
  const team = resource.data?.team ?? [];
  const learned = (resource.data?.learned ?? []).filter((row) => row.status === 'learned');
  return <Card data-trace-id="place-search-words">
    <CardHeader>
      <CardTitle>{copy('Search words')}</CardTitle>
      <CardDescription>{copy('The team’s keywords count fully in search. Learned words count by their weight and fade when the taps stop.')}</CardDescription>
    </CardHeader>
    <CardContent className="space-y-6">
      {resource.error ? <RequestError message={copy('Could not load the search words of this place.')} retry={() => { void resource.refetch(); }} /> : resource.loading ? <div role="status" className="h-24 animate-pulse rounded-lg bg-muted"><span className="sr-only">{copy('Loading…')}</span></div> : <>
        <section className="space-y-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold"><Star className="size-4 text-primary" aria-hidden="true" />{copy('Team keywords')}</h3>
          {team.length
            ? <ul className="flex flex-wrap gap-2">{team.map((row) => <li key={row.name} className="rounded-full bg-muted px-2 py-0.5 text-xs"><bdi>{lang === 'ar' ? row.name : row.nameEn || row.name}</bdi></li>)}</ul>
            : <p className="text-sm text-muted-foreground">{copy('No team keywords on this place.')}</p>}
        </section>
        <section className="space-y-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold"><Bot className="size-4 text-muted-foreground" aria-hidden="true" />{copy('Learned words')}</h3>
          {learned.length
            ? <ul className="divide-y">{learned.map((row) => <li key={row.term} className="space-y-2 py-3"><bdi className="text-sm font-medium">{row.term}</bdi><LearnedEvidence row={row} /></li>)}</ul>
            : <p className="text-sm text-muted-foreground">{copy('No learned words for this place yet. A word appears after several different visitors search it and pick this place.')}</p>}
        </section>
      </>}
    </CardContent>
  </Card>;
}
