import { describe, expect, it } from 'vitest';
import {
  DEFAULT_APP_CONFIG,
  displayOrder,
  enabledSections,
  normaliseAppConfig,
  reviewNumberError,
  type HomeSectionId,
} from './app-config';

const all = (value: boolean): Record<HomeSectionId, boolean> => ({
  stories: value,
  takeme: value,
  near: value,
  earned: value,
  collections: value,
  social: value,
});

describe('app config defaults', () => {
  it('should read a never-saved config as the app defaults', () => {
    expect(normaliseAppConfig(null)).toEqual(DEFAULT_APP_CONFIG);
    expect(normaliseAppConfig({})).toEqual(DEFAULT_APP_CONFIG);
  });

  it('should ask for a rating after 3 actions and 90 days', () => {
    expect(DEFAULT_APP_CONFIG.reviewPrompt).toEqual({
      enabled: true,
      afterActions: 3,
      cooldownDays: 90,
    });
  });
});

describe('Home section order', () => {
  it('should keep the saved order and put the off sections after it', () => {
    expect(displayOrder(['near', 'stories'])).toEqual(['near', 'stories', 'takeme', 'earned', 'collections', 'social']);
  });

  it('should ignore a repeated section', () => {
    expect(displayOrder(['near', 'near', 'social'])).toEqual([
      'near',
      'social',
      'stories',
      'takeme',
      'earned',
      'collections',
    ]);
  });

  it('should send only the on sections, still in the shown order', () => {
    const enabled = { ...all(false), near: true, stories: true };
    expect(enabledSections(displayOrder(['social', 'near']), enabled)).toEqual(['near', 'stories']);
  });

  it('should send an empty list when every section is off', () => {
    expect(enabledSections(displayOrder([]), all(false))).toEqual([]);
  });
});

describe('stored config reading', () => {
  it('should drop an unknown section and a repeated one', () => {
    const config = normaliseAppConfig({
      home: { sections: ['social', 'food', 'social'] },
    });
    expect(config.home.sections).toEqual(['social']);
  });

  it('should fill a row saved before a field existed', () => {
    const config = normaliseAppConfig({
      home: { sections: ['near'] },
      reviewPrompt: { enabled: false },
    });
    expect(config.features).toEqual(DEFAULT_APP_CONFIG.features);
    expect(config.reviewPrompt).toEqual({
      enabled: false,
      afterActions: 3,
      cooldownDays: 90,
    });
    expect(config.copy).toEqual({});
  });

  it('should keep string copy values and drop the rest', () => {
    expect(normaliseAppConfig({ copy: { banner: 'Summer', count: 3 } }).copy).toEqual({ banner: 'Summer' });
  });
});

describe('rating prompt numbers', () => {
  it('should accept a whole number inside its range', () => {
    expect(reviewNumberError('afterActions', '5')).toBe(false);
    expect(reviewNumberError('cooldownDays', '365')).toBe(false);
  });

  it('should reject zero, a fraction, a word and an empty field', () => {
    expect(reviewNumberError('afterActions', '0')).toBe(true);
    expect(reviewNumberError('afterActions', '2.5')).toBe(true);
    expect(reviewNumberError('afterActions', 'three')).toBe(true);
    expect(reviewNumberError('cooldownDays', '')).toBe(true);
  });

  it('should reject above the top of the range', () => {
    expect(reviewNumberError('afterActions', '101')).toBe(true);
    expect(reviewNumberError('cooldownDays', '366')).toBe(true);
  });
});
