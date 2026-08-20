# Google Stitch prompts — MEST Impact dashboard

How to use: Stitch has no memory of your product, so every prompt has to carry its own context.
Use **Experimental mode** (better instruction-following on dense layouts). Generate **one screen per
prompt**. Paste `PROMPT 0` at the top of the first prompt, then for every later screen start with
"Same design system as the previous screen." and paste only that screen's block.

Iterate with short follow-ups rather than re-pasting: "make the sidebar 260px and remove the icons",
"the KPI cards are too tall, halve the vertical padding", "use a horizontal bar chart here instead".

---

## PROMPT 0 — Design system (prepend to the first screen prompt)

```
Design a modern, professional B2B SaaS analytics dashboard for an internal web application.

PRODUCT
"MEST Impact" — the impact-reporting platform for MEST Africa, a pan-African technology
entrepreneurship institution. It reports how many people were trained, how many businesses were
supported, and how the organisation's programmes performed. Its audience is the internal Research &
Impact team, programme managers, the executive team, and funders.

VISUAL STYLE
Clean, restrained, information-dense enterprise SaaS — the register of Linear, Vercel, Stripe
Dashboard, or Google Analytics 4. Not a marketing page, not a landing page, no hero imagery, no
gradients, no glassmorphism, no emoji, no decorative illustration, no rounded pill-shaped cards, no
drop shadows on flat surfaces.

- Light theme only. Page background #F7F8FA, cards/surfaces #FFFFFF.
- Borders: 1px solid #E5E7EB. Card radius 8px. Button and input radius 6px.
- Shadows: none on cards; a soft shadow only on floating elements (dropdown, modal, drawer).
- Typography: Inter. Page title 24px/600. Section heading 16px/600. Card title 14px/600.
  Body 14px/400. Secondary and helper text 13px/400. Labels and table headers 12px/500 uppercase
  with 0.04em letter-spacing. KPI values 30px/600 with tabular figures.
- Text colours: primary #111827, secondary #4B5563, muted #6B7280.
- Brand / primary colour: teal #0E8FA2. Hover #0B7284. Light tint background #E6F4F7.
  Use it for primary buttons, active nav, selected states, and the default chart series only.
  Never as a large background fill.
- Chart categorical palette, in this fixed order: #0E8FA2 teal, #EB6834 orange, #4A3AA7 violet,
  #EDA100 yellow, #E87BA4 pink, #008300 green, #E34948 red.
- Status colours: success #0CA30C, warning #FAB219, error #D03B3B — used only for status, never
  as a chart series.
- Spacing on an 8px grid. Page padding 24px. Card padding 20px. Gap between cards 16px.
- Icons: thin 1.5px stroke line icons (Lucide / Material Symbols Outlined style), 16px or 20px.
- Charts: thin marks, hairline horizontal gridlines only, no 3D, no drop shadows, no dual y-axis,
  no pie or donut charts. Axis labels 11px muted. Every chart card has a small "..." overflow
  menu at its top right.

GLOBAL LAYOUT (every screen)
- Fixed left sidebar, 256px wide, white, 1px right border.
  Top: a 28px teal rounded-square logo mark with "MEST" wordmark and the small grey label
  "Research & Impact" beneath it.
  Nav sections with 12px uppercase muted section labels:
    REPORTING — Overview, Compare programmes
    PROGRAMMES — a collapsible tree: AI Startup Lab, Portfolio, MEST X (expanded) containing
      Digital Skills (Web3, Pre-Mest, Grow), Venture Support, Ecosystem (EdTech Mondays)
    OPERATIONS — Approvals (with a teal count badge "4"), Import centre, Data quality
      (with a red count badge "3"), Administration
  Bottom: user row with a 32px circular avatar, "Victoria Asare", and "Approver" in muted 12px.
- Top bar, 56px, white, 1px bottom border, spanning the content area: breadcrumb on the left;
  on the right a global search field, a period filter, an "Export" secondary button, and a
  bell icon.
- Content area on #F7F8FA with 24px padding and a max width of 1440px.
```

---

## PROMPT 1 — Overview (executive dashboard)

