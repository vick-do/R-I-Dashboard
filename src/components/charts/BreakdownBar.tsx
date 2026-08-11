import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { Unit } from '../../lib/api';
import { AXIS_TICK, CHART_INK, GRID_PROPS, MARK, seriesColor } from '../../lib/chart';
import { formatCompact, formatValue } from '../../lib/format';
import { ChartTooltip } from './Tooltip';

export type BreakdownDatum = { name: string; value: number };

/**
 * Horizontal bars for a nominal breakdown (hub, sector, region, gender).
 *
 * One hue for every bar, by the colour formula: these categories are *nominal*
 * — reordering them changes nothing — so identity is already carried by the
 * axis label, and colouring each bar differently would spend the categorical
 * channel re-encoding what bar length already shows.
 *
 * Horizontal because the category names are long ("Woman's Haven Africa",
 * "Enterprise / Business Development") and would otherwise be rotated.
 */
export function BreakdownBar({
  data,
  unit = 'count',
  height,
  highlight,
}: {
  data: BreakdownDatum[];
  unit?: Unit;
  height?: number;
  /** Name of one bar to emphasise; the rest recede to gray. */
  highlight?: string;
}) {
  const rowHeight = 34;
  const chartHeight = height ?? Math.max(120, data.length * rowHeight + 32);
  const longestLabel = Math.max(...data.map((d) => d.name.length), 8);
  const axisWidth = Math.min(180, Math.max(80, longestLabel * 7));

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 56, bottom: 4, left: 0 }} barCategoryGap={MARK.barGap * 3}>
        <CartesianGrid {...GRID_PROPS} horizontal={false} vertical />
        <XAxis
          type="number"
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={{ stroke: CHART_INK.axis }}
          tickFormatter={(value: number) => formatCompact(value, unit)}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={axisWidth}
          tick={{ ...AXIS_TICK, fill: CHART_INK.secondary }}
          tickLine={false}
          axisLine={{ stroke: CHART_INK.axis }}
        />
        <Tooltip
          cursor={{ fill: 'rgba(14,143,162,0.06)' }}
          content={<ChartTooltip unit={unit} />}
        />
        <Bar
          dataKey="value"
          name="Value"
          // Rounded at the data end, square where it meets the baseline.
          radius={[0, MARK.barRadius, MARK.barRadius, 0]}
          maxBarSize={MARK.barMaxSize}
          isAnimationActive={false}
        >
          {data.map((entry) => (
            <Cell
              key={entry.name}
              fill={highlight && entry.name !== highlight ? '#c9ccd1' : seriesColor(0)}
            />
          ))}
          {/* Direct labels: the bars are few and the values are the point. */}
          <LabelList
            dataKey="value"
            position="right"
            offset={8}
            formatter={(value: number) => formatValue(value, unit)}
            style={{ fill: CHART_INK.secondary, fontSize: 11, fontWeight: 600 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
