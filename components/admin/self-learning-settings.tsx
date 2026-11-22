'use client';

// Decision 0007 settings: how the search learns keywords, how actions are counted so no single visitor decides anything,
// and how long the website keeps its anonymous visitor ID. Stored with the algorithm settings (three groups), versioned.
import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { adminApi, AdminApiError } from '@/lib/api/admin-client';
import { useSubscriberResource } from '@/lib/api/hooks/use-subscriber-resource';
import { useDashboardLang } from '@/lib/dashboard-lang';
import { useDashboardReadOnly } from '@/components/auth/read-only-gate';
import { localeFor } from '@/lib/locale';
import { useFormChanges } from '@/lib/use-form-changes';
import { useDashboardCopy } from './dashboard-text';
import { FormActionBar } from './form-action-bar';
import { LoadingState, RequestError } from './subscriber-ui';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

const START = {
  learnedKeywords: { autoAssign: true, minVisitors: 5, minPickRatePercent: 30, tapPoints: 1, goPoints: 3, fadeDays: 30, maxWeightPercent: 70, fullEvidence: 30 },
  evidence: { oncePerVisitorPerDay: true, speedLimitPerMinute: 30, newVisitorWeight: 0.5, visitorCapPerPlacePerDay: 4, botFilter: true, networkVisitorLimit: 200 },
  webIdentity: { idLifetimeDays: 365, softRelink: false, softSignalKeepDays: 90 },
};
type Groups = typeof START;
type Group = keyof Groups;
type Row = { version: number; values: Record<string, unknown> & Partial<Groups> };
type Preview = { learnedKeywords?: { learnedNow: number; wouldAssign: number; wouldRemove: number } };
/** Every value is kept as the text in its box, so a half-typed number is never rewritten under the cursor. */
type Draft = { [G in Group]: Record<keyof Groups[G], string | boolean> };

type Control = { key: string; label: string; help: string; unit?: string };
const FORM: { group: Group; title: string; description: string; controls: Control[] }[] = [
  {
    group: 'learnedKeywords', title: 'Learned keywords', description: 'When a word customers search becomes a keyword of the place they pick. Team keywords always count fully and never fade.',
    controls: [
      { key: 'autoAssign', label: 'Learn keywords automatically', help: 'Off: nothing new is learned. Words already learned keep their weight and still fade.' },
      { key: 'minVisitors', label: 'Different visitors needed', help: 'A word is learned for a place only after this many different visitors picked it.', unit: 'visitors' },
      { key: 'minPickRatePercent', label: 'Pick rate needed', help: 'Of the searches for the word that showed the place, the share that picked it.', unit: '%' },
      { key: 'tapPoints', label: 'Evidence for a search tap', help: 'Points one tap on the place from the search results gives the word.', unit: 'points' },
      { key: 'goPoints', label: 'Evidence for going after the tap', help: 'Points added when the same visitor taps 5argny! or directions within 7 days.', unit: 'points' },
      { key: 'fadeDays', label: 'Fade after no taps for', help: 'Then the weight falls to 0 over the same number of days and the word is removed.', unit: 'days' },
      { key: 'maxWeightPercent', label: 'Most a learned word can weigh', help: 'As a share of a team keyword. At most 90, so the team’s keywords stay on top.', unit: '% of a team keyword' },
      { key: 'fullEvidence', label: 'Evidence for full weight', help: 'A learned word reaches its highest weight at this many points.', unit: 'points' },
    ],
  },
  {
    group: 'evidence', title: 'Evidence and abuse', description: 'How actions are counted, so one person cannot push a place or a word.',
    controls: [
      { key: 'oncePerVisitorPerDay', label: 'Count the same search tap once per visitor per day', help: 'Repeating the same search and tap on the same day adds nothing.' },
      { key: 'botFilter', label: 'Drop bots and datacenters', help: 'Automated browsers and addresses on the datacenter list are never counted.' },
      { key: 'speedLimitPerMinute', label: 'Speed limit', help: 'A visitor’s actions beyond this many in one minute are not counted.', unit: 'actions per minute' },
      { key: 'newVisitorWeight', label: 'Weight of a brand-new visitor', help: 'From 0 to 1. A visitor seen on 3 different days counts fully.', unit: 'of a full visitor' },
      { key: 'visitorCapPerPlacePerDay', label: 'Most one visitor adds to a word', help: 'Per place, per day, and in total: nobody lifts a word alone.', unit: 'points' },
      { key: 'networkVisitorLimit', label: 'Visitors from one network per day', help: 'Above this many, each of them counts for less. Phone networks share addresses, so keep it high.', unit: 'visitors' },
    ],
  },
  {
    group: 'webIdentity', title: 'Website visitor ID', description: 'The website keeps one anonymous ID per browser, so a returning visitor is counted as returning. No name, email or account.',
    controls: [
      { key: 'idLifetimeDays', label: 'Keep the visitor ID for', help: 'Renewed on every visit.', unit: 'days' },
      { key: 'softRelink', label: 'Recognise a browser that lost its ID', help: 'Uses a scrambled code of the browser, system, language, time zone and screen, only when exactly one earlier visitor matches.' },
      { key: 'softSignalKeepDays', label: 'Keep that scrambled code for', help: 'After this it is deleted.', unit: 'days' },
    ],
  },
];

