'use client';

import * as React from 'react';
import { useDashboardCopy } from '../dashboard-text';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';

const SECTIONS: { title: string; body: string }[] = [
  { title: 'Our promise', body: 'Every good place deserves to be found. Popular places stay popular because people love them, and new and small places get a real, fair chance to be seen. Paid promotion never pushes out a better match.' },
  { title: 'What we count', body: 'A showing is the place appearing in a list. Opening it is a view. A search then a tap is a Search point. A go or a call means they are on the way. A share, save or love means they recommend it or want to remember it.' },
  { title: 'Hype', body: 'Hype is everything people did with a place in the last 30 days, one point each: views + loves + saves + shares + 5argny taps + Search points. No maximum.' },
  { title: 'Fair chance', body: '2 of every 10 posts in the feed, and 1 of every 8 stories, are kept for places that are not hyped yet. Ads never take these seats.' },
  { title: 'The marks', body: 'New, On trial, Rising, Hyped, Cooling, Resting and Needs listing steer the order inside the feed. Customers never see them.' },
  { title: 'Paid promotion', body: 'At most 2 promoted posts in every 10, never at the very top and never two close together. A promoted place shows only if it is at least 80% as good a match as the post it replaces.' },
  { title: 'Evidence: one action never decides', body: 'Every action counts through evidence from different visitors. Bots, datacenters, repeats in one day and bursts are dropped; a brand-new visitor counts at half weight.' },
  { title: 'Learned keywords', body: 'Two kinds of keyword, never mixed: team keywords, assigned by the team with full weight and never fading, and learned keywords, created by customer behaviour with a weight capped below the team’s.' },
  { title: 'In one sentence', body: 'Popular places stay on top because people love them, new places get a fair trial and grow if people react, and promotion buys more visibility only where it is relevant.' },
];

/** Decision 0006/0007 in plain words, internal only: no algorithm detail goes in customer text. */
export function HowItWorksPanel({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const copy = useDashboardCopy();
  return <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent side="right" className="w-full sm:max-w-xl">
      <SheetHeader className="border-b border-border pe-12">
        <SheetTitle>{copy('How ranking works')}</SheetTitle>
        <SheetDescription>{copy('Team only. Customers never see these numbers or statuses.')}</SheetDescription>
      </SheetHeader>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
        {SECTIONS.map((section, at) => <section key={section.title} className="space-y-1">
          <h3 className="font-medium">{at + 1}. {copy(section.title)}</h3>
          <p className="text-sm leading-6 text-muted-foreground">{copy(section.body)}</p>
        </section>)}
      </div>
    </SheetContent>
  </Sheet>;
}
