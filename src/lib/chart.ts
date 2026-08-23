/**
 * Chart colour and geometry constants.
 */
/**
 * Categorical slots, in fixed order.
 *
 * Red and the strong orange are deliberately absent. The application already
 * spends those two on status — a failed reconciliation, a figure that does not
 * add up — so a region painted red reads as an error rather than as a region.
 * They were also where the old palette landed once a chart ran past its last
 * slot, which turned most of Absa's fifteen regions into a wall of red.
 *
 * Validated as this exact order on white:
 *   worst adjacent CVD ΔE 13.0 (protan) · tritan 13.1 · normal-vision 27.5
 *   ALL CHECKS PASS
 *
 * Yellow and pink sit below 3:1 on white, so both always ship with a visible
 * label — which every chart here has, plus a table view.
 */
export const SERIES = ['#0e8fa2', '#eda100', '#4a3aa7', '#008300', '#e87ba4', '#2a78d6'] as const;

/** Slots that are safe when every pair is compared, not just adjacent ones. */
export const ALL_PAIRS_SAFE = 3;

/** Colour for series index i, held to the fixed order. */
export function seriesColor(index: number): string {
  return SERIES[index] ?? SERIES[SERIES.length - 1];
}

/**
 * Whether a set of categories can be told apart by colour at all.
 *
 * Past the last slot every category would take the same hue, which says
 * "these are all the same thing" about categories that are not. Beyond this,
 * charts drop back to a single hue and let length and label carry identity.
 */
export function canColourByCategory(count: number): boolean {
  return count <= SERIES.length;
}

/**
 * Sequential ramp for continuous magnitude — heatmaps, intensity grids.
 * One hue, light to dark. Validated monotone with adjacent ΔL ≥ 0.06.
 */
export const SEQUENTIAL = ['#d3ebf0', '#a3d7e0', '#6dc0cd', '#33a3b6', '#0e8fa2', '#0a6271'] as const;

/**
 * Ordinal ramp for discrete ordered stages — funnel steps, tiers.
 * Starts darker than the sequential ramp so the lightest step still clears the
 * surface: `--ordinal` reports the light end at 2.90:1, all checks pass.
 */
export const ORDINAL = ['#33a3b6', '#0e8fa2', '#0b5c69'] as const;

/** The de-emphasis grey, for the "one series matters, the rest are context" form. */
export const MUTED_MARK = '#d1d5db';

export const CHART_INK = {
  primary: '#111827',
  secondary: '#4b5563',
  muted: '#6b7280',
  grid: '#e5e7eb',
  axis: '#d1d5db',
  surface: '#ffffff',
  track: '#f3f4f6',
};

/** Mark geometry, per the data-viz mark specs. */
export const MARK = {
  barRadius: 4,
  barMaxSize: 28,
  /** 2px surface gap between adjacent fills. */
  barGap: 2,
  lineWidth: 2,
  dotRadius: 4,
  activeDotRadius: 6,
};

export const AXIS_TICK = { fill: CHART_INK.muted, fontSize: 11 };

/** Shared grid style: recessive, horizontal only. */
export const GRID_PROPS = {
  stroke: CHART_INK.grid,
  strokeDasharray: '0',
  vertical: false,
};
