import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { Unit } from '../../lib/api';
import { AXIS_TICK, CHART_INK, GRID_PROPS, MARK, seriesColor } from '../../lib/chart';
import { formatCompact } from '../../lib/format';
import { ChartTooltip } from './Tooltip';

export type TrendPoint = { period: string } & Record<string, string | number>;

/**
 * Change over time, one line per series.
 */
export function TrendLine({
  data,
  seriesKeys,
  unit = 'count',
  height = 260,
}: {
  data: TrendPoint[];
  /**
   * `color` is supplied by the caller rather than derived from array position,
   * so an entity keeps the same colour across every chart on a page.
   */
  seriesKeys: Array<{ key: string; label: string; color?: string }>;
  unit?: Unit;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
        <CartesianGrid {...GRID_PROPS} />
        <XAxis
          dataKey="period"
          tick={{ ...AXIS_TICK, fill: CHART_INK.secondary }}
          tickLine={false}
          axisLine={{ stroke: CHART_INK.axis }}
        />
        <YAxis
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          width={52}
          tickFormatter={(value: number) => formatCompact(value, unit)}
        />
        <Tooltip
          cursor={{ stroke: CHART_INK.axis, strokeWidth: 1 }}
          content={<ChartTooltip unit={unit} />}
        />
        {seriesKeys.map((series, index) => {
          const color = series.color ?? seriesColor(index);
          return (
            <Line
              key={series.key}
              type="monotone"
              dataKey={series.key}
              name={series.label}
              stroke={color}
              strokeWidth={MARK.lineWidth}
              // A 2px surface ring keeps overlapping markers separable.
              dot={{ r: MARK.dotRadius, fill: color, stroke: CHART_INK.surface, strokeWidth: 2 }}
              activeDot={{ r: MARK.activeDotRadius, stroke: CHART_INK.surface, strokeWidth: 2 }}
              isAnimationActive={false}
              connectNulls
            />
          );
        })}
      </LineChart>
    </ResponsiveContainer>
  );
}
