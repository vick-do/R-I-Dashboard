/**
 * Chart colour and geometry constants.
 *
 * The categorical slots were validated with the data-viz palette checker
 * against a white chart surface — lightness band, chroma floor, CVD separation
 * (protanopia and deuteranopia, Machado 2009 at severity 1.0), normal-vision
 * floor, and contrast — under `--pairs all`:
 *
 *   #0e8fa2, #eb6834, #4a3aa7
 *   worst all-pairs CVD ΔE 14.8 · normal-vision ΔE 23.4 · all ≥ 3:1 on white
 *
 * Slots are assigned in fixed order and never cycled. A fourth series is not a
 * new hue — fold the tail into "Other" or facet instead.
 *
 * The brand's #22b8c9 is deliberately absent: at 2.4:1 on white it fails the
 * contrast check for a data mark. Its darker step #0e8fa2 carries the brand
 * into the charts instead.
 */
export const SERIES = ['#0e8fa2', '#eb6834', '#4a3aa7'] as const;

/** Colour for series index i, held to the fixed order. */
export function seriesColor(index: number): string {
  return SERIES[index] ?? SERIES[SERIES.length - 1];
}

export const CHART_INK = {
  primary: '#0b0b0b',
  secondary: '#52514e',
  muted: '#898781',
  grid: '#e1e0d9',
  axis: '#c3c2b7',
  surface: '#ffffff',
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
