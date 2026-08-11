import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type CreateFactInput } from '../lib/api';

/**
 * Query keys are structured so a period change refetches only what depends on
 * the period, and the programme tree and dimension catalog stay cached.
 */
export const keys = {
  programs: ['programs'] as const,
  metrics: ['metrics'] as const,
  dimensions: ['dimensions'] as const,
  orgTotals: (year?: number) => ['org-totals', year ?? 'all'] as const,
  summary: (pageKey: string, year?: number) => ['summary', pageKey, year ?? 'all'] as const,
  history: (params: Record<string, unknown>) => ['history', params] as const,
};

// The catalog changes rarely; a long stale time keeps navigation instant.
const CATALOG_STALE_MS = 10 * 60 * 1000;

export function usePrograms() {
  return useQuery({
    queryKey: keys.programs,
    queryFn: () => api.programs().then((d) => d.programs),
    staleTime: CATALOG_STALE_MS,
  });
}

export function useMetrics() {
  return useQuery({
    queryKey: keys.metrics,
    queryFn: () => api.metrics().then((d) => d.metrics),
    staleTime: CATALOG_STALE_MS,
  });
}

/**
 * Records a figure. Every cached total, summary, and org roll-up is invalidated
 * afterwards, because a single new fact can change any of them.
 */
export function useCreateFact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateFactInput) => api.createFact(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-totals'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });
      queryClient.invalidateQueries({ queryKey: ['history'] });
    },
  });
}

export function useDimensions() {
  return useQuery({
    queryKey: keys.dimensions,
    queryFn: () => api.dimensions().then((d) => d.dimensions),
    staleTime: CATALOG_STALE_MS,
  });
}

export function useOrgTotals(year?: number) {
  return useQuery({
    queryKey: keys.orgTotals(year),
    queryFn: () => api.orgTotals({ year }).then((d) => d.totals),
  });
}

export function useProgramSummary(pageKey: string | undefined, year?: number) {
  return useQuery({
    queryKey: keys.summary(pageKey ?? '', year),
    queryFn: () => api.summary(pageKey!, { year }),
    enabled: Boolean(pageKey),
  });
}

export function useHistory(params: { program: string; metric: string; periodType?: string; periodStart?: string; dimensions?: string } | null) {
  return useQuery({
    queryKey: keys.history(params ?? {}),
    queryFn: () => api.history(params!).then((d) => d.versions),
    enabled: Boolean(params),
  });
}

/** Flattens the programme tree for lookups by pageKey. */
export function flattenPrograms<T extends { children?: T[] }>(nodes: T[] = []): T[] {
  return nodes.flatMap((node) => [node, ...flattenPrograms(node.children ?? [])]);
}
