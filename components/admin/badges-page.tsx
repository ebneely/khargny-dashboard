'use client';

import * as React from 'react';
import { Award } from 'lucide-react';
import { toast } from 'sonner';

import { PageActions, type PageAction } from './page-actions';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UrlTabs, UrlTabsContent } from '@/components/ui/url-tabs';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminApiError } from '@/lib/api/admin-client';
import { badgesApi, type BadgeKey, type BadgeOverride, type ManagedBadge } from '@/lib/api/badges';
import { loadAllCities } from '@/lib/api/hooks/use-admin-cities';
import type { AdminCity } from '@/lib/api/types';
import type { SubscriberPlace } from '@/lib/api/subscribers';
import { useSubscriberResource } from '@/lib/api/hooks/use-subscriber-resource';
import { useUrlTab } from '@/lib/use-url-tab';
import { dashboardDate } from '@/lib/dashboard-date';
import { badgeMetric, ruleControls, ruleFromControls, statusBadgeRules, type RuleControls } from '@/lib/badge-rules';
import { useDashboardCopy } from './dashboard-text';
import { FilterSelect } from './filter-bar';
import { RecordList, useListAddress } from './record-list';
import { RecordCell } from './record-cell';
import { DateCell } from './date-cell';
import { FormActionBar } from './form-action-bar';
import { BadgeIcon } from './badge-icon';
import { BadgeRuleFields } from './badge-rule-fields';
import { BadgeHolders } from './badge-holders';
import { BadgeOverrides } from './badge-overrides';
import { BadgeOverrideDialog } from './badge-override-dialog';
import { BadgeWordingDialog } from './badge-wording-dialog';
import { ActionDialog, type ActionSpec, LoadingState, RequestError, StatusBadge, useSubscriberText } from './subscriber-ui';

