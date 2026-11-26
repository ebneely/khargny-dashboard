'use client';

/**
 * Settings → App: the remote config the mobile app reads at start
 * (GET /v1/app-config). The order of Home's sections, the three feature
 * switches and the store-rating prompt. A save shows on the next app start.
 */

import * as React from 'react';
import { toast } from 'sonner';
import {
  ArrowDown,
  ArrowUp,
  Award,
  Compass,
  Eye,
  EyeOff,
  GripVertical,
  Layers,
  MapPin,
  Sparkles,
  Smartphone,
  Star,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { ContentSkeleton } from './content-skeleton';
import { FormActionBar } from './form-action-bar';
import { useDashboardCopy } from './dashboard-text';
import { adminApi, type AdminApiError } from '@/lib/api/admin-client';
import { useFormChanges } from '@/lib/use-form-changes';
import {
  DEFAULT_APP_CONFIG,
  HOME_SECTION_IDS,
  displayOrder,
  enabledSections,
  normaliseAppConfig,
  reviewNumberError,
  type AppConfig,
  type FeatureId,
  type HomeSectionId,
} from '@/lib/app-config';

type SectionMeta = {
  id: HomeSectionId;
  label: string;
  description: string;
  Icon: LucideIcon;
};

const SECTIONS: SectionMeta[] = [
  {
    id: 'stories',
    label: 'Stories',
    description: 'The short visual stories at the top of Home.',
    Icon: Sparkles,
  },
  {
    id: 'takeme',
    label: 'Take me out',
    description: 'One place picked for the person right now.',
    Icon: Compass,
  },
  {
    id: 'near',
    label: 'Near you',
    description: 'Places close to where the person is.',
    Icon: MapPin,
  },
  {
    id: 'earned',
    label: 'Earned on 5argny',
    description: 'Places people loved, saved and visited.',
    Icon: Award,
  },
  {
    id: 'collections',
    label: 'Collections by 5argny',
    description: 'Curated lists from the editorial team.',
    Icon: Layers,
  },
  {
    id: 'social',
    label: '5argny Social',
    description: 'The endless feed at the end of Home.',
    Icon: Users,
  },
];

const SECTION_BY_ID = new Map(SECTIONS.map((section) => [section.id, section]));

const FEATURES: { id: FeatureId; label: string; description: string }[] = [
  {
    id: 'rising',
    label: 'Rising',
    description: 'Show the Rising list of places gaining attention.',
  },
  {
    id: 'marketplace',
    label: 'Marketplace',
    description: 'Show the Marketplace tab in the app.',
  },
  {
    id: 'onboarding',
    label: 'Onboarding',
    description: 'Show the first-run tour to new people.',
  },
];

const allOff = (): Record<HomeSectionId, boolean> => ({
  stories: false,
  takeme: false,
  near: false,
  earned: false,
  collections: false,
  social: false,
});

const allOn = (): Record<HomeSectionId, boolean> => {
  const out = allOff();
  for (const id of HOME_SECTION_IDS) out[id] = true;
  return out;
};

const enabledMap = (sections: readonly HomeSectionId[]) => {
  const out = allOff();
  for (const id of sections) out[id] = true;
  return out;
};

export function AppSettingsPage({ canWrite }: { canWrite: boolean }) {
  const copy = useDashboardCopy();

  const [order, setOrder] = React.useState<HomeSectionId[]>([]);
  const [enabled, setEnabled] = React.useState<Record<HomeSectionId, boolean>>(allOn);
  const [features, setFeatures] = React.useState(DEFAULT_APP_CONFIG.features);
  const [review, setReview] = React.useState({
    enabled: DEFAULT_APP_CONFIG.reviewPrompt.enabled,
    afterActions: String(DEFAULT_APP_CONFIG.reviewPrompt.afterActions),
    cooldownDays: String(DEFAULT_APP_CONFIG.reviewPrompt.cooldownDays),
  });
  const [copyMap, setCopyMap] = React.useState<Record<string, string>>({});
  const [original, setOriginal] = React.useState<AppConfig | null>(null);

  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const [dragged, setDragged] = React.useState<HomeSectionId | null>(null);

  const load = React.useCallback((config: AppConfig) => {
    setOrder(displayOrder(config.home.sections));
    setEnabled(enabledMap(config.home.sections));
    setFeatures(config.features);
    setReview({
      enabled: config.reviewPrompt.enabled,
      afterActions: String(config.reviewPrompt.afterActions),
      cooldownDays: String(config.reviewPrompt.cooldownDays),
    });
    setCopyMap(config.copy);
  }, []);

  const fetchConfig = React.useCallback(
    () =>
      adminApi
        .get<AppConfig>('/v1/admin/app-config')
        .then((raw) => {
          const config = normaliseAppConfig(raw);
          load(config);
          setOriginal(config);
        })
        .catch(() => setLoadError(true))
        .finally(() => setLoading(false)),
    [load],
  );

  React.useEffect(() => {
    void fetchConfig();
  }, [fetchConfig]);

  const afterActionsError = reviewNumberError('afterActions', review.afterActions);
  const cooldownDaysError = reviewNumberError('cooldownDays', review.cooldownDays);

  const body: AppConfig = React.useMemo(
    () => ({
      home: { sections: enabledSections(order, enabled) },
      features: {
        rising: features.rising,
        marketplace: features.marketplace,
        onboarding: features.onboarding,
      },
      reviewPrompt: {
        enabled: review.enabled,
        afterActions: afterActionsError ? 0 : Number(review.afterActions),
        cooldownDays: cooldownDaysError ? 0 : Number(review.cooldownDays),
      },
      copy: copyMap,
    }),
    [order, enabled, features, review, afterActionsError, cooldownDaysError, copyMap],
  );

  const form = useFormChanges(body, original);
  const invalid = afterActionsError || cooldownDaysError;

  const move = (id: HomeSectionId, delta: number) => {
    setOrder((current) => {
      const from = current.indexOf(id);
      const to = from + delta;
      if (from < 0 || to < 0 || to >= current.length) return current;
      const next = [...current];
      [next[from], next[to]] = [next[to], next[from]];
      return next;
    });
  };

  const dropOn = (target: HomeSectionId) => {
    const source = dragged;
    setDragged(null);
    if (!source || source === target) return;
    setOrder((current) => {
      const from = current.indexOf(source);
      const to = current.indexOf(target);
      if (from < 0 || to < 0) return current;
      const next = [...current];
      next.splice(from, 1);
      next.splice(to, 0, source);
      return next;
    });
  };

  const save = async () => {
    if (!canWrite || invalid || !original) return;
    setSaving(true);
    setError('');
    try {
      const raw = await adminApi.put<AppConfig>('/v1/admin/app-config', body);
      const saved = normaliseAppConfig(raw);
      load(saved);
      setOriginal(saved);
      toast.success(copy('Saved. Changes show on the next app start.'));
    } catch (caught) {
      const message = (caught as AdminApiError).message || copy('Could not save the app settings.');
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6" data-slot="app-settings-page">
      <div>
        <h1 className="flex items-center gap-2 font-display text-2xl font-semibold text-foreground">
          <Smartphone className="size-5 text-primary" aria-hidden="true" />
          {copy('App')}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {copy('Home order, feature switches and the rating prompt in the mobile app.')}
        </p>
        <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
          {copy('The app reads these settings when it starts, so a change shows on the next app start.')}
        </p>
        {!canWrite && (
          <p className="mt-3 text-sm text-muted-foreground">
            {copy('Your role can view these settings but not change them.')}
          </p>
        )}
      </div>

      {loading ? (
        <Card>
          <CardContent>
            <ContentSkeleton />
          </CardContent>
        </Card>
      ) : loadError ? (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
            <p role="alert" className="text-sm text-muted-foreground">
              {copy('Could not load the app settings.')}
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setLoading(true);
                setLoadError(false);
                void fetchConfig();
              }}
            >
              {copy('Try again')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{copy('Home sections')}</CardTitle>
              <CardDescription>{copy('The order the app shows them, and which ones appear on Home.')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul
                className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground"
                aria-label={copy('Icon legend')}
              >
                <li className="flex items-center gap-1.5">
                  <GripVertical className="size-3.5" aria-hidden="true" />
                  {copy('Drag to reorder')}
                </li>
                <li className="flex items-center gap-1.5">
                  <Eye className="size-3.5" aria-hidden="true" />
                  {copy('Shown on Home')}
                </li>
                <li className="flex items-center gap-1.5">
                  <EyeOff className="size-3.5" aria-hidden="true" />
                  {copy('Hidden from Home')}
                </li>
                <li className="flex items-center gap-1.5">
                  <ArrowUp className="size-3.5" aria-hidden="true" />
                  <ArrowDown className="size-3.5" aria-hidden="true" />
                  {copy('Move with the keyboard')}
                </li>
              </ul>

              <ul className="divide-y divide-border">
                {order.map((id, index) => {
                  const section = SECTION_BY_ID.get(id);
                  if (!section) return null;
                  const Icon = section.Icon;
                  const shown = enabled[id];
                  return (
                    <li
                      key={id}
                      draggable={canWrite && !saving}
                      onDragStart={() => setDragged(id)}
                      onDragOver={(event) => {
                        if (canWrite) event.preventDefault();
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        dropOn(id);
                      }}
                      onDragEnd={() => setDragged(null)}
                      className="flex min-h-16 items-center gap-3 py-2"
                    >
                      <span
                        className="shrink-0 cursor-grab text-muted-foreground"
                        title={copy('Drag to reorder')}
                        aria-hidden="true"
                      >
                        <GripVertical className="size-4" />
                      </span>
                      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-primary">
                        <Icon className="size-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground">{copy(section.label)}</p>
                        <p className="text-xs text-muted-foreground">{copy(section.description)}</p>
                      </div>
                      <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
                        {shown ? (
                          <Eye className="size-3.5" aria-hidden="true" />
                        ) : (
                          <EyeOff className="size-3.5" aria-hidden="true" />
                        )}
                        {copy(shown ? 'Shown' : 'Hidden')}
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          aria-label={copy('Move up')}
                          title={copy('Move up')}
                          disabled={!canWrite || saving || index === 0}
                          onClick={() => move(id, -1)}
                        >
                          <ArrowUp aria-hidden="true" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          aria-label={copy('Move down')}
                          title={copy('Move down')}
                          disabled={!canWrite || saving || index === order.length - 1}
                          onClick={() => move(id, 1)}
                        >
                          <ArrowDown aria-hidden="true" />
                        </Button>
                        <Switch
                          checked={shown}
                          disabled={!canWrite || saving}
                          onCheckedChange={(checked) =>
                            setEnabled((current) => ({
                              ...current,
                              [id]: Boolean(checked),
                            }))
                          }
                          aria-label={`${copy(section.label)}: ${copy('on Home')}`}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{copy('Features')}</CardTitle>
              <CardDescription>{copy('Turn a part of the app on or off for everyone.')}</CardDescription>
            </CardHeader>
            <CardContent className="divide-y divide-border">
              {FEATURES.map((feature) => (
                <div key={feature.id} className="flex min-h-16 items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{copy(feature.label)}</p>
                    <p className="text-xs text-muted-foreground">{copy(feature.description)}</p>
                  </div>
                  <span className="hidden text-xs text-muted-foreground sm:block">
                    {copy(features[feature.id] ? 'On' : 'Off')}
                  </span>
                  <Switch
                    checked={features[feature.id]}
                    disabled={!canWrite || saving}
                    onCheckedChange={(checked) =>
                      setFeatures((current) => ({
                        ...current,
                        [feature.id]: Boolean(checked),
                      }))
                    }
                    aria-label={`${copy(feature.label)}: ${copy('feature')}`}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{copy('Rating prompt')}</CardTitle>
              <CardDescription>{copy('When the app asks a happy person for a store rating.')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex min-h-16 items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                    <Star className="size-4 text-primary" aria-hidden="true" />
                    {copy('Ask for a rating')}
                  </p>
                  <p className="text-xs text-muted-foreground">{copy('Show the in-app rating request at all.')}</p>
                </div>
                <span className="hidden text-xs text-muted-foreground sm:block">
                  {copy(review.enabled ? 'On' : 'Off')}
                </span>
                <Switch
                  checked={review.enabled}
                  disabled={!canWrite || saving}
                  onCheckedChange={(checked) =>
                    setReview((current) => ({
                      ...current,
                      enabled: Boolean(checked),
                    }))
                  }
                  aria-label={copy('Ask for a rating')}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="review-after-actions">{copy('After how many happy moments')}</Label>
                  <Input
                    id="review-after-actions"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={100}
                    step={1}
                    value={review.afterActions}
                    disabled={!canWrite || saving || !review.enabled}
                    aria-invalid={afterActionsError}
                    aria-describedby="review-after-actions-help"
                    onChange={(event) =>
                      setReview((current) => ({
                        ...current,
                        afterActions: event.target.value,
                      }))
                    }
                  />
                  <p
                    id="review-after-actions-help"
                    className={afterActionsError ? 'text-xs text-destructive' : 'text-xs text-muted-foreground'}
                  >
                    {afterActionsError
                      ? copy('Enter a whole number from 1 to 100.')
                      : copy('A 5argny! tap or a saved place counts as one.')}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="review-cooldown">{copy('Days between asks')}</Label>
                  <Input
                    id="review-cooldown"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={365}
                    step={1}
                    value={review.cooldownDays}
                    disabled={!canWrite || saving || !review.enabled}
                    aria-invalid={cooldownDaysError}
                    aria-describedby="review-cooldown-help"
                    onChange={(event) =>
                      setReview((current) => ({
                        ...current,
                        cooldownDays: event.target.value,
                      }))
                    }
                  />
                  <p
                    id="review-cooldown-help"
                    className={cooldownDaysError ? 'text-xs text-destructive' : 'text-xs text-muted-foreground'}
                  >
                    {cooldownDaysError
                      ? copy('Enter a whole number from 1 to 365.')
                      : copy('The same person is not asked again before these days pass.')}
                  </p>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                {copy('The app never asks in the first session, and at most once per session.')}
              </p>
            </CardContent>
          </Card>

          <FormActionBar
            dirty={form.dirty}
            saving={saving}
            error={error}
            disabled={!canWrite || invalid}
            disabledReason={
              !canWrite
                ? copy('Your role can view these settings but not change them.')
                : invalid
                  ? copy('Fix the rating numbers before saving.')
                  : undefined
            }
            onSave={() => {
              void save();
            }}
            cancelHref="/dashboard/settings"
            primaryLabel={copy('Save app settings')}
            traceId="app-settings-save"
          />
        </>
      )}
    </div>
  );
}
