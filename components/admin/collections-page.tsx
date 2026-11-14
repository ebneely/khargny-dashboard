'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { Layers, Plus } from 'lucide-react';
import { PageActions } from './page-actions';
import { HomeSections } from './ads-home-sections';
import { LoadingState } from './subscriber-ui';
import { useDashboardCopy } from './dashboard-text';

/** Places > Collections: the team's collections (the website home sections), edited in one place. */
export function CollectionsPage({ canWrite }: { canWrite: boolean }) {
  return <React.Suspense fallback={<LoadingState />}><CollectionsContent canWrite={canWrite} /></React.Suspense>;
}

function CollectionsContent({ canWrite }: { canWrite: boolean }) {
  const copy = useDashboardCopy();
  const adding = useSearchParams().get('add') === 'section';
  return <div className="min-w-0 space-y-6">
    <header className="flex flex-wrap items-start justify-between gap-3"><div className="max-w-2xl"><h1 className="flex items-center gap-2 font-display text-2xl font-semibold"><Layers className="size-5 text-primary" aria-hidden="true" />{copy('Collections')}</h1><p className="mt-1 text-sm text-muted-foreground">{copy('Lists of places made by the team. Each has a title in Arabic and English, its places in order, and a cover from its first places\u2019 photos.')}</p></div>
      <PageActions form={adding && canWrite} actions={[{ label: 'New collection', href: '/dashboard/places/library/collections?add=section', allowed: canWrite, icon: <Plus className="size-4" aria-hidden="true" /> }]} /></header>
    <HomeSections canWrite={canWrite} />
  </div>;
}
