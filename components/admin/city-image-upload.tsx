'use client';

import { useState } from 'react';
import { Plus, Trash2, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { adminApi, AdminApiError } from '@/lib/api/admin-client';

type CityImageUploadProps = {
  cityId: string;
  /** Current image URL (from the loaded city), or null. */
  imageUrl: string | null;
  /** Called with the new/removed image URL so the parent can refresh. */
  onChange: (url: string | null) => void;
};

/**
 * City cover image: preview + click-to-enlarge, upload (with 0→100% progress),
 * and remove. The backend transcodes to WebP and resizes; we just show the
 * recommended source dimensions.
 */
export function CityImageUpload({ cityId, imageUrl, onChange }: CityImageUploadProps) {
  const [percent, setPercent] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(false);
  const busy = percent !== null;

  const upload = async (file: File) => {
    setError('');
    setPercent(0);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await adminApi.uploadWithProgress<{ imageUrl?: string }>(
        `/v1/admin/cities/${cityId}/image`,
        form,
        (p) => setPercent(p),
      );
      onChange(res?.imageUrl ?? null);
    } catch (e) {
      setError(e instanceof AdminApiError ? e.message : 'Upload failed. Try again.');
    } finally {
      setPercent(null);
    }
  };

  const remove = async () => {
    setError('');
    try {
      await adminApi.delete(`/v1/admin/cities/${cityId}/image`);
      onChange(null);
    } catch (e) {
      setError(e instanceof AdminApiError ? e.message : 'Remove failed. Try again.');
    }
  };

  return (
    <div className="space-y-2" data-trace-id="city-image-upload">
      <div className="flex items-start gap-4">
        {/* Preview / placeholder */}
        <div className="relative h-28 w-40 shrink-0 overflow-hidden rounded-(--radius-ds-md) border border-border bg-muted">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt="City cover"
              className="h-full w-full cursor-zoom-in object-cover"
              onClick={() => setPreview(true)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <ImageIcon className="h-8 w-8" />
            </div>
          )}
          {busy && (
            <div className="absolute inset-x-0 bottom-0 h-1.5 bg-black/20">
              <div
                className="h-full bg-[var(--brand-600)] transition-all duration-300 ease-out"
                style={{ width: `${percent}%` }}
              />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-(--radius-ds-md) border border-dashed border-border bg-muted/40 px-4 py-2 text-sm hover:bg-muted">
            <Plus className="h-4 w-4" />
            {busy ? `Uploading… ${percent}%` : imageUrl ? 'Replace photo' : 'Upload photo'}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={busy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (file) void upload(file);
              }}
            />
          </label>
          {imageUrl && !busy && (
            <Button type="button" variant="ghost" size="sm" className="gap-1.5 text-[var(--error)]" onClick={remove}>
              <Trash2 className="h-4 w-4" /> Remove
            </Button>
          )}
          <p className="text-xs text-muted-foreground">
            Recommended 1200×800 (3:2), min 800×600. 16:9 also works. Auto-optimized to WebP.
          </p>
        </div>
      </div>

      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}

      {preview && imageUrl && (
        <div
          role="dialog"
          aria-label="Image preview"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
          onClick={() => setPreview(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt="City cover" className="max-h-full max-w-full rounded-(--radius-ds-md) object-contain" />
        </div>
      )}
    </div>
  );
}