```
Screen: "Overview" — the executive summary of the whole organisation's impact.

Top bar: breadcrumb "Overview". Right side: a segmented control with "All time | 2026 | 2027"
(2026 selected), an "Export" secondary button with a download icon, and a bell icon.

Page header row: page title "Impact Overview" (24px/600) with the subtitle "Every figure is
calculated from recorded data — 9 programmes, last updated 11 August 2026" beneath it. On the
right, a primary teal button "Record a figure".

SECTION 1 — KPI row. Seven equal cards in a responsive grid (4 in the first row, 3 in the second).
Each card: a 12px uppercase muted label, a 30px/600 value, and a footer line. Cards with data also
show a small delta badge next to the value (green background tint for positive) and a 60x24px
teal sparkline in the top-right corner of the card.
  1. TOTAL PEOPLE TRAINED — 1,592 — badge "+34%" — footer "Across 3 programmes"
  2. BUSINESSES SUPPORTED — 112 — badge "+8%" — footer "Across 1 programme"
  3. JOBS CREATED — "—" in muted grey — footer "Not yet recorded" with a small "Add" text link
  4. LEARNERS IMPACTED (EDTECH) — "—" — footer "Not yet recorded"
  5. AMOUNT INVESTED — "—" — footer "Not yet recorded"
  6. EDTECH ADVOCACY — "—" — footer with an amber warning icon and "Definition unconfirmed"
  7. VENTURE ACCELERATION — "—" — footer with an amber warning icon and "Definition unconfirmed"
Cards 3–7 have a slightly muted appearance (grey value, dashed 1px border) to show they hold no data.

SECTION 2 — a two-column row, 2:1 ratio.
  LEFT, a chart card titled "People trained by programme" with the subtitle "All time · 1,592
  total" and a "Table" toggle in the header. Inside: a horizontal bar chart, all bars the same
  teal, sorted descending, with the value printed at the end of each bar and the percentage in
  muted text after it:
    Grow 793 (49.8%), Pre-Mest 761 (47.8%), Web3 38 (2.4%)
  RIGHT, a card titled "Training funnel" with three stacked horizontal stages of decreasing width:
  "Enrolled 1,592" in teal, then "Graduated" and "Employed" drawn as empty dashed placeholder bars
  with an em dash and the muted caption "Not yet recorded". Below, a muted helper line: "Recording
  graduation and employment completes this funnel."

SECTION 3 — a two-column row, equal width.
  LEFT, a chart card "Learners by hub — Grow" with a horizontal bar chart in a single teal:
  Accra 402, Whizzy Academy 236, Woman's Haven Africa 155.
  RIGHT, a chart card "Learners by gender" with a 100% stacked horizontal bar per programme
  (Grow, Pre-Mest, Web3), teal for female and orange for male, with a legend beneath.

SECTION 4 — a full-width alert card with a light amber background, a 1px amber border, an amber
warning triangle icon, the bold heading "3 data-quality issues need review", the body text
"Pre-Mest's learner count appears with four different values in the source workbook (761, 759,
758, 757). MEST Scale's sector breakdown covers 101 of 112 enterprises.", and a right-aligned
secondary button "Review issues".
```

---

## PROMPT 2 — Programme detail

```
Same design system as the previous screen.

Screen: a programme detail page for "EdTech Mondays", a media and ecosystem programme reported
through social and broadcast analytics.

Top bar breadcrumb: "MEST X / Ecosystem / EdTech Mondays".

Page header: title "EdTech Mondays" with the subtitle "Weekly EdTech conversation published across
five partner channels · 2026". Right side: a segmented period control "All time | 2026" and a
primary teal "Record a figure" button.

Below the header, a horizontal tab bar: Overview (active), Breakdowns, Trends, History, Settings.

SECTION 1 — a row of 6 compact KPI cards, smaller than the Overview's (24px values):
  IMPRESSIONS 2,800,672 (+12% badge) · REACH 1,978,763 · VIDEO VIEWS 230,786 ·
  ENGAGEMENT 7,920 · POSTS 38 · ENGAGEMENT RATE 0.28%
Each has a small teal sparkline. The first card is in a selected state with a teal 2px bottom
border, indicating it drives the charts below.

SECTION 2 — a full-width chart card, "Impressions over time", subtitle "Monthly · 2026", with a
"Table" toggle and a "..." menu in the header. A line chart with a very light teal area fill under
the line, 10 points labelled Feb through Nov on the x-axis, y-axis ticks 0 / 100k / 200k / 300k,
rising from about 198,000 in February to about 350,000 in November with a small dip in June. Show
a hover tooltip on the September point reading "September 2026 — 331,800 impressions".

SECTION 3 — a two-column row.
  LEFT, "Impressions by channel" — a horizontal bar chart in a single teal:
    MEST Africa 1,148,276 · Citi FM 672,161 · Channel One TV 504,121 · Panelists 308,074 ·
    Plugin Digital 168,040
  RIGHT, "Impressions by platform" — a horizontal bar chart in a single teal:
    LinkedIn · Facebook · YouTube · X (Twitter) · Instagram · TikTok, with plausible descending
    values.

SECTION 4 — a full-width card "All metrics" containing a 12-cell grid of small multiples
(4 columns x 3 rows). Each cell has a 12px metric name, a 24px value, and a small teal sparkline
underneath, all sharing the same time axis: Impressions, Reach, Video views, Engagement, Posts,
Reactions, Comments, Shares, Clicks, Engagement rate, Click-through rate, and Targeted impressions
(this last one greyed with "No data").

SECTION 5 — a full-width data table card, "Recorded figures", with the columns
Metric | Period | Breakdown | Value | Source | Last updated | (row action).
Six rows of realistic data, e.g. "Impressions | November 2026 | Channel = Citi FM | 84,220 |
Import batch #17 | 11 Aug 2026". The Source cells are teal text links. Each row ends with a
"..." icon button. The table has a search field and a "Filter" button above it, and pagination
beneath reading "Showing 6 of 214".
```

