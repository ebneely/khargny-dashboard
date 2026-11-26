"use client";

// PLACES-DIRECTION 13: one place's missing publish checks, as small icon chips with
// the numbers that show how far each one is. Every label goes through copy() so the
// Arabic screen reads naturally, and each chip says its full sentence on hover.

import * as React from "react";
import {
  AlertTriangle,
  Banknote,
  Clock,
  Image as ImageIcon,
  MapPin,
  MapPinned,
  Phone,
  Sparkles,
  Tag,
  Type,
  Volume2,
  type LucideIcon,
} from "lucide-react";
import type { PlaceCheckId, PlacePublish } from "@/lib/api/types";
import { useDashboardCopy } from "./dashboard-text";

export const PUBLISH_CHECKS: PlaceCheckId[] = [
  "names",
  "area",
  "pin",
  "address",
  "phone",
  "hours",
  "photos",
  "amenities",
  "tags",
  "conflicts",
  "quiet",
  "price",
];

export const CHECK_META: Record<
  PlaceCheckId,
  { label: string; icon: LucideIcon; tab: string }
> = {
  names: { label: "Name EN + AR", icon: Type, tab: "details" },
  area: { label: "Area", icon: MapPinned, tab: "details" },
  pin: { label: "Map pin", icon: MapPin, tab: "details" },
  address: { label: "Address", icon: MapPin, tab: "details" },
  phone: { label: "Phone", icon: Phone, tab: "details" },
  hours: { label: "Hours", icon: Clock, tab: "hours" },
  photos: { label: "Photos", icon: ImageIcon, tab: "photos" },
  amenities: { label: "Amenities", icon: Sparkles, tab: "features" },
  tags: { label: "Tag", icon: Tag, tab: "features" },
  conflicts: { label: "Contradiction", icon: AlertTriangle, tab: "features" },
  quiet: { label: "Quiet + live music", icon: Volume2, tab: "features" },
  price: { label: "Price range", icon: Banknote, tab: "details" },
};

/** "photos (2 of 3)" for the checks with a target; the rest are simply missing. */
function withProgress(
  check: PlaceCheckId,
  counts: PlacePublish["counts"] | undefined,
  copy: (word: string) => string,
) {
  const label = copy(CHECK_META[check].label);
  if (!counts) return label;
  if (check === "photos") return `${label} (${counts.photos} ${copy("of")} 3)`;
  if (check === "amenities")
    return `${label} (${counts.amenities} ${copy("of")} 3)`;
  if (check === "tags") return `${label} (${counts.tags} ${copy("of")} 1)`;
  if (check === "hours")
    return counts.hours > 0 ? label : `${label} (0 ${copy("of")} 1)`;
  return label;
}

export function MissingChips({
  publish,
  max = 6,
  className = "",
}: {
  publish: PlacePublish | undefined;
  max?: number;
  className?: string;
}) {
  const copy = useDashboardCopy();
  const missing = publish?.missing ?? [];
  if (!missing.length) return null;
  const shown = missing.slice(0, max);
  const rest = missing.length - shown.length;
  return (
    <ul
      data-slot="publish-missing"
      className={`flex min-w-0 flex-wrap items-center gap-1 ${className}`}
    >
      {shown.map((check) => {
        const Icon = CHECK_META[check].icon;
        const text = withProgress(check, publish?.counts, copy);
        return (
          <li key={check}>
            <span
              data-check={check}
              title={text}
              className="inline-flex h-5 max-w-[190px] items-center gap-1 rounded-md bg-muted px-1.5 text-[11px] leading-none text-muted-foreground"
            >
              <Icon className="size-3 shrink-0" aria-hidden="true" />
              <span className="truncate">{text}</span>
            </span>
          </li>
        );
      })}
      {rest > 0 && (
        <li className="text-[11px] leading-none text-muted-foreground">
          +{rest}
        </li>
      )}
    </ul>
  );
}

/** The chip words once, so the icons above need no guessing. */
export function MissingLegend({ checks }: { checks?: PlaceCheckId[] }) {
  const copy = useDashboardCopy();
  const list = checks ?? PUBLISH_CHECKS;
  return (
    <ul
      data-slot="publish-legend"
      className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] leading-none text-muted-foreground"
    >
      {list.map((check) => {
        const Icon = CHECK_META[check].icon;
        return (
          <li key={check} className="inline-flex items-center gap-1">
            <Icon className="size-3" aria-hidden="true" />
            {copy(CHECK_META[check].label)}
          </li>
        );
      })}
    </ul>
  );
}

/** The edit page's one line: "Live" or "Hidden — missing: hours, photos (2 of 3)". */
export function PublishLine({
  publish,
}: {
  publish: PlacePublish | undefined;
}) {
  const copy = useDashboardCopy();
  if (!publish) return null;
  if (publish.publishable)
    return (
      <p
        data-slot="publish-line"
        data-state="live"
        role="status"
        className="flex items-center gap-2 text-sm"
      >
        <span className="inline-flex h-5 items-center rounded-md bg-emerald-50 px-1.5 text-[11px] font-medium text-emerald-700">
          {copy("Live")}
        </span>
        <span className="text-muted-foreground">
          {copy("Public: every required check passes.")}
        </span>
      </p>
    );
  return (
    <div
      data-slot="publish-line"
      data-state="hidden"
      role="status"
      className="min-w-0 space-y-1"
    >
      <p className="flex flex-wrap items-center gap-2 text-sm">
        <span className="inline-flex h-5 items-center rounded-md bg-amber-50 px-1.5 text-[11px] font-medium text-amber-800">
          {copy("Hidden — incomplete")}
        </span>
        <span className="text-muted-foreground">{copy("Missing")}:</span>
        <MissingChips publish={publish} max={8} />
      </p>
    </div>
  );
}