export function BadgesPage({ canWrite }: { canWrite: boolean }) {
  return <React.Suspense fallback={<LoadingState />}><BadgesContent canWrite={canWrite} /></React.Suspense>;
}
function BadgesContent({ canWrite }: { canWrite: boolean }) {
  const copy = useDashboardCopy();
  const { lang, pick } = useSubscriberText();
  const tab = useUrlTab(['status', 'achievements', 'overrides']);
  const load = React.useCallback(() => badgesApi.catalogue(), []);
  const resource = useSubscriberResource(load);
  const loadCities = React.useCallback(() => loadAllCities(), []);
  const cities = useSubscriberResource(loadCities);
  const address = useListAddress('badges');
  const cityId = address.get('city');
  const [drafts, setDrafts] = React.useState<Record<string, RuleControls>>({});
  const [ruleErrors, setRuleErrors] = React.useState<Record<string, string>>({});
  const [error, setError] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [toggleKey, setToggleKey] = React.useState<BadgeKey | null>(null);
  const writing = React.useRef(false);
  const [wording, setWording] = React.useState<ManagedBadge | null>(null);
  const [override, setOverride] = React.useState<{ badgeKey: BadgeKey; place: SubscriberPlace } | true | null>(null);
  const [action, setAction] = React.useState<ActionSpec | null>(null);
  const [revision, setRevision] = React.useState(0);
  const [pending, setPending] = React.useState(false);
  const [notice, setNotice] = React.useState('');
  const polling = React.useRef(0);
  React.useEffect(() => () => { polling.current++; }, []);
  const catalogue = resource.data;
  const writable = canWrite && !resource.savedRefreshFailed;
  const dirty = catalogue?.data.filter((badge) => badge.rule && drafts[badge.key] && JSON.stringify(drafts[badge.key]) !== JSON.stringify(ruleControls(badge.rule))) ?? [];
  const watch = async (previousId?: string) => {
    const generation = ++polling.current;
    const deadline = Date.now() + 60000;
    setPending(true); setNotice('Saved. The holders are being recalculated');
    try {
      while (Date.now() < deadline) {
        await new Promise((resolve) => window.setTimeout(resolve, 2000));
        if (generation !== polling.current) return;
        const next = await badgesApi.catalogue();
        if (generation !== polling.current) return;
        if (next.lastRun?.id !== previousId && next.lastRun?.finishedAt) {
          setRevision((value) => value + 1); await resource.refetch();
          if (generation === polling.current) setNotice(next.lastRun.error ? 'Run failed; previous awards are kept.' : 'Run completed');
          return;
        }
      }
      if (generation === polling.current) setNotice('Recalculation is still pending. Refresh to check again.');
    } catch { if (generation === polling.current) setNotice('Recalculation is still pending. Refresh to check again.'); }
    finally { if (generation === polling.current) setPending(false); }
  };
  const refreshAfterWrite = async (recalculate = true) => {
    const previousId = catalogue?.lastRun?.id;
    const ok = await resource.refreshAfterSave();
    setRevision((value) => value + 1);
    if (recalculate && ok) void watch(previousId);
    return ok;
  };
  const toggle = async (badge: ManagedBadge, enabled: boolean) => {
    if (!writable || writing.current) return;
    writing.current = true; setToggleKey(badge.key); setError('');
    try { await badgesApi.update(badge.key, { enabled }); toast.success(copy('Saved')); await refreshAfterWrite(true); }
    catch { setError(copy('Could not save this badge. Try again.')); }
    finally { writing.current = false; setToggleKey(null); }
  };
  const saveRules = async () => {
    if (!writable || writing.current || !dirty.length) return;
    const invalid: Record<string, string> = {};
    for (const badge of dirty) { try { ruleFromControls(badge.key, drafts[badge.key]); } catch { invalid[badge.key] = copy('Use 1–10 winners and a whole-number minimum of at least 1.'); } }
    setRuleErrors(invalid); if (Object.keys(invalid).length) return;
    writing.current = true; setBusy(true); setError('');
    let saved = false;
    for (const badge of dirty) {
      try {
        await badgesApi.update(badge.key, { rule: ruleFromControls(badge.key, drafts[badge.key]) }); saved = true;
        setDrafts((current) => { const remaining = { ...current }; delete remaining[badge.key]; return remaining; });
      } catch (caught) {
        setRuleErrors((current) => ({ ...current, [badge.key]: caught instanceof AdminApiError && Object.keys(caught.fields).length ? Object.values(caught.fields).join(' · ') : copy('Could not save this badge. Try again.') }));
        setError(copy('Could not save this badge. Try again.')); break;
      }
    }
    if (saved) { toast.success(copy('Saved. The holders are being recalculated')); await refreshAfterWrite(); }
    writing.current = false; setBusy(false);
  };
  const remove = (row: BadgeOverride) => {
    if (!writable || writing.current) return;
    setAction({ title: copy('Remove override?'), description: copy('This removes the team decision. The badge will follow its rule again after recalculation.'), fields: [], destructive: true, submit: async () => { if (!canWrite) return; await badgesApi.removeOverride(row.badgeKey, row.id); toast.success(copy('Saved. The holders are being recalculated')); await refreshAfterWrite(); } });
  };
  const runNow = () => {
    if (!writable || writing.current) return;
    setAction({ title: copy('Recalculate achievement badges now?'), description: copy('This replaces earned awards using current rules and overrides. Existing awards remain if calculation fails.'), fields: [], submit: async () => {
      if (!canWrite) return;
      try { await badgesApi.recompute(); await resource.refetch(); setRevision((value) => value + 1); toast.success(copy('Run completed')); }
      catch (caught) { await resource.refetch(); throw new AdminApiError(caught instanceof AdminApiError ? caught.status : 500, { error: { code: caught instanceof AdminApiError && caught.status === 409 ? 'BADGE_RUN_BUSY' : 'BADGE_RUN_FAILED' } }); }
    } });
  };
  const runActions: PageAction[] = [{ label: 'Refresh', readOnly: true, onClick: () => { setRevision((value) => value + 1); void resource.refetch(); } }, { label: 'Run now', allowed: writable, disabled: pending || busy || !!toggleKey, onClick: runNow }];
  if (!catalogue && resource.loading) return <LoadingState />;
  if (!catalogue && resource.error) return <RequestError message={copy(resource.error instanceof AdminApiError && resource.error.status === 404 ? 'Badges are not available on this server yet' : 'Could not load badges. Try again.')} retry={() => { void resource.refetch(); }} />;
  if (!catalogue) return null;
  const badges = [...catalogue.data].sort((first, second) => first.sortOrder - second.sortOrder || first.key.localeCompare(second.key));
  const card = (badge: ManagedBadge) => <BadgeCard key={badge.key} badge={badge} cityId={cityId} cities={cities.data?.items ?? []} revision={revision} canWrite={writable} switching={busy || !!toggleKey} fields={drafts[badge.key] ?? (badge.rule ? ruleControls(badge.rule) : null)} error={ruleErrors[badge.key]} onRuleChange={(fields) => { setDrafts((current) => ({ ...current, [badge.key]: fields })); setRuleErrors((current) => ({ ...current, [badge.key]: '' })); }} onToggle={(enabled) => { void toggle(badge, enabled); }} onEdit={() => { if (!writing.current) setWording(badge); }} onExclude={(place) => { if (!writing.current) setOverride({ badgeKey: badge.key, place }); }} onRemovePin={remove} />;
  return <div className="min-w-0 space-y-6" dir={lang === 'ar' ? 'rtl' : 'ltr'}><header><h1 className="flex items-center gap-2 font-display text-2xl font-semibold"><Award className="size-5 text-primary" aria-hidden="true" />{copy('Badges')}</h1><p className="mt-1 max-w-2xl text-sm text-muted-foreground">{copy('The marks a place can carry on the website and the app. Status badges are given by the team; achievement badges are earned from visitor activity.')}</p></header>
    {error && <RequestError message={error} />}{resource.savedRefreshFailed && <RequestError message={copy('Saved, but the page could not refresh')} retry={() => { void resource.refetch(); }} />}
    <UrlTabs values={['status', 'achievements', 'overrides']}><TabsList aria-label={copy('Badge sections')}><TabsTrigger value="status">{copy('Status badges')}</TabsTrigger><TabsTrigger value="achievements">{copy('Achievement badges')}</TabsTrigger><TabsTrigger value="overrides">{copy('Overrides')}</TabsTrigger></TabsList>
      {tab.value !== 'overrides' && <div className="mt-6 max-w-sm"><FilterSelect label="City" value={cityId || 'all'} onValueChange={(value) => address.change('city', value === 'all' ? '' : value)} options={[{ value: 'all', label: copy('All cities') }, ...(cities.data?.items ?? []).map((city) => ({ value: city.id, label: pick(city.name, city.nameEn) }))]} />{cities.error && <RequestError message={copy('Could not load cities. Try again.')} retry={() => { void cities.refetch(); }} />}</div>}
      <UrlTabsContent value="status" className="space-y-6"><RecordList scope="status-badges" records={badges.filter((badge) => badge.family === 'status')} searchText={(badge) => `${badge.nameAr} ${badge.nameEn} ${badge.descriptionAr} ${badge.descriptionEn}`} filters={[{ key: 'enabled', label: 'All badge states', options: [{ value: 'yes', label: 'Enabled' }, { value: 'no', label: 'Hidden everywhere' }], value: (badge) => badge.enabled ? 'yes' : 'no' }]} render={(visible) => <div className="space-y-6">{visible.map(card)}</div>} /></UrlTabsContent>
      <UrlTabsContent value="achievements" className="space-y-6"><Card><CardHeader className="flex flex-wrap items-center justify-between gap-3"><CardTitle>{copy('Last run')}</CardTitle><PageActions form={dirty.length > 0} actions={runActions} /></CardHeader><CardContent className="space-y-3 text-sm">
        {catalogue.lastRun ? <><p>{dashboardDate(catalogue.lastRun.finishedAt ?? catalogue.lastRun.startedAt, lang, true)} · {copy(catalogue.lastRun.trigger === 'manual' ? 'Manual calculation' : 'Automatic calculation')}</p><p className={catalogue.lastRun.error ? 'text-destructive' : undefined}>{copy(catalogue.lastRun.error ? 'Run failed; previous awards are kept.' : catalogue.lastRun.finishedAt ? 'Run completed' : 'Run in progress')} · {copy('Candidates')}: {(catalogue.lastRun.counts?.candidates ?? 0).toLocaleString(lang)} · {copy('Awards')}: {(catalogue.lastRun.counts?.awards ?? 0).toLocaleString(lang)}</p></> : <p>{copy('No run recorded yet')}</p>}
        <p className="text-muted-foreground">{copy('Calculated through yesterday in Cairo. The next read may start a refresh; this is not a timed schedule.')}</p><p className="text-muted-foreground">{copy('Next check day')}: <DateCell value={catalogue.nextDue.day} /> · {catalogue.nextDue.timezone}{catalogue.nextDue.dueNow && <> · {copy('Refresh due on read')}</>}</p>{notice && <p role="status">{copy(notice)}</p>}
      </CardContent></Card><RecordList scope="achievement-badges" records={badges.filter((badge) => badge.family === 'achievement')} searchText={(badge) => `${badge.nameAr} ${badge.nameEn} ${badge.descriptionAr} ${badge.descriptionEn}`} filters={[{ key: 'enabled', label: 'All badge states', options: [{ value: 'yes', label: 'Enabled' }, { value: 'no', label: 'Hidden everywhere' }], value: (badge) => badge.enabled ? 'yes' : 'no' }]} render={(visible) => <div className="space-y-6">{visible.map(card)}</div>} /></UrlTabsContent>
      <UrlTabsContent value="overrides" lazy><BadgeOverrides badges={badges} revision={revision} canWrite={writable} onAdd={() => { if (!writing.current) setOverride(true); }} onRemove={remove} /></UrlTabsContent>
    </UrlTabs>
    {canWrite && <FormActionBar extraActions={<PageActions form actions={runActions} />} active={tab.value === 'achievements' && dirty.length > 0} dirty={dirty.length > 0} saving={busy} disabled={!writable || !!toggleKey} disabledReason={dirty.map((badge) => `${pick(badge.nameAr, badge.nameEn)}: ${copy('rule changed')}`).join(' · ')} error={error} primaryLabel={copy('Save rules')} onSave={() => { void saveRules(); }} onCancel={() => { setDrafts({}); setRuleErrors({}); setError(''); }} />}
    {wording && writable && <BadgeWordingDialog badge={wording} canWrite={writable} refresh={() => refreshAfterWrite(false)} onClose={() => setWording(null)} />}
    {override && writable && <BadgeOverrideDialog badges={badges.filter((badge) => badge.family === 'achievement')} canWrite={writable} initial={override === true ? undefined : override} refresh={async () => { await refreshAfterWrite(); }} onClose={() => setOverride(null)} />}
    <ActionDialog action={action} onClose={() => setAction(null)} />
  </div>;
}
function BadgeCard({ badge, cityId, cities, revision, canWrite, switching, fields, error, onRuleChange, onToggle, onEdit, onExclude, onRemovePin }: { badge: ManagedBadge; cityId: string; cities: AdminCity[]; revision: number; canWrite: boolean; switching: boolean; fields: RuleControls | null; error?: string; onRuleChange: (fields: RuleControls) => void; onToggle: (enabled: boolean) => void; onEdit: () => void; onExclude: (place: SubscriberPlace) => void; onRemovePin: (override: BadgeOverride) => void }) {
  const copy = useDashboardCopy();
  const { lang } = useSubscriberText();
  const [expanded, setExpanded] = React.useState(false);
  const switchId = React.useId();
  let previewRule = null;
  try { if (fields) previewRule = ruleFromControls(badge.key, fields); } catch { }
  const holders = <BadgeHolders badge={badge} cityId={cityId} cities={cities} revision={revision} canWrite={canWrite} previewRule={previewRule} onExclude={onExclude} onRemovePin={onRemovePin} />;
  return <Card className="min-w-0"><CardHeader className="flex flex-wrap items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><BadgeIcon icon={badge.icon} /><RecordCell nameAr={badge.nameAr} nameEn={badge.nameEn} chips={<StatusBadge status={badge.enabled ? 'active' : 'inactive'}>{copy(badge.enabled ? 'Shown' : 'Hidden')}</StatusBadge>} /></div>{canWrite && <div className="flex flex-wrap items-center gap-3"><label htmlFor={switchId} className="flex items-center gap-2 text-sm"><Switch id={switchId} checked={badge.enabled} disabled={switching} onCheckedChange={onToggle} />{copy('Show on the website and app')}</label><PageActions form actions={[{ label: 'Edit wording', disabled: switching, onClick: onEdit }]} /></div>}</CardHeader>
    <CardContent className="min-w-0 space-y-4">{!badge.enabled && <p className="text-sm text-muted-foreground">{copy('Hidden everywhere. Places keep the badge and it returns when you switch this on.')}</p>}<p className="text-sm text-muted-foreground">{copy('Places holding it')}: {badge.holderCount.toLocaleString(lang)}</p>
      {badge.family === 'status' ? <><p className="text-sm">{copy('How a place gets it')}: {copy(statusBadgeRules[badge.key as keyof typeof statusBadgeRules])}</p><details onToggle={(event) => setExpanded(event.currentTarget.open)}><summary className="cursor-pointer text-sm font-medium">{copy('Holders now')}</summary><div className="mt-4">{expanded && holders}</div></details></> : <>
        {canWrite && fields ? <BadgeRuleFields disabled={switching} badge={badge} value={fields} onChange={onRuleChange} error={error || (!previewRule ? copy('Use 1–10 winners and a whole-number minimum of at least 1.') : undefined)} /> : badge.rule && <p className="text-sm">{copy('Give it to the top')} {badge.rule.winners.toLocaleString(lang)} {copy('places in each')} {copy(badge.rule.scope === 'city' ? 'City' : 'City and category')} {copy('by')} {copy(badgeMetric[badge.rule.measure])} {copy('over')} {badge.rule.windowDays === null ? copy('All time') : `${badge.rule.windowDays.toLocaleString(lang)} ${copy('days')}`} {copy('if they have at least')} {badge.rule.floor.toLocaleString(lang)}.</p>}
        {holders}
      </>}
      {canWrite && badge.family === 'status' && <p className="text-sm text-muted-foreground">{copy('Changes are live at once')}</p>}
    </CardContent>
  </Card>;
}