---

## PROMPT 3 — Provenance drawer

```
Same design system as the previous screen.

Screen: the programme detail page in the background, dimmed by a 40% black scrim, with a right-hand
side drawer open — 480px wide, full height, white, soft left shadow.

Drawer header: a 12px uppercase muted label "FIGURE DETAIL", the 18px/600 title "402 learners",
and an X close icon button at the top right. Beneath the title, a row of small grey chips:
"Grow", "Learners trained", "All time", and a teal-tinted chip "Hub: Accra".

Body, in labelled sections separated by 1px dividers:

1. "VALUE" — the number 402 at 36px/600, next to a small green-tinted badge with a check icon
   reading "Recorded". Below, muted 13px text: "Version 3 · current since 11 Aug 2026".

2. "SOURCE" — a light grey inset panel with monospace 12px text:
     File:  Data Summary Sheet.xlsx
     Sheet: Grow
     Block: Hub / Total Learners
     Cell:  C7
   with a small "Open source file" text link beneath.

3. "HISTORY" — a vertical timeline with three entries, each a coloured dot on a vertical
   connector line:
     · Teal filled dot — "402" bold, a teal "Current" badge, "11 Aug 2026, 14:12",
       "Import — batch #17", "Approved by Victoria Asare"
     · Grey hollow dot — "398" in grey with strikethrough, a grey "Superseded" badge,
       "2 Jul 2026, 09:41", "Manual entry — Ama Owusu",
       and an italic note "Cohort 6 intake corrected after registry reconciliation"
     · Grey hollow dot — "402" grey strikethrough, "Superseded", "14 Mar 2026, 16:08",
       "Import — batch #4", "First recorded value"

Drawer footer, pinned to the bottom with a 1px top border: a primary teal button "Propose a
revision", a secondary button "View import batch", and muted 12px text on the right reading
"Your scope: Digital Skills".
```

---

## PROMPT 4 — Approvals queue

```
Same design system as the previous screen.

Screen: "Approvals" — a review queue where an approver publishes or returns figures proposed by
scoped editors.

Page header: title "Approvals", subtitle "Figures proposed by editors, awaiting review".
Right side: a "Filter" secondary button and a "Bulk approve" secondary button.

A row of three small stat cards: PENDING 4 · RETURNED 1 · MEDIAN WAIT 2.1 days.

Below, a tab bar: Pending (4) · Returned (1) · Approved · All.

The main card is a list, not a dense table — each row is a 1px-separated block, 96px tall,
with generous padding:

Row 1: a 32px circular avatar with initials "AO"; then the line "Ama Owusu proposed a revision"
in 14px with "2 days ago" in muted 13px beside it; the second line "Grow · Learners trained ·
Hub = Whizzy Academy" in 13px muted; then a value change rendered as "236" struck through in grey,
an arrow icon, and "248" in 18px/600, followed by a green-tinted "+12" badge; then an italic
13px note "Twelve learners registered late and missed the original count". Right side: a
secondary "Return" button and a primary teal "Approve" button.

Row 2: avatar "KB"; "Kwame Boateng recorded a new figure"; "Pre-Mest · Graduates · All time";
value "648" in 18px/600 with a teal-tinted badge "First value"; below it a light amber inline
warning strip with a warning icon reading "Pre-Mest's learner count has four conflicting values
in the source — resolve before publishing a graduation rate". Same two buttons.

Row 3: avatar "NM"; "Nana Mensah recorded 2 figures"; "EdTech Mondays · Video views, Clicks";
"6 days ago". Same two buttons.

Row 4: avatar "AO"; "Ama Owusu proposed a revision"; "Grow · Mothers enrolled"; value change
"84 → 91". Same two buttons.

Beneath the list, a full-width card "Roles" with four columns, each a small block with a bold
role name and two lines of 13px muted description:
  Viewer — reads dashboards and exports; cannot record anything
  Editor (scoped) — proposes figures for assigned programmes and metrics only
  Approver — publishes proposals, sets targets, writes directly
  Admin — everything, plus users, scopes, the metric catalog, and import rollback
```

