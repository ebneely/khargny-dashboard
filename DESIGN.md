# 5argny dashboard: how every screen is built

The owner asked for one director for UI and UX, because he was finding the same kinds of problem one screen at a time: the same job done three ways, controls that do not show their state, labels that do not say what they are, screens that are hard to scan. This is the standard every screen follows. When a screen and this file disagree, the screen is wrong.

It adds no colours, fonts or libraries: it says how to use the tokens and shared components that exist (`components/ui/*`).

## 1. One job, one pattern

| Job | The only pattern |
|---|---|
| Move between areas | the grouped sidebar; exactly one current item |
| Switch sections inside a page | the shared tabs, tab kept in the address (`?tab=`) |
| Save a form | the shared sticky bottom action bar; never a second Save for the same form |
| Pick from a list | the shared Select; a searchable table when the list is long or needs a picture |
| Choose a file | the shared upload control; never a raw file input |
| Confirm something irreversible or public | the shared dialog, stating the consequence in plain words |
| Show a state | a chip with words (and an icon when it helps); never colour alone |
| Tell the result of an action | a toast for success, a message beside the field or row for an error |

Related editing stays on the page (a tab or a dialog). Nothing sends the admin to another page to finish a job and back again, unless a new record is being created.

## 2. Page skeleton

1. Back link (only on a detail page), then the page title with its icon, one line saying what the page is for, and at the end edge the page's one primary action.
2. A status line under the title when the record has a state worth knowing at a glance (a subscriber: what he can do right now).
3. Tabs, if the page has sections.
4. Content as cards on the page background.
5. The sticky action bar, if the page has a form.

## 3. Cards and sections

- Every section is its own card: the shared radius, border and surface. Cards are siblings; never a card inside a card.
- A card has a title row (title, optional count, muted one-line description) and, at its end edge, the actions that belong to that card only.
- 16 px padding inside a card, 24 px between cards, 32 px between groups of cards. Whitespace separates; borders inside a card are only hairlines between rows.
- An inset note inside a card (for example "Pricing visible") uses the sunken surface, not another border.

## 4. Text

- Three sizes on a screen at most: page title, card title, body. Secondary text is the muted colour one step down, never a fourth size.
- Weight carries hierarchy: card and group titles semibold, names medium, the rest regular.
- Body and muted text both meet 4.5:1 on their surface.
- Numbers that are compared (prices and counts) use tabular numerals and are aligned to the end edge of their column; the currency or unit is muted.

## 5. Lists and tables