const toDraft = (values: Row['values']): Draft => Object.fromEntries((Object.keys(START) as Group[]).map((group) => [group,
  Object.fromEntries(Object.entries({ ...START[group], ...values[group] }).map(([key, value]) => [key, typeof value === 'boolean' ? value : String(value)]))])) as Draft;
/** Text back to numbers; null when a box is empty or not a number. */
const toValues = (draft: Draft): Groups | null => {
  const out: Record<string, Record<string, number | boolean>> = {};
  for (const group of Object.keys(START) as Group[]) {
    out[group] = {};
    for (const [key, value] of Object.entries(draft[group])) {
      if (typeof value === 'boolean') { out[group][key] = value; continue; }
      const number = Number(value.trim());
      if (!value.trim() || !Number.isFinite(number)) return null;
      out[group][key] = number;
    }
  }
  return out as unknown as Groups;
};

export function SelfLearningSettings() {
  // the save bar belongs to the Settings tab only
  const active = useSearchParams().get('tab') === 'settings';
  const readOnly = useDashboardReadOnly();
  const copy = useDashboardCopy();
  const { lang } = useDashboardLang();
  const locale = localeFor(lang);
  const loadRow = React.useCallback(() => adminApi.get<Row>('/v1/admin/algorithm/settings'), []);
  const resource = useSubscriberResource(loadRow);
  const saved = React.useMemo(() => resource.data ? toDraft(resource.data.values) : null, [resource.data]);
  // what is typed since the last load or save; null means nothing changed
  const [edited, setEdited] = React.useState<Draft | null>(null);
  const draft = edited ?? saved;
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const [preview, setPreview] = React.useState<Preview['learnedKeywords'] | null>(null);
  const [previewing, setPreviewing] = React.useState(false);
  const changes = useFormChanges(draft, saved);
  const id = React.useId();

  if (resource.error) return <RequestError message={copy('Could not load the self-learning settings.')} retry={() => { void resource.refetch(); }} />;
  if (!draft) return <LoadingState />;
  const values = toValues(draft);
  const set = (group: Group, key: string, value: string | boolean) => { setError(''); setPreview(null); setEdited({ ...draft, [group]: { ...draft[group], [key]: value } }); };
  const problem = (caught: unknown) => caught instanceof AdminApiError && caught.status === 403 ? copy('Only a super admin can save these settings.') : caught instanceof AdminApiError && caught.status === 400 ? caught.message : copy('Could not save the settings. Try again.');
  // the page's other settings card saves the same record: read the newest version and change only these three groups
  const merged = async () => ({ ...(await adminApi.get<Row>('/v1/admin/algorithm/settings')).values, ...values });

  const save = async () => {
    if (!values) return;
    setSaving(true); setError('');
    try {
      await adminApi.put<Row>('/v1/admin/algorithm/settings', { values: await merged(), note: 'self-learning search' });
      await resource.refetch();
      setEdited(null); setPreview(null);
      toast.success(copy('Saved. The search uses these values from the next check, within the hour.'));
    } catch (caught) { setError(problem(caught)); } finally { setSaving(false); }
  };
  const runPreview = async () => {
    if (!values) return;
    setPreviewing(true); setError('');
    try { setPreview((await adminApi.post<Preview>('/v1/admin/algorithm/preview', { values: await merged() })).learnedKeywords ?? null); }
    catch (caught) { setError(caught instanceof AdminApiError && caught.status === 400 ? caught.message : copy('Could not preview these values. Try again.')); }
    finally { setPreviewing(false); }
  };

  return <div className="space-y-6">
    {FORM.map(({ group, title, description, controls }) => <Card key={group}>
      <CardHeader className="flex flex-wrap items-start justify-between gap-3"><div className="space-y-1.5"><CardTitle>{copy(title)}</CardTitle><CardDescription className="max-w-2xl">{copy(description)}</CardDescription></div>
        {group === 'learnedKeywords' && !readOnly && <Button type="button" variant="outline" onClick={() => { void runPreview(); }} disabled={!values || previewing || saving} title={values ? undefined : copy('Fill every number first.')}>{copy(previewing ? 'Previewing…' : 'Preview these values')}</Button>}</CardHeader>
      <CardContent className="space-y-5">
        {group === 'learnedKeywords' && preview && <dl className="grid grid-cols-3 gap-4 rounded-lg bg-muted px-4 py-3 text-sm" aria-live="polite">
          {([['Learned now', preview.learnedNow], ['Would be learned', preview.wouldAssign], ['Would be removed', preview.wouldRemove]] as const).map(([label, value]) => <div key={label}><dt className="text-muted-foreground">{copy(label)}</dt><dd className="text-lg font-semibold tabular-nums">{value.toLocaleString(locale)}</dd></div>)}
        </dl>}
        <div className="grid gap-x-8 gap-y-5 lg:grid-cols-2">{controls.map(({ key, label, help, unit }) => {
          const value = (draft[group] as Record<string, string | boolean>)[key];
          const controlId = `${id}-${group}-${key}`;
          return typeof value === 'boolean'
            ? <div key={key} className="flex items-start justify-between gap-4 lg:col-span-2"><div className="space-y-1"><Label htmlFor={controlId}>{copy(label)}</Label><p id={`${controlId}-help`} className="max-w-xl text-sm text-muted-foreground">{copy(help)}</p></div>
              <Switch id={controlId} aria-describedby={`${controlId}-help`} checked={value} onCheckedChange={(on: boolean) => set(group, key, on)} /></div>
            : <div key={key} className="space-y-2"><Label htmlFor={controlId}>{copy(label)}</Label>
              <div className="flex items-center gap-2"><Input id={controlId} className="w-24 tabular-nums" dir="ltr" inputMode="decimal" autoComplete="off" value={value} aria-describedby={`${controlId}-help`} aria-invalid={!value.trim() || !Number.isFinite(Number(value)) || undefined} onChange={(event) => set(group, key, event.target.value)} />
                {unit && <span className="text-sm text-muted-foreground">{copy(unit)}</span>}</div>
              <p id={`${controlId}-help`} className="max-w-md text-sm text-muted-foreground">{copy(help)}</p></div>;
        })}</div>
      </CardContent></Card>)}
    {!readOnly && <FormActionBar active={active} dirty={changes.dirty} saving={saving} error={error} disabled={!values} disabledReason={values ? undefined : copy('Fill every number first.')} onSave={() => { void save(); }}
      cancelHref="/dashboard/algorithm/demand" primaryLabel={copy('Save search settings')} />}
  </div>;
}
