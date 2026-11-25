'use client';

// Decision 0006/0007: every ranking rule is a setting. The panel reads one version, edits the values in the
// browser, previews the new statuses without saving, and saves a new version (super admin only).
import * as React from 'react';
import { toast } from 'sonner';
import { Save, Eye } from 'lucide-react';
import { AdminApiError } from '@/lib/api/admin-client';
import { useSubscriberResource } from '@/lib/api/hooks/use-subscriber-resource';
import { useCurrentSession } from '@/lib/api/hooks/use-current-session';
import { useDashboardCopy } from '../dashboard-text';
import { useDashboardLang } from '@/lib/dashboard-lang';
import { loadAlgorithmSettings, previewAlgorithm, saveAlgorithmSettings, type AlgorithmPreview, type AlgorithmSettingsRow } from '@/lib/api/algorithm';
import { ALGORITHM_STATUS_ORDER, ALGORITHM_STATUS_WORDS, isAlgorithmStatus } from '@/lib/algorithm-status';
import { AlgorithmStatusLegend, StatusIcon } from './status-mark';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { SegmentedControl } from '../segmented-control';
import { LoadingState, RequestError } from '../subscriber-ui';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';

type Kind = 'number' | 'percent' | 'bool' | 'text' | 'counts';
interface Field { path: string; label: string; kind?: Kind; help?: string }
interface Group { id: string; title: string; description: string; fields: Field[] }

const f = (path: string, label: string, kind: Kind = 'number'): Field => ({ path, label, kind });

