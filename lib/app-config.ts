/**
 * The app's remote config, as the dashboard edits it (Settings → App) and the
 * backend stores it (GET /v1/app-config, PUT /v1/admin/app-config).
 *
 * Pure, so lib/app-config.test.ts pins the order and the defaults the same way
 * the app and the backend read them.
 */

export const HOME_SECTION_IDS = ['stories', 'takeme', 'near', 'earned', 'collections', 'social'] as const;
export type HomeSectionId = (typeof HOME_SECTION_IDS)[number];

export const FEATURE_IDS = ['rising', 'marketplace', 'onboarding'] as const;
export type FeatureId = (typeof FEATURE_IDS)[number];

export interface AppConfig {
  home: { sections: HomeSectionId[] };
  features: Record<FeatureId, boolean>;
  reviewPrompt: {
    enabled: boolean;
    afterActions: number;
    cooldownDays: number;
  };
  copy: Record<string, string>;
}

export const DEFAULT_APP_CONFIG: AppConfig = {
  home: { sections: [...HOME_SECTION_IDS] },
  features: { rising: true, marketplace: true, onboarding: true },
  reviewPrompt: { enabled: true, afterActions: 3, cooldownDays: 90 },
  copy: {},
};

/** The app treats a value below 1 as "use the default", so the range starts at 1. */
export const REVIEW_RANGES = {
  afterActions: { min: 1, max: 100 },
  cooldownDays: { min: 1, max: 365 },
} as const;

export const isSectionId = (value: unknown): value is HomeSectionId =>
  typeof value === 'string' && (HOME_SECTION_IDS as readonly string[]).includes(value);

export const isFeatureId = (value: unknown): value is FeatureId =>
  typeof value === 'string' && (FEATURE_IDS as readonly string[]).includes(value);

/**
 * A stored config read as a complete one. Unknown sections and values of the
 * wrong type fall back to the defaults, exactly as the app does, so a bad save
 * can never blank a Home section.
 */
export function normaliseAppConfig(saved: unknown): AppConfig {
  const raw = saved && typeof saved === 'object' && !Array.isArray(saved) ? (saved as Record<string, unknown>) : {};

  const home = raw.home as { sections?: unknown } | undefined;
  const sections = Array.isArray(home?.sections)
    ? [...new Set(home.sections.filter(isSectionId))]
    : [...DEFAULT_APP_CONFIG.home.sections];

  const features = (raw.features && typeof raw.features === 'object' ? raw.features : {}) as Record<string, unknown>;
  const flag = (id: FeatureId) =>
    typeof features[id] === 'boolean' ? (features[id] as boolean) : DEFAULT_APP_CONFIG.features[id];

  const review = (raw.reviewPrompt && typeof raw.reviewPrompt === 'object' ? raw.reviewPrompt : {}) as Record<
    string,
    unknown
  >;
  const whole = (id: 'afterActions' | 'cooldownDays') => {
    const value = review[id];
    const { min, max } = REVIEW_RANGES[id];
    return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max
      ? value
      : DEFAULT_APP_CONFIG.reviewPrompt[id];
  };

  const copy: Record<string, string> = {};
  if (raw.copy && typeof raw.copy === 'object' && !Array.isArray(raw.copy))
    for (const [key, value] of Object.entries(raw.copy)) if (typeof value === 'string') copy[key] = value;

  return {
    home: { sections },
    features: {
      rising: flag('rising'),
      marketplace: flag('marketplace'),
      onboarding: flag('onboarding'),
    },
    reviewPrompt: {
      enabled: typeof review.enabled === 'boolean' ? review.enabled : DEFAULT_APP_CONFIG.reviewPrompt.enabled,
      afterActions: whole('afterActions'),
      cooldownDays: whole('cooldownDays'),
    },
    copy,
  };
}

/**
 * Every row the screen shows: the saved order first, then any section that is
 * not on Home yet, in the app's built-in order. A hidden section keeps its row
 * so it can be switched on again where the owner put it.
 */
export function displayOrder(saved: readonly HomeSectionId[]): HomeSectionId[] {
  const unique = [...new Set(saved)];
  return [...unique, ...HOME_SECTION_IDS.filter((id) => !unique.includes(id))];
}

/** What the app receives: the on sections, still in the order shown. */
export function enabledSections(
  order: readonly HomeSectionId[],
  enabled: Record<HomeSectionId, boolean>,
): HomeSectionId[] {
  return order.filter((id) => enabled[id]);
}

/** True when the typed text is not a whole number inside its range. */
export function reviewNumberError(field: 'afterActions' | 'cooldownDays', text: string): boolean {
  const value = Number(text);
  const { min, max } = REVIEW_RANGES[field];
  return !(text.trim() !== '' && Number.isInteger(value) && value >= min && value <= max);
}