---

## PROMPT 5 — Import centre

```
Same design system as the previous screen.

Screen: "Import centre" — a multi-step wizard for importing an Excel workbook of impact data.

Page header: title "Import centre", subtitle "Upload a workbook, preview what it will write,
then commit". Right side: a primary teal "New import" button.

Directly under the header, a horizontal 4-step stepper with connecting lines:
  1 Upload (complete, teal filled circle with a check)
  2 Map columns (complete, teal filled circle with a check)
  3 Review (active, teal ring with the number 3)
  4 Commit (upcoming, grey)

Main area, two columns at a 2:1 ratio.

LEFT COLUMN — a card headed "Data Summary Sheet.xlsx" with an amber-tinted badge "Dry run — not
committed", and the subtitle "Sheet: Grow · Block: Hub / Total Learners · Layout: long".
Inside, a data table with the columns Cell | Interpreted as | Value | Result:
  C7  | Hub = Accra                  | 402 | grey "Unchanged"
  C8  | Hub = Whizzy Academy         | 236 | grey "Unchanged"
  C9  | Hub = Woman's Haven Africa   | 155 | green "New"
  C10 | Stated total                 | 793 | amber "Used as check, not imported"
  C11 | Row missing a hub label      |  14 | grey "Skipped"
The last two rows have a very light grey background.
A card footer with a 1px top border shows "1 new · 2 unchanged · 1 skipped" on the left and, on
the right, a secondary "Discard" button and a primary teal "Commit import" button.

RIGHT COLUMN — two stacked cards.
  Card A, "Reconciliation", subtitle "Totals stated in the sheet are checked against the imported
  rows, never imported as data". Three list rows, each with a status icon, two lines of text and a
  right-aligned status label:
    green check — "Grow: hub rows vs stated total" / "793 vs 793" — PASS
    amber triangle — "Pre-Mest: gender rows vs stated total" / "759 vs 761, off by 2" — WARNING
    red circle-x — "MEST Scale: sector rows vs enterprises" / "101 of 112, 11 unsectored" — FAILED
  A footer line in muted 13px: "Commit is blocked while a check fails unless it is explicitly
  acknowledged."
  Card B, "Recent batches" — five compact rows, each with a small status dot, the batch label
  (e.g. "#17 EdTech Mondays — November 2026"), and a right-aligned date. One row is greyed with
  the italic suffix "rolled back". A "View all 37" text link at the bottom.
```

---

## PROMPT 6 — Data quality

```
Same design system as the previous screen.

Screen: "Data quality" — where inconsistencies in the source data are surfaced for the team to
resolve.

Page header: title "Data quality", subtitle "Issues found in the recorded data and its sources".
Right side: an "Export report" secondary button.

A row of four stat cards: OPEN ISSUES 3 (red value) · METRICS WITH NO DATA 5 ·
PROGRAMMES REPORTING 3 of 9 · LAST IMPORT 11 Aug 2026.

A filter row: a search field, and pill filter chips "All (3)", "Conflicting values (1)",
"Incomplete breakdown (1)", "Definition unconfirmed (2)".

Below, three expandable issue cards, the first one expanded:

Issue 1, expanded — a red left border 3px, a red circle-x icon, the 16px/600 title "Pre-Mest
learner count has four conflicting values", a red-tinted severity badge "Conflict", and a chevron.
Expanded body contains a small table:
  Source                          | Value | Difference
  Stated total in the sheet        |  761  |  —
  Sum of gender rows               |  759  |  −2
  Sheet's own gender subtotal      |  758  |  −3
  Sum of track rows                |  757  |  −4
and beneath it the muted body text "The dashboard currently reports 761, the recorded programme
total. Choosing a different basis changes the organisation figure by up to 4." Two buttons at the
bottom of the card: primary teal "Resolve" and secondary "View in workbook".

Issue 2, collapsed — amber left border, warning triangle, "MEST Scale sector breakdown covers 101
of 112 enterprises", amber badge "Incomplete", chevron.

Issue 3, collapsed — amber left border, warning triangle, "2 headline metrics have unconfirmed
definitions", amber badge "Definition", chevron.

At the bottom, a card "Coverage" with a matrix table: programmes down the rows (Grow, Pre-Mest,
Web3, MEST Scale, EdTech Mondays, Portfolio, USL, UNDP, Absa) and metrics across the columns
(Learners, Graduates, Employed, Enterprises, Jobs, Invested). Each cell is either a small teal
filled square (recorded), a light grey square (not recorded), or an amber square (partial). A
small legend sits beneath.
```