const GROUPS: Group[] = [
  {
    id: 'fair', title: 'Fair chance',
    description: 'The seats kept for places that are not hyped yet, and how long a trial lasts.',
    fields: [
      f('fairChance.socialSeatsPer10', 'Fair-chance seats per 10 posts'),
      f('fairChance.storiesSeatsPer8', 'Fair-chance seats per 8 stories'),
      f('fairChance.trialShowings', 'Showings in a trial'),
      f('fairChance.trialDays', 'Trial days'),
      f('fairChance.restDays', 'Rest days'),
      f('fairChance.requirePhotosAndHours', 'Require photos and opening hours', 'bool'),
    ],
  },
  {
    id: 'statuses', title: 'Statuses',
    description: 'What makes a place Rising, Hyped or Cooling. Customers never see these marks.',
    fields: [
      f('statuses.hypedTopPercent', 'Hyped: top % of hype in the city', 'percent'),
      f('statuses.risingGrowthPercent', 'Rising: weekly growth %', 'percent'),
      f('statuses.coolingDropPercent', 'Cooling: weekly drop %', 'percent'),
      f('statuses.newDays', 'New for days'),
    ],
  },
  {
    id: 'hype', title: 'Hype and interest',
    description: 'Hype is the uncapped 30-day sum. Interest is what a showing earned compared with other places.',
    fields: [
      f('hype.windowDays', 'Hype window (days)'),
      { path: 'hype.counts', label: 'Hype counts', kind: 'counts' },
      f('interest.weights.view', 'Interest: a view'),
      f('interest.weights.love', 'Interest: a love'),
      f('interest.weights.save', 'Interest: a save'),
      f('interest.weights.share', 'Interest: a share'),
      f('interest.weights.go', 'Interest: a go'),
      f('interest.weights.call', 'Interest: a call'),
      f('interest.weights.searchTap', 'Interest: a Search point'),
      f('interest.smoothActions', 'Smoothing (actions)'),
      f('interest.smoothShowings', 'Smoothing (showings)'),
    ],
  },
  {
    id: 'feed', title: 'Feed and ads',
    description: 'How the feed ranks, and the most a paid post may ever take.',
    fields: [
      f('feed.weights.taste', 'Feed: Taste'),
      f('feed.weights.popularity', 'Feed: Popularity'),
      f('feed.weights.quality', 'Feed: Quality'),
      f('feed.weights.freshness', 'Feed: Freshness'),
      f('feed.distance.area', 'Distance: same area'),
      f('feed.distance.city', 'Distance: same city'),
      f('feed.distance.otherCity', 'Distance: another city'),
      f('ads.maxPer10', 'Max ads per 10 posts'),
      f('ads.firstPositionSocial', 'First ad position (social)'),
      f('ads.firstPositionStories', 'First ad position (stories)'),
      f('ads.minGapSocial', 'Minimum gap (social)'),
      f('ads.minGapStories', 'Minimum gap (stories)'),
      f('ads.relevanceFloorPercent', 'Relevance floor %', 'percent'),
      f('ads.dailyCapPerPerson', 'Daily cap per person'),
    ],
  },
  {
    id: 'nearby-feed',
    title: 'Nearby: the feed',
    description: 'When the person shares a position, the real distance decides the feed. A place 3 km away counts half as near as one next door.',
    fields: [
      f('feed.nearby.weight', 'Feed: nearness weight'),
      f('feed.nearby.halfKm', 'Feed: half distance (km)'),
      f('feed.nearby.maxKm', 'Feed: max distance (km)'),
      f('feed.nearby.floor', 'Feed: lowest nearness'),
    ],
  },
  {
    id: 'nearby-ads',
    title: 'Nearby: the ads',
    description: 'Ads are served by the nearest region. A place 5 km away counts half as near as one next door, and no ad is shown past the furthest distance.',
    fields: [
      f('ads.nearby.weight', 'Ads: nearness weight'),
      f('ads.nearby.halfKm', 'Ads: half distance (km)'),
      f('ads.nearby.maxKm', 'Ads: max distance (km)'),
    ],
  },
  {
    id: 'search', title: 'Search and quality',
    description: 'What the search box suggests, and the quality a place needs before a fair trial.',
    fields: [
      f('search.defaultCitySlug', 'Default city slug', 'text'),
      f('search.suggestInCity', 'Suggest in city', 'bool'),
      f('search.suggestOpenNow', 'Suggest open now', 'bool'),
      f('search.suggestPlaces', 'Suggest places', 'bool'),
      f('quality.minForTrial', 'Minimum quality for a trial'),
      f('quality.googleEnabled', 'Google Search Console on', 'bool'),
      f('quality.siteProperty', 'Search Console property', 'text'),
      f('quality.siteUrl', 'Site address', 'text'),
      f('quality.quickWinMinImpressions', 'Quick-win minimum impressions'),
    ],
  },
  {
    id: 'learned', title: 'Learned keywords',
    description: 'When a word customers search becomes a keyword of the place they pick. Team keywords always count fully.',
    fields: [
      f('learnedKeywords.autoAssign', 'Learn keywords automatically', 'bool'),
      f('learnedKeywords.minVisitors', 'Minimum different visitors'),
      f('learnedKeywords.minPickRatePercent', 'Minimum pick rate %', 'percent'),
      f('learnedKeywords.tapPoints', 'Tap points'),
      f('learnedKeywords.goPoints', 'Go or call points'),
      f('learnedKeywords.fadeDays', 'Fade after days without a tap'),
      f('learnedKeywords.maxWeightPercent', 'Maximum weight vs a team keyword %', 'percent'),
      f('learnedKeywords.fullEvidence', 'Full evidence'),
    ],
  },
  {
    id: 'evidence', title: 'Evidence and web identity',
    description: 'How actions are counted so one person cannot pump a place, and how long the web keeps its anonymous ID.',
    fields: [
      f('evidence.oncePerVisitorPerDay', 'Count the same action once per visitor per day', 'bool'),
      f('evidence.speedLimitPerMinute', 'Speed limit per minute'),
      f('evidence.newVisitorWeight', 'New-visitor weight'),
      f('evidence.visitorCapPerPlacePerDay', 'Per-visitor cap per place per day'),
      f('evidence.botFilter', 'Drop bots and datacenters', 'bool'),
      f('evidence.networkVisitorLimit', 'Visitor limit per network'),
      f('webIdentity.idLifetimeDays', 'Web ID lifetime (days)'),
      f('webIdentity.softRelink', 'Soft re-link a cleared browser', 'bool'),
      f('webIdentity.softSignalKeepDays', 'Keep the soft signal (days)'),
    ],
  },
];

const HYPE_COUNTS = ['views', 'loves', 'saves', 'shares', 'goes', 'searchTaps'] as const;
const COUNT_WORDS: Record<(typeof HYPE_COUNTS)[number], string> = { views: 'Views', loves: 'Loves', saves: 'Saves', shares: 'Shares', goes: '5argny taps', searchTaps: 'Search points' };

const readPath = (values: Record<string, unknown>, path: string): unknown =>
  path.split('.').reduce<unknown>((at, key) => (at && typeof at === 'object' ? (at as Record<string, unknown>)[key] : undefined), values);

function writePath(values: Record<string, unknown>, path: string, next: unknown): Record<string, unknown> {
  const out = structuredClone(values);
  const keys = path.split('.');
  let at: Record<string, unknown> = out;
  for (const key of keys.slice(0, -1)) at = at[key] as Record<string, unknown>;
  at[keys[keys.length - 1]] = next;
  return out;
}

type Draft = Record<string, string | boolean | string[]>;
const draftFrom = (values: Record<string, unknown>): Draft => {
  const draft: Draft = {};
  for (const group of GROUPS) for (const field of group.fields) {
    const value = readPath(values, field.path);
    draft[field.path] = field.kind === 'bool' ? Boolean(value) : field.kind === 'counts' ? [...((value as string[]) ?? [])] : String(value ?? '');
  }
  return draft;
};

