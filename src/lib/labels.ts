import type { Dimension } from './api';
import { humanise } from './format';

/**
 * Readable names for the slugs facts are stored against.
 *
 * Dimension values travel as slugs — `product`, `citi-fm`, `fab-hub-ashanti`
 * — because that is what makes two spellings of one hub the same hub. Every
 * page that renders them needs the catalog's own label for each, its order,
 * and its colour slot, so the lookup lives here rather than in whichever page
 * happened to need it first.
 */
export type LabelIndex = {
  dimensionLabel: (name: string) => string;
  valueLabel: (dimension: string, value: string | undefined) => string;
  valueSlot: (dimension: string, value: string | undefined) => number;
  isClosed: (dimension: string) => boolean;
  /** True when the values form a sequence — cohorts, tiers, years. */
  isOrdered: (dimension: string) => boolean;
};

export function buildLabelIndex(dimensions: Dimension[]): LabelIndex {
  const byName = new Map(dimensions.map((d) => [d.name, d]));

  const sortedValues = (dimension: string) =>
    [...(byName.get(dimension)?.values ?? [])].sort((a, b) => a.order - b.order);

  return {
    dimensionLabel: (name) => byName.get(name)?.label ?? humanise(name),
    valueLabel: (dimension, value) => {
      if (!value) return 'Unspecified';
      const match = byName.get(dimension)?.values.find((v) => v.value === value);
      return match?.label ?? humanise(value);
    },
    valueSlot: (dimension, value) => {
      if (!value) return 0;
      const index = sortedValues(dimension).findIndex((v) => v.value === value);
      return index === -1 ? 0 : index;
    },
    isClosed: (dimension) => byName.get(dimension)?.isClosed ?? false,
    // Numeric values mean the axis is a sequence, so position can carry order
    // and a column chart says more than a ranked bar.
    isOrdered: (dimension) => {
      const values = byName.get(dimension)?.values ?? [];
      return values.length > 0 && values.every((v) => /^\d+$/.test(v.value));
    },
  };
}

