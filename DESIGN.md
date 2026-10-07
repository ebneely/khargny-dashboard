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
- Numbers that are compared (prices, counts, dates in a list) use tabular numerals and are aligned to the end edge of their column; the currency or unit is muted.

## 5. Lists and tables

- A list of records is a table or rows that line up: the same thing is at the same horizontal position in every row.
- Rows are at least 56 px tall with a hairline between them and a quiet background on hover and on keyboard focus. No zebra stripes.
- The first column identifies the record (thumbnail when it has a picture, then its name in the admin's language with the other language muted beneath).
- Row actions are compact icon buttons with accessible names and tooltips, at the end edge; more than three go into a menu. Delete is destructive-coloured only on hover or focus.
- A long list inside a card has a fixed height with its own scroll and a sticky header row, so the page does not grow or jump. Otherwise the page paginates with the shared pager above and below.
- Names wrap to two lines, then truncate with the full text in a title.

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