/** The values to send: numbers parsed, booleans kept, the hype counts list as chosen. */
function buildValues(values: Record<string, unknown>, draft: Draft): Record<string, unknown> {
  let out = values;
  for (const group of GROUPS) for (const field of group.fields) {
    const raw = draft[field.path];
    if (field.kind === 'bool') out = writePath(out, field.path, Boolean(raw));
    else if (field.kind === 'counts') out = writePath(out, field.path, raw as string[]);
    else if (field.kind === 'text') out = writePath(out, field.path, String(raw ?? '').trim());
    else if (raw === '' || raw === undefined) continue;
    else out = writePath(out, field.path, Number(raw));
  }
  return out;
}

/** The preview's rows in the place-journey order; any status the server adds that we do not know follows alphabetically. */
function previewStatusOrder(preview: AlgorithmPreview): string[] {
  const seen = new Set([...Object.keys(preview.statusCounts.before), ...Object.keys(preview.statusCounts.after)]);
  const known = ALGORITHM_STATUS_ORDER.filter((key) => seen.has(key));
  const unknown = [...seen].filter((key) => !isAlgorithmStatus(key)).sort();
  return [...known, ...unknown];
}

export function AlgorithmSettingsPanel({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const copy = useDashboardCopy();
  const { pick } = useDashboardLang();
  const session = useCurrentSession();
  const canWrite = session.data?.user.role === 'super_admin';
  const resource = useSubscriberResource<AlgorithmSettingsRow>(loadAlgorithmSettings);
  const [group, setGroup] = React.useState('fair');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const [preview, setPreview] = React.useState<AlgorithmPreview | null>(null);
  const [draftState, setDraftState] = React.useState<{ version: number; values: Draft } | null>(null);
  // The draft follows the loaded version; a save or a refetch starts a fresh one from the server's values.
  const draft = React.useMemo(() =>
    draftState && resource.data && draftState.version === resource.data.version
      ? draftState.values
      : resource.data ? draftFrom(resource.data.values) : {}
  , [draftState, resource.data]);
  const edit = (path: string, value: string | boolean | string[]) =>
    setDraftState({ version: resource.data?.version ?? 0, values: { ...draft, [path]: value } });

  const values = React.useMemo(() => resource.data ? buildValues(resource.data.values, draft) : null, [resource.data, draft]);
  const active = GROUPS.find((entry) => entry.id === group) ?? GROUPS[0];

  const save = async () => {
    if (!values || busy) return;
    setBusy(true); setError('');
    try {
      const row = await saveAlgorithmSettings(values, 'algorithm dashboard');
      setDraftState(null);
      setPreview(null);
      toast.success(`${copy('Saved as version')} ${row.version.toLocaleString('en-US')}.`);
      void resource.refetch();
    } catch (caught) {
      setError(caught instanceof AdminApiError && caught.status === 403 ? copy('Only a super admin can change these settings.') : copy('Could not save the settings.'));
    } finally { setBusy(false); }
  };

  const runPreview = async () => {
    if (!values || busy) return;
    setBusy(true); setError('');
    try { setPreview(await previewAlgorithm(values)); }
    catch { setError(copy('Could not preview the settings.')); }
    finally { setBusy(false); }
  };

  return <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent side="right" className="w-full sm:max-w-xl">
      <SheetHeader className="border-b border-border pe-12">
        <SheetTitle>{copy('Algorithm settings')}</SheetTitle>
        <SheetDescription>{copy('New values change every status. Saving makes a new version; the pass runs in the background.')}</SheetDescription>
        {resource.data && <p className="text-xs text-muted-foreground">{copy('Version')} {resource.data.version.toLocaleString('en-US')}{resource.data.updatedBy ? ` · ${resource.data.updatedBy}` : ''}</p>}
      </SheetHeader>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        {resource.loading ? <LoadingState /> : resource.error || !resource.data ? <RequestError message={copy('Could not load the settings.')} retry={() => { void resource.refetch(); }} /> : <>
          {!session.isLoading && !canWrite && <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">{copy('Only a super admin can change these settings.')}</p>}
          <SegmentedControl label="Settings group" value={group} onValueChange={setGroup} options={GROUPS.map((entry) => ({ value: entry.id, label: entry.title }))} />
          <section aria-labelledby="algorithm-settings-group" className="space-y-3">
            <div><h3 id="algorithm-settings-group" className="font-medium">{copy(active.title)}</h3><p className="text-sm text-muted-foreground">{copy(active.description)}</p></div>
            <div className="grid gap-3 sm:grid-cols-2">
              {active.fields.map((field) => {
                const id = `alg-${field.path.replaceAll('.', '-')}`;
                const raw = draft[field.path];
                if (field.kind === 'bool') return <div key={field.path} className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
                  <Label htmlFor={id} className="text-sm font-normal">{copy(field.label)}</Label>
                  <Switch id={id} checked={Boolean(raw)} disabled={!canWrite || busy} onCheckedChange={(checked) => edit(field.path, Boolean(checked))} />
                </div>;
                if (field.kind === 'counts') return <fieldset key={field.path} className="sm:col-span-2"><legend className="mb-2 text-sm">{copy(field.label)}</legend>
                  <div className="flex flex-wrap gap-3">{HYPE_COUNTS.map((count) => {
                    const chosen = Array.isArray(raw) ? raw.includes(count) : false;
                    return <label key={count} className="flex min-h-11 cursor-pointer items-center gap-2 text-sm"><Checkbox checked={chosen} disabled={!canWrite || busy} onCheckedChange={(checked) => edit(field.path, checked ? [...new Set([...(Array.isArray(raw) ? raw : []), count])] : (Array.isArray(raw) ? raw : []).filter((entry) => entry !== count))} />{copy(COUNT_WORDS[count])}</label>;
                  })}</div>
                  <p className="mt-1 text-xs text-muted-foreground">{copy('The sixth metric, Search points, is a search followed by tapping the place.')}</p>
                </fieldset>;
                return <div key={field.path} className="space-y-1">
                  <Label htmlFor={id} className="text-sm font-normal">{copy(field.label)}</Label>
                  <Input id={id} type={field.kind === 'text' ? 'text' : 'number'} inputMode={field.kind === 'text' ? 'text' : 'decimal'} step="any" value={String(raw ?? '')} disabled={!canWrite || busy} onChange={(event) => edit(field.path, event.target.value)} />
                </div>;
              })}
            </div>
          </section>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" disabled={!canWrite || busy} onClick={() => { void save(); }}><Save aria-hidden="true" />{copy('Save settings')}</Button>
            <Button type="button" variant="outline" disabled={busy} onClick={() => { void runPreview(); }}><Eye aria-hidden="true" />{copy('Preview')}</Button>
          </div>
          {preview && <div className="space-y-4 rounded-lg border border-border p-3">
            <div><h4 className="font-medium">{copy('Preview: statuses before and after')}</h4><p className="text-xs text-muted-foreground">{copy('Nothing is saved until you save.')}</p></div>
            <table className="w-full text-sm"><thead><tr className="text-muted-foreground"><th className="py-1 text-start font-normal">{copy('Status')}</th><th className="py-1 text-end font-normal">{copy('Before')}</th><th className="py-1 text-end font-normal">{copy('After')}</th></tr></thead>
              <tbody className="divide-y">{previewStatusOrder(preview).map((key) => <tr key={key}><td className="py-1.5">{isAlgorithmStatus(key) ? <span className="inline-flex items-center gap-1.5"><StatusIcon status={key} />{copy(ALGORITHM_STATUS_WORDS[key])}</span> : copy(key)}</td><td className="py-1.5 text-end tabular-nums text-muted-foreground">{(preview.statusCounts.before[key] ?? 0).toLocaleString('en-US')}</td><td className="py-1.5 text-end font-medium tabular-nums">{(preview.statusCounts.after[key] ?? 0).toLocaleString('en-US')}</td></tr>)}</tbody></table>
            <AlgorithmStatusLegend />
            {preview.learnedKeywords && <p className="text-sm text-muted-foreground">{copy('Learned words')}: {(preview.learnedKeywords.learnedNow ?? 0).toLocaleString('en-US')} {copy('Now')} · {(preview.learnedKeywords.wouldAssign ?? 0).toLocaleString('en-US')} {copy('Would be assigned')} · {(preview.learnedKeywords.wouldRemove ?? 0).toLocaleString('en-US')} {copy('Would be removed')}</p>}
            {!!preview.sampleFeed?.length && <div><h4 className="text-sm font-medium">{copy('Sample feed')}</h4><ol className="mt-1 space-y-1 text-sm">{preview.sampleFeed.slice(0, 10).map((row, at) => <li key={`${row.placeId}-${at}`} className="flex items-baseline gap-2"><span className="w-4 text-xs text-muted-foreground tabular-nums">{at + 1}</span><span className="min-w-0 flex-1 truncate" dir="auto">{pick(row.name, null)}</span><span className="text-xs text-muted-foreground">{copy(row.slot === 'fair' ? 'Fair chance' : row.slot === 'ad' ? 'Paid' : 'Hyped')}</span></li>)}</ol></div>}
          </div>}
        </>}
      </div>
    </SheetContent>
  </Sheet>;
}
