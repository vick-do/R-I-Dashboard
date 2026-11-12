/**
 * A figure at a glance.
 *
 * One decimal all the way up, so a row of tiles reads as one scale: the compact
 * formatter used on chart axes drops to whole millions above ten and turns
 * 13,183,284 into "13M", which beside "6.4M" looks like the coarser number it
 * is not.
 */
export function headline(value: number | null): string {
  if (value === null) return '—';
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return new Intl.NumberFormat('en-GB').format(value);
}

/**
 * One figure in a dashboard's overview row.
 *
 * Deliberately not the `StatTile` the Overview uses: that one carries a delta,
 * a sparkline, a basis note and a record button, which is the right amount of
 * furniture for seven figures and far too much for ten across.
 *
 * The coloured cap is decoration and nothing else. A row of single numbers has
 * nothing for a hue to encode — none of them is a series and none shares an
 * axis with another — so the caller keys it to the figure rather than to the
 * tile's position, and it may repeat where an encoding could not.
 */
export function FigureTile({
  label,
  value,
  colour,
  exact,
  showExact = false,
  note,
}: {
  label: string;
  value: number | null;
  colour?: string;
  /** The full figure, for the title attribute, where the tile shows it rounded. */
  exact?: string;
  /** Show `exact` as the headline itself instead of the rounded figure. */
  showExact?: boolean;
  /** A short qualifier under the label, e.g. what the figure covers. */
  note?: string;
}) {
  const display = showExact && exact ? exact : headline(value);
  return (
    <div
      className="h-full overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest"
      title={showExact ? undefined : exact || undefined}
    >
      {colour ? <div aria-hidden="true" className="h-1 w-full" style={{ backgroundColor: colour }} /> : null}
      <div className="p-3">
        {/*
          No tabular figures on a headline. Equal-width digits line a column of
          numbers up, and there is no column here — they only make "844" sit
          loose and the whole row read as a readout rather than as type.
        */}
        <span className="block text-[22px] font-semibold leading-none tracking-tight text-on-surface">
          {display}
        </span>
        <span className="mt-2 block text-label-caps uppercase leading-tight text-on-surface-muted">{label}</span>
        {note ? <span className="mt-1 block text-[11px] leading-tight text-on-surface-muted">{note}</span> : null}
      </div>
    </div>
  );
}
