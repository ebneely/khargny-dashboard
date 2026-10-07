'use client';

import * as React from 'react';
import Image from 'next/image';
import { RefreshCw, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useDashboardLang } from '@/lib/dashboard-lang';

export function FileUpload({ label, description, onChange, disabled, className, compact = false, thumbnail, ...props }: Omit<React.ComponentProps<'input'>, 'type' | 'className'> & {
  label: string;
  description: string;
  className?: string;
  compact?: boolean;
  thumbnail?: { src?: string | null; replace?: boolean };
}) {
  const { lang } = useDashboardLang();
  const input = React.useRef<HTMLInputElement>(null);
  const id = React.useId();
  const [names, setNames] = React.useState<string[]>([]);
  const [failedSource, setFailedSource] = React.useState<string | null>(null);
  const select = (event: React.ChangeEvent<HTMLInputElement>) => {
    setNames(Array.from(event.target.files ?? []).map((file) => file.name));
    onChange?.(event);
  };
  const picker = <Button type="button" variant="outline" size={thumbnail ? 'icon' : 'default'}
    className={thumbnail ? 'group relative size-12 shrink-0 overflow-hidden rounded-lg p-0 active:scale-[0.98]' : `h-auto max-w-full whitespace-normal text-start active:scale-[0.98] ${compact ? 'min-h-10 px-2 text-xs' : 'min-h-11'}`}
    disabled={disabled} onClick={() => input.current?.click()} aria-controls={props.id ?? id} aria-label={thumbnail ? label : undefined} aria-describedby={id + '-help'} title={thumbnail ? label + ' · ' + description : undefined}>
    {thumbnail ? <>
      <Image src={thumbnail.src && thumbnail.src !== failedSource ? thumbnail.src : '/place-cover-placeholder.svg'} alt="" width={48} height={48} unoptimized className="size-full object-cover" onError={() => setFailedSource(thumbnail.src ?? null)} />
      <span className={`absolute bottom-0.5 end-0.5 rounded-full bg-card p-0.5 text-foreground ${thumbnail.replace ? 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100' : ''}`}>
        {thumbnail.replace ? <RefreshCw className="size-3" aria-hidden="true" /> : <Upload className="size-3" aria-hidden="true" />}
      </span>
    </> : <><Upload className="size-4 shrink-0" aria-hidden="true" />{label}</>}
  </Button>;
  return <div className={[thumbnail ? 'min-w-0 shrink-0' : 'min-w-0 space-y-2', className].filter(Boolean).join(' ')}>
    <input {...props} id={props.id ?? id} ref={input} type="file" className="sr-only" tabIndex={-1}
      aria-label={label} aria-describedby={id + '-help'} disabled={disabled} onChange={select} />
    {thumbnail ? <Tooltip><TooltipTrigger render={picker} /><TooltipContent>{label}<br />{description}</TooltipContent></Tooltip> : picker}
    {!compact && !thumbnail && <div className="hidden min-h-20 items-center justify-center rounded-lg border border-dashed bg-muted/30 p-3 text-center text-sm text-muted-foreground sm:flex"
      onDragOver={(event) => { event.preventDefault(); }} onDrop={(event) => {
        event.preventDefault();
        if (disabled || !input.current) return;
        const transfer = new DataTransfer();
        const files = Array.from(event.dataTransfer.files);
        (props.multiple ? files : files.slice(0, 1)).forEach((file) => transfer.items.add(file));
        input.current.files = transfer.files;
        input.current.dispatchEvent(new Event('change', { bubbles: true }));
      }}>
      {lang === 'ar' ? 'أو اسحب الملفات هنا' : 'Or drop files here'}
    </div>}
    <p id={id + '-help'} className={thumbnail ? 'sr-only' : 'break-words text-xs text-muted-foreground'}>{description}</p>
    {!thumbnail && names.length > 0 && <ul aria-live="polite" className="space-y-1 text-sm">{names.map((name, index) => <li key={index + '-' + name} className="break-all">{name}</li>)}</ul>}
  </div>;
}