---

## PROMPT 7 — Record a figure (modal)

```
Same design system as the previous screen.

Screen: a programme detail page dimmed behind a 40% black scrim, with a centred modal dialog
560px wide, white, 8px radius, soft shadow.

Modal header: the 16px/600 title "Record a figure", the 13px muted subtitle "Saved figures are
versioned — revising one keeps the previous value in history", and an X close icon.

Form body, single column, 16px between fields. Every field has a 13px/500 label above it and a
36px-tall input with a 1px #E5E7EB border and a 6px radius:
  · Metric — a select showing "Learners trained", with 12px muted helper text beneath reading
    "Total individuals who completed at least one training programme"
  · Programme — a select showing "Grow"
  · Two fields side by side: Period type — a select showing "All time"; and Year — a select,
    disabled and greyed
  · A bordered fieldset labelled "Breakdown (optional)" containing two selects side by side,
    "Hub" set to "Accra" and "Gender" set to "All", with 12px muted helper text
    "Leave blank to record the programme's overall figure"
  · Value — a number input containing 402, right-aligned with tabular figures
  · Note (optional) — a text input with the placeholder "Where this figure came from"

An inline info strip with a light teal background, an info icon, and the 13px text "A figure
already exists at this coordinate (402). Saving a different value will create version 4."

Modal footer with a 1px top border: a secondary "Cancel" button and a primary teal "Save figure"
button, right-aligned. On the left of the footer, muted 12px text: "Will be submitted for approval".
```

---

## PROMPT 8 — Administration: users & permissions

```
Same design system as the previous screen.

Screen: "Administration" — user and permission management.

Page header: title "Administration", subtitle "Users, roles, and what each person may change".
Right side: a primary teal "Invite user" button.

A horizontal tab bar: Users (active) · Metrics · Dimensions · Programmes · Audit log.

A toolbar row: a search field with a magnifier icon and placeholder "Search users", a "Role"
filter dropdown, and a "Status" filter dropdown.

A data table card with the columns User | Role | Scope | Last active | Status | (actions).
Six rows. The User cell holds a 32px circular avatar, the name in 14px, and the email in 13px
muted beneath. The Role cell is a small bordered pill. The Scope cell holds either the muted text
"All programmes" or up to two teal-tinted chips plus a "+2" overflow chip. The Status cell holds a
small dot and a label. The actions cell is a "..." icon button.
  Victoria Asare · victoria@meltwater.org · Approver · All programmes · 2 hours ago · Active
  Kwame Boateng · kwame@... · Editor · chips "Digital Skills" "Grow" · Yesterday · Active
  Ama Owusu · ama@... · Editor · chips "Grow" +2 · 3 days ago · Active
  Nana Mensah · nana@... · Editor · chip "EdTech Mondays" · 6 days ago · Active
  Yaw Darko · yaw@... · Viewer · All programmes · 2 weeks ago · Active
  Efua Sam · efua@... · Editor · chip "Portfolio" · 3 months ago · Inactive (grey row)

To the right of the table, or beneath it, a card "Editing a user's scope" showing the permission
editor: the user's name and role at the top, then a two-column transfer control — the left column
lists all programmes with checkboxes, the right column lists the metrics that user may record —
with a footer explaining in 13px muted text "A scoped editor may only propose figures for the
programmes and metrics selected here. Everything else is read-only for them."
```

---

## Follow-up prompts worth having ready

- "Make the whole layout denser — reduce card padding to 16px and row height to 44px."
- "Add empty states: what each screen looks like when there is no data yet."
- "Show the mobile/tablet layout of this screen at 768px wide."
- "Replace the grouped bar chart with a horizontal bar chart, single colour."
- "Add keyboard focus rings and hover states to every interactive element."
- "Show this screen as a viewer would see it — no Record, Approve, or Edit buttons."