- A list of records is a table or rows that line up: the same thing is at the same horizontal position in every row.
- Rows are at least 56 px tall with a hairline between them and a quiet background on hover and on keyboard focus. No zebra stripes.
- The first column identifies the record (thumbnail when it has a picture, then its name in the admin's language with the other language muted beneath).
- Row actions are compact icon buttons with accessible names and tooltips, at the end edge; at most two are visible, including the menu trigger. Additional actions go into the shared menu, with destructive items last after a separator. Delete remains confirmed.
- Full-page lists flow with the page, never inside a fixed-height or max-height vertical scroll box. Their header follows the viewport until the table ends. Only a picker inside a form owns a fixed-height scrolling table. Places shows its count above the table and its shared pager once, below.
- Names wrap to two lines, then truncate with the full text in a title.

The shared `RecordCell` in `components/admin/record-cell.tsx` identifies each list record: a fixed square optional `RecordThumbnail`, the interface-language name, the other language muted below, and optional primary-line chips. RecordCell contains only names, thumbnail and chips, never pricing, owner descriptions or extra action links. Each name carries its own language, dir="auto" and full-text title and wraps to at most two lines; both blocks align to the interface start edge. Names identical after trimming and case-folding appear once. Thumbnails use the same neutral placeholder for missing or failed covers, explicit box dimensions, lazy loading and async decoding. Legacy place responses only use the old media fallback when the new cover field is absent.

The shared `DateCell` uses `lib/dashboard-date.ts` for short interface-language dates and a full UTC date/time title; date columns align to the start. Comparable numbers align to the end with tabular numerals. The shared `DateRange` uses the same helper module, abbreviates months and shows the year once when both ends share it (1 Oct – 31 Oct 2026); its title retains both full UTC timestamps.

The shared `Pager` keeps previous, then next in DOM order in both directions, mirroring only arrow icons. Its polite live range reads “21 to 40 of 213”; the caller owns page size, server totals, loading/error state and API-specific clamping. Page-size controls appear only where already offered. Empty ranges are zero to zero; failed or pending requests do not announce stale totals. When an API supplies no total (Admins), show the range without an invented denominator, retaining that API’s existing next-page rule.

The shared `RowActions` keeps the most-used action visible and puts the remainder behind a labelled, titled “More actions” icon button. It builds on the existing Base UI DropdownMenu for keyboard navigation, Escape and focus return, uses logical end alignment, orders destructive items last after a separator, and calls each screen’s existing confirmation dialog. Screens supply only permitted actions; rendered links use non-native button semantics. Cities and Categories read the existing ReadOnlyGate presentation state through useDashboardReadOnly, without another session request: viewer rows keep View and omit write menu items instead of exposing portal actions outside the gate.

The shared `PlaceOwnerFilter` reuses FilterSelect and the subscriber-list search endpoint; Choose subscriber opens the existing shared dialog with Input and SubscriberSelect, without narrowing a page of place results locally. Subscriber-place selection uses a separate `placeFilter` URL parameter through `useUrlTab`; Available, Linked here and All request their totals from the server and preserve the existing tab parameter.

The shared `Table` list layout in `components/ui/table.tsx` and `app/dashboard-lists.css` supplies natural page height, 56–72 px name rows and viewport-tracking solid header backgrounds. A small scroll/resize offset keeps the header at viewport top even when its ancestor permits horizontal scrolling (the app header currently scrolls away). Mark the final header and cells with column="actions": the column sticks to the logical end edge with a solid card background and stays visible during sideways scrolling in LTR and RTL. Campaigns reserve 220 px for the covered place and compact the other columns to fit the 944 px table space at a 1280 px viewport. Below 640 px, lists show only record identity, status and actions; other data stays available on desktop and detail screens. The linked-places form picker is excluded from this list layout.

The single `StatusBadge` in `components/admin/subscriber-ui.tsx` is a soft-tinted shared Badge with bilingual text and a full-text title; AdStateBadge delegates to it without its own styling. Active/live are green (success); paused/expiring amber (warning); scheduled blue (info); draft, disabled, inactive, suspended, ended, expired and revoked neutral; only deleted/cancelled are red (danger). Link ownership is neutral, not a warning. It reuses semantic background/text tokens; amber text mixes the warning token 55% with gray-900 45% for readable text. Verified contrast ratios are success 4.81:1, warning 6.26:1, info 5.03:1, danger 4.80:1 and neutral 9.17:1 in light / 6.64:1 in dark. Semantic tint/text tokens stay the same in both themes. Status is always named, never conveyed by colour alone.

The shared `FilterBar`, `FilterSearch` and `FilterSelect` in `components/admin/filter-bar.tsx` implement list narrowing on Places, Cities and Categories. Controls name their meaning in bilingual placeholders/current values and accessible names, without an extra label pushing one filter down. Controls are 44 px high in an equal-width two-column phone grid (search spans the row); at desktop width they occupy one row, search taking the remaining space. The selected owner’s name stays visible; changing filters keeps each screen’s existing search/request/page-reset semantics.

The shared `SegmentedControl` in `components/admin/segmented-control.tsx` is the only segmented-control implementation: fully rounded track and thumb (`rounded-full`), equal 2 px padding, muted unchosen labels with hover, and a foreground, medium-weight chosen label with a visible focus ring. Default is 36 px overall (32 px thumb); compact is 28 px (24 px thumb), reserved for EN / ع beside the logo. Optional leading icons and trailing server counts use the same thumb. Small, mutually exclusive 2–5-way view choices use its labelled radiogroup with roving tabindex, arrows mirrored in RTL, Home and End. Page panels use `UrlTabs` / `TabsList` / `TabsTrigger`, which delegate to the very same track and thumb with Base UI tabs semantics, URL state, keyboard behavior and associated panels; the existing six-way subscriber/place strips remain tabs and may wrap rather than overflow. Ads destination links use its `SegmentedNavigation` presentation with genuine links and aria-current, not pretend panels. Use Select for large/dynamic option lists and date-range forms; do not build another adjacent-button switch.

The shared `DateField` in `components/admin/date-field.tsx` edits an ISO calendar date while displaying interface-language day/month/year (including Arabic digits), opening a Base UI calendar popover from the text field or its calendar button. The Sunday-first grid has previous/next month, Cairo Today, min/max, arrows (RTL-aware), Home/End, Page Up/Down, Escape and focus return. Typed ISO or day/month/year is validated as a calendar date, not parsed in local time; New subscription and Renew use it for both editable boundaries and payment date. Dates use the pure inclusive-length helper in `lib/subscription-calendar.ts`; changing either boundary clears the selected quick chip.

The shared `PresetChoices` in `components/admin/preset-choices.tsx` is for form-filling shortcuts, not panels or a segmented track: independent outlined pill chips with gaps, wrapping naturally on phones, aria-pressed and an optional disabled reason in title and adjacent text. Subscription lengths have six chips; trials hide payment fields and repeat trials require a super-admin confirmation. The shared `TrialBadge` in `components/admin/trial-badge.tsx` labels the two known bilingual trial plan names in list identities, subscriber headers and history; it never recomputes or excludes backend-owned money totals.

## 6. Buttons

- One filled (primary) button per screen. Everything else is outline, quiet, or an icon button.
- A destructive button is never beside the primary one without a gap, and always confirms.
- Every button has hover, focus-visible, pressed, disabled and busy states from the shared Button. A disabled button says why (tooltip or a line beside it).
- Button text says the action and its object: "Add item or service", not "Add".

## 7. Forms

- One column on phones, two on desktop for short fields; a field that needs room (notes, descriptions) spans the row.
- Every field has a visible label. Help that prevents a mistake sits under the field in one muted line; optional fields say "optional".
- Validation appears beside the field, in words, when the field is left or the form is submitted; the form keeps what was typed.
- The sticky bar shows: unsaved changes, saving, saved, or what went wrong. Its primary action is disabled while nothing has changed.
- Screens that save at once (switches, the Pricing editor) have no bar and say "Changes are live at once".

## 8. States every screen has

- Loading: a skeleton shaped like the content, not a spinner in the middle of nothing.
- Empty: what this is, why it is empty, and the first action.
- Error: what failed in plain words and a Retry; never a raw error code alone.
- Read only (viewer role, or locked after "saved but could not refresh"): controls hidden or disabled with one line saying why.

## 9. Words

- Literal names in the business's terms: Pricing, Prices listed, Price match, item or service, group. No restaurant words or icons for things that are not about food.
- A value never appears without its subject: "Price range: not set", not "Not set".
- After a save, say what changed and what happens next: "Saved. Live on the website now."
- Arabic and English are both complete on every screen; the layout follows the language's direction (logical properties only).

## 10. Guidance

- A record that needs several steps shows a checklist of them with the next step as a button.
- Each step ends by naming the next.
- Anything waiting on someone else says who: "Waiting for the subscriber to add his prices."

## 11. Access for everyone

- Everything works by keyboard in a sensible order, with a visible focus ring.
- Icons that carry meaning have accessible names; decorative ones are hidden from assistive technology.
- Touch targets at least 40 px; nothing overflows at 320 px width.
- Motion is short and respects reduced-motion.
