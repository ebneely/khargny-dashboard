'use client';

import * as React from 'react';
import Image from 'next/image';
import { renewalsApi, type RenewalRequest } from '@/lib/api/renewals';
import { useSubscriberText, RequestError } from './subscriber-ui';
import { renewalError } from '@/lib/renewal-error';

export function RenewalProof({ request }: { request: RenewalRequest }) {
  const { text, lang } = useSubscriberText();
  const key = `${request.id}:${request.proofRevision}:${lang}`;
  const [proof, setProof] = React.useState<{ key: string; source?: string; error?: string }>({ key: '' });
  const source = proof.key === key ? proof.source : '';
  const error = proof.key === key ? proof.error : '';
  React.useEffect(() => {
    if (!request.hasProof) return;
    const controller = new AbortController();
    let active = true;
    let objectUrl = '';
    renewalsApi.proof(request.id, controller.signal).then(blob => {
      if (!active) return;
      objectUrl = URL.createObjectURL(blob);
      setProof({ key, source: objectUrl });
    }).catch(caught => { if (active && !controller.signal.aborted) setProof({ key, error: renewalError(caught, lang) }); });
    return () => { active = false; controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [request.id, request.hasProof, request.proofRevision, lang, key]);
  if (!request.hasProof) return <p className="text-sm text-muted-foreground">{request.method === 'cash' ? text('No receipt picture attached.', 'لا توجد صورة إيصال مرفقة.') : text('No picture: sent on WhatsApp', 'لا توجد صورة: أُرسلت على واتساب')}</p>;
  return <section className="space-y-2" aria-label={text('Private payment proof', 'إثبات الدفع الخاص')}>
    {error ? <RequestError message={error} /> : source ? <Image src={source} width={960} height={960} unoptimized className="max-h-80 w-full rounded-lg object-contain" alt={text('Private payment proof', 'إثبات الدفع الخاص')} /> : <p role="status">{text('Loading private proof…', 'جارٍ تحميل الإثبات الخاص…')}</p>}
    <p className="text-sm text-muted-foreground">{text('Visible only in this signed-in review. Closing it removes the image.', 'يظهر فقط أثناء هذه المراجعة بعد تسجيل الدخول. إغلاقها يزيل الصورة.')}</p>
  </section>;
}
