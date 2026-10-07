'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { DirectionProvider } from '@base-ui/react/direction-provider';
import { useDashboardLang } from '@/lib/dashboard-lang';
import { useUrlTab } from '@/lib/use-url-tab';
import { Tabs, TabsContent } from '@/components/ui/tabs';

const ActiveTab = React.createContext<string | undefined>(undefined);

type UrlTabsProps = Omit<React.ComponentProps<typeof Tabs>, 'value' | 'defaultValue' | 'onValueChange'> & { values: readonly string[] };

export function UrlTabs(props: UrlTabsProps) {
  return <React.Suspense fallback={null}><ControlledUrlTabs {...props} /></React.Suspense>;
}

function ControlledUrlTabs({ values, children, ...props }: UrlTabsProps) {
  const tab = useUrlTab(values);
  const { lang } = useDashboardLang();
  const direction = props.dir === 'ltr' || props.dir === 'rtl' ? props.dir : lang === 'ar' ? 'rtl' : 'ltr';
  return <DirectionProvider direction={direction}><ActiveTab.Provider value={tab.value}><Tabs {...props} {...tab} dir={direction}>{children}</Tabs></ActiveTab.Provider></DirectionProvider>;
}

/**
 * Hides page chrome that sits outside the tabs while one tab is open. The place form's
 * "Save Changes" bar saves the place's own fields; on the Pricing tab every edit is already
 * live, so showing it there suggests there is something left to save.
 */
export function HiddenOnTab({ tab, children }: { tab: string; children: React.ReactNode }) {
  return <React.Suspense fallback={children}><HiddenOnTabInner tab={tab}>{children}</HiddenOnTabInner></React.Suspense>;
}

function HiddenOnTabInner({ tab, children }: { tab: string; children: React.ReactNode }) {
  return useSearchParams().get('tab') === tab ? null : <>{children}</>;
}

export function UrlTabsContent({ lazy = false, children, ...props }: React.ComponentProps<typeof TabsContent> & { lazy?: boolean }) {
  const value = React.useContext(ActiveTab);
  const selected = value === props.value;
  const [opened, setOpened] = React.useState(selected);
  if (selected && !opened) setOpened(true);
  return <TabsContent {...props} keepMounted>{!lazy || opened || selected ? children : null}</TabsContent>;
}
