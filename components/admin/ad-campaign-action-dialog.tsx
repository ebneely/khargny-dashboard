'use client';

import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { adminApi } from '@/lib/api/admin-client';
import type { AdCampaign } from '@/lib/api/ads';

export type CampaignAction = 'pause' | 'resume' | 'end';

const COPY: Record<CampaignAction, { title: string; description: string; confirm: string }> = {
  pause: {
    title: 'Pause campaign?',
    description: 'The campaign will stop serving immediately. Its booked dates and history will stay intact.',
    confirm: 'Pause campaign',
  },
  resume: {
    title: 'Resume campaign?',
    description: 'The campaign will be eligible to serve again whenever its booked dates are live.',
    confirm: 'Resume campaign',
  },
  end: {
    title: 'End campaign?',
    description: 'This permanently ends serving for the campaign. The record and advertiser report will remain available.',
    confirm: 'End campaign',
  },
};

export function AdCampaignActionDialog({
  campaign,
  action,
  open,
  onOpenChange,
  onCompleted,
}: {
  campaign: AdCampaign | null;
  action: CampaignAction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted: () => void;
}) {
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (!action) return null;
  const copy = COPY[action];

  const submit = async () => {
    if (!campaign) return;
    setSubmitting(true);
    setError(null);
    try {
      await adminApi.post(`/v1/admin/ads/campaigns/${campaign.id}/${action}`);
      toast.success(`Campaign ${action === 'end' ? 'ended' : `${action}d`}.`);
      onOpenChange(false);
      onCompleted();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : `Could not ${action} the campaign.`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (submitting) return;
        if (!next) {
          setError(null);
          setSubmitting(false);
        }
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>
            {campaign ? `${campaign.place.name || campaign.place.nameEn} · ${campaign.advertiserName}. ` : ''}
            {copy.description}
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button
            type="button"
            variant={action === 'end' ? 'destructive' : 'default'}
            onClick={submit}
            disabled={submitting}
          >
            {submitting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            {submitting ? 'Saving…' : copy.confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
