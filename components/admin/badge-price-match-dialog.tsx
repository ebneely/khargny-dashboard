'use client';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { SubscriberPlace } from '@/lib/api/subscribers';
import { useDashboardCopy } from './dashboard-text';
import { PlaceSearchPicker } from './place-search-picker';
import { useSubscriberText } from './subscriber-ui';

/** Step one of giving Price match by hand: pick the place. The page then asks for confirmation before it saves. */
export function BadgePriceMatchDialog({ onPick, onClose }: { onPick: (place: SubscriberPlace) => void; onClose: () => void }) {
  const copy = useDashboardCopy();
  const { lang } = useSubscriberText();
  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}><DialogContent className="sm:max-w-xl" dir={lang === 'ar' ? 'rtl' : 'ltr'}><DialogHeader><DialogTitle>{copy('Confirm price match for a place')}</DialogTitle><DialogDescription>{copy('Choose the place whose listed prices the team checked against its real prices.')}</DialogDescription></DialogHeader>
    <div className="max-h-[60vh] min-w-0 overflow-y-auto px-1"><PlaceSearchPicker value={null} onChange={onPick} /></div>
  </DialogContent></Dialog>;
}
