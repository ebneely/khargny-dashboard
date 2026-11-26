"use client";

// Inbox → Complete to publish (PLACES-DIRECTION 13): the hidden places worth finishing
// first, highest 30-day views at the top, each row saying exactly what is missing.
// A row opens the edit page on the tab that holds its first missing check.

import * as React from "react";
import Link from "@/components/lang-link";
import { Eye, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDashboardCopy } from "./dashboard-text";
import { useDashboardLang } from "@/lib/dashboard-lang";
import {
  loadCompleteToPublish,
  loadMissingCheck,
  type CompleteToPublishPage,
} from "@/lib/api/complete-to-publish";
import { CHECK_META, MissingChips, MissingLegend } from "./publish-missing";
import { Pager } from "./pager";
import { localeFor } from "@/lib/locale";

const PAGE_SIZE = 20;

export function CompleteToPublish() {
  return (
    <QueueList
      kind="complete"
      title="Active places that are not 100% complete, highest views first. A place goes live by itself the moment it passes every required check."
      empty="Nothing here: every active place is complete."
    />
  );
}

/** Rule 11: publishable places missing a tracked check (price). */
export function MissingCheck({ check }: { check: 'price' }) {
  return (
    <QueueList
      kind="missing-price"
      check={check}
      title="Public places whose price is still missing. They are live; the price is tracked, not required. Highest views first."
      empty="Nothing here: every public place has a price."
    />
  );
}

function QueueList({
  kind,
  check,
  title,
  empty,
}: {
  kind: 'complete' | 'missing-price';
  /** The tracked check the "missing" queue lists (price). */
  check?: string;
  title: string;
  empty: string;
}) {
  const copy = useDashboardCopy();
  const { lang } = useDashboardLang();
  const number = (value: number) => value.toLocaleString(localeFor(lang));
  const [offset, setOffset] = React.useState(0);
  const [reload, setReload] = React.useState(0);
  // One settled result per requested offset: a page is stale (and the list says
  // "loading") until its own offset comes back.
  const [state, setState] = React.useState<{
    offset: number;
    page: CompleteToPublishPage | null;
    error: boolean;
  }>({ offset: -1, page: null, error: false });

  // One stable loader per queue, so the effect does not re-run on every render.
  const load = React.useCallback(
    (skip: number) =>
      kind === 'missing-price'
        ? loadMissingCheck({
            check: check ?? 'price',
            limit: PAGE_SIZE,
            cursor: skip ? btoa(String(skip)) : null,
          })
        : loadCompleteToPublish({
            limit: PAGE_SIZE,
            cursor: skip ? btoa(String(skip)) : null,
          }),
    [kind, check],
  );

  React.useEffect(() => {
    let live = true;
    load(offset)
      .then((result) => {
        if (live) setState({ offset, page: result, error: false });
      })
      .catch(() => {
        if (live) setState({ offset, page: null, error: true });
      });
    return () => {
      live = false;
    };
  }, [offset, reload, load]);

  const busy = state.offset !== offset;
  const error = !busy && state.error;
  const page = busy ? null : state.page;
  const rows = page?.data ?? [];
  const total = page?.meta.total ?? 0;
  const pick = (ar: string | null | undefined, en: string | null | undefined) =>
    (lang === "ar" ? ar?.trim() || en?.trim() : en?.trim() || ar?.trim()) ||
    "—";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">
            {copy(title)}
          </p>
          <div className="mt-2">
            <MissingLegend />
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          data-ro-allow="true"
          disabled={busy}
          onClick={() => setReload((value) => value + 1)}
        >
          <RefreshCw className="size-3.5" aria-hidden="true" />
          {copy("Refresh")}
        </Button>
      </div>

      {error ? (
        <div className="py-8 text-center">
          <p className="mb-3 text-sm text-muted-foreground">
            {copy("Could not load the list.")}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setReload((value) => value + 1)}
          >
            {copy("Retry")}
          </Button>
        </div>
      ) : (
        <>
          <p
            className="text-sm tabular-nums text-muted-foreground"
            aria-live="polite"
          >
            {busy && !page
              ? copy("Loading…")
              : `${number(total)} ${copy(total === 1 ? "place" : "places")}`}
          </p>
          {!busy && rows.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">
              {copy(empty)}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{copy("Place")}</TableHead>
                  <TableHead>{copy("City")}</TableHead>
                  <TableHead className="text-end">
                    {copy("Views (30 days)")}
                  </TableHead>
                  <TableHead>{copy("Missing")}</TableHead>
                  <TableHead className="text-end">{copy("Open")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const first = row.missing[0];
                  const tab = first ? CHECK_META[first].tab : "details";
                  return (
                    <TableRow
                      key={row.id}
                      data-place-id={row.id}
                      data-missing={row.missing.join(",")}
                    >
                      <TableCell>
                        <Link
                          href={`/dashboard/places/${row.id}?tab=${tab}`}
                          className="font-medium hover:text-primary"
                          dir="auto"
                        >
                          {pick(row.name, row.nameEn)}
                        </Link>
                        <p
                          className="text-xs leading-4 text-muted-foreground"
                          dir="auto"
                        >
                          {pick(row.nameEn, row.name)}
                        </p>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm" dir="auto">
                          {pick(row.city.name, row.city.nameEn)}
                        </span>
                      </TableCell>
                      <TableCell className="text-end tabular-nums">
                        {number(row.views)}
                      </TableCell>
                      <TableCell>
                        <MissingChips
                          publish={{
                            publishable: false,
                            checkedAt: null,
                            missing: row.missing,
                            counts: row.counts,
                          }}
                          max={4}
                        />
                      </TableCell>
                      <TableCell className="text-end">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          data-ro-allow="true"
                          aria-label={`${copy("Open the edit page")}: ${pick(row.name, row.nameEn)}`}
                          nativeButton={false}
                          render={
                            <Link
                              href={`/dashboard/places/${row.id}?tab=${tab}`}
                            />
                          }
                        >
                          <Eye className="size-4" aria-hidden="true" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
          <Pager
            skip={offset}
            pageSize={PAGE_SIZE}
            total={total}
            count={rows.length}
            busy={busy}
            error={error}
            onPrevious={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            onNext={() => setOffset(offset + PAGE_SIZE)}
            previousDisabled={offset === 0}
            nextDisabled={!page?.meta.has_more}
          />
        </>
      )}
    </div>
  );
}
