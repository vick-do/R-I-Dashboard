import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

/**
 * The period filter is global chrome, not a per-page control: it lives in the top bar and
 * scopes every panel below it. Per the interaction spec, one filter row above everything it
 * scopes — never a filter inside a chart card.
 */
type PeriodState = {
  year: number | undefined;
  setYear: (year: number | undefined) => void;
};

const PeriodContext = createContext<PeriodState | null>(null);

export function PeriodProvider({ children }: { children: ReactNode }) {
  const [year, setYear] = useState<number | undefined>(undefined);
  const value = useMemo(() => ({ year, setYear }), [year]);
  return <PeriodContext.Provider value={value}>{children}</PeriodContext.Provider>;
}

export function usePeriod(): PeriodState {
  const context = useContext(PeriodContext);
  if (!context) throw new Error('usePeriod must be used inside PeriodProvider');
  return context;
}
