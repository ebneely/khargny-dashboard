'use client';

import { SubmissionsList } from './submissions-page';

/** One place's submission history (corrections, reports, owner requests, owner photos). */
export function PlaceSubmissions({ placeId, canWrite = false }: { placeId: string; canWrite?: boolean }) {
  return <SubmissionsList placeId={placeId} canWrite={canWrite} />;
}
