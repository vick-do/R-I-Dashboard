# R&I Dashboard

Frontend for the MEST Africa **Research & Impact** platform. Vite + React 18 + TypeScript +
Tailwind, reading everything from `ri-api` — there are no hardcoded figures anywhere in this app.

## Getting started

```bash
npm install
cp .env.example .env     # or just set VITE_API_URL
npm run dev              # http://localhost:5173
npm run build
```

`ri-api` must be running (default `http://localhost:4000`). Point elsewhere with `VITE_API_URL`.

## Structure

```
src/
  lib/         api client, auth, formatting, chart tokens
  hooks/       react-query data hooks
  components/
    layout/    shell + sidebar
    ui/        card, stat tile, period selector
    charts/    chart frame, bar, line, tooltip
  pages/       login, overview, program
```

- **Routing** is real (`react-router`): `/`, `/p/:pageKey`, `/login`. Pages are bookmarkable and the
  back button works. This replaces the previous `useState` + `switch`.
- **Navigation is generated** from the programme tree the API returns, so adding a programme in the
  backend makes it appear here with no frontend change.
- **One page template serves every programme.** `ProgramPage` renders from what the data contains —
  the metrics recorded, the breakdowns that exist, whether there is a monthly series — so all 24
  previously-stubbed destinations work without a component each.

## Charts

Built to the data-viz method: form chosen by the data's job, then colour, then validation.

**Palette** (`src/lib/chart.ts`) — validated with the palette checker against a white surface under
`--pairs all`:

| Slot | Hex | Role |
|---|---|---|
| 1 | `#0e8fa2` | brand teal, darker step |
| 2 | `#eb6834` | orange |
| 3 | `#4a3aa7` | violet |

Worst all-pairs CVD ΔE 14.8 (protanopia/deuteranopia, Machado 2009 @ 1.0), normal-vision ΔE 23.4,
all ≥ 3:1 contrast. **The brand's `#22b8c9` is deliberately not a chart colour** — at 2.4:1 on white
it fails the contrast check for a data mark. It survives as `brand-bright` for large decorative
fills only, and never carries text or data.

**Rules the components enforce:**
- Nominal breakdowns (hub, sector, region) use **one hue for every bar** — bar length already
  encodes the value, so colouring each bar differently would waste the identity channel.
- Categorical colour is used only where series identity *is* the question (channel over time).
- **Colour follows the entity, not its position.** Series slots come from the dimension catalog's
  own ordering, so MEST Africa is the same teal on all nine EdTech charts. Assigning by order of
  appearance previously made a channel teal on one chart and orange on the next.
- Every chart ships a **table view** (`Show table`) — the relief channel for anyone who cannot
  separate marks by colour, and what makes figures readable in print.
- A legend appears only for two or more series; a single series is named by the title.
- Single y-axis only. Never a second scale.

## Accessibility & presentation

- The app commits to a single **light** appearance: it is shown in board and funder presentations,
  where a viewer's OS theme should not change what the audience sees.
- Mobile has a working nav drawer. The previous sidebar was `hidden md:flex` with no fallback,
  leaving phones with no navigation at all.
- The sidebar auto-expands to reveal the active page, and opening one branch no longer collapses
  its siblings.
- `@media print` hides interactive chrome so a page prints cleanly into a deck.

## Honesty in the UI

The dashboard distinguishes figures that were recorded from figures it calculated:

- A tile whose value came from summing a breakdown says **"Summed across …"** rather than presenting
  a derived number as a recorded one.
- A metric with no data reads **"No data yet"**, never `0`.
- Metrics with nothing recorded are listed under the KPI row instead of being silently dropped.
