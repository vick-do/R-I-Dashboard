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
  scorecard: (year?: number) => ['scorecard', year ?? 'all'] as const,
  compare: (metric: string, groupBy: string | null, year?: number) =>
    ['compare', metric, groupBy ?? 'none', year ?? 'all'] as const,
  funnel: (year?: number) => ['funnel', year ?? 'all'] as const,
  dataQuality: (year?: number) => ['data-quality', year ?? 'all'] as const,
  sheets: ['sheets'] as const,
  users: ['users'] as const,
  submissions: (status: string) => ['submissions', status] as const,
  audit: (action?: string) => ['audit', action ?? 'all'] as const,
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
      queryClient.invalidateQueries({ queryKey: ['scorecard'] });
      queryClient.invalidateQueries({ queryKey: ['compare'] });
      queryClient.invalidateQueries({ queryKey: ['funnel'] });
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

/** Headline figures with period-over-period change and a per-year series. */
export function useScorecard(year?: number) {
  return useQuery({
    queryKey: keys.scorecard(year),
    queryFn: () => api.scorecard({ year }),
  });
}

/** One metric ranked across every reportable programme. */
export function useCompare(metric: string, year?: number) {
  return useQuery({
    queryKey: keys.compare(metric, null, year),
    queryFn: () => api.compare({ metric, year }),
  });
}

/** One metric split by a dimension, per programme. */
export function useCompareGrouped(metric: string, groupBy: string, year?: number) {
  return useQuery({
    queryKey: keys.compare(metric, groupBy, year),
    queryFn: () => api.compareGrouped({ metric, groupBy, year }),
  });
}

export function useFunnel(year?: number) {
  return useQuery({
    queryKey: keys.funnel(year),
    queryFn: () => api.funnel({ year }).then((d) => d.stages),
  });
}

/** Where the recorded data disagrees with itself. */
export function useDataQuality(year?: number) {
  return useQuery({
    queryKey: keys.dataQuality(year),
    queryFn: () => api.dataQuality({ year }),
  });
}

export function useSheets() {
  return useQuery({ queryKey: keys.sheets, queryFn: () => api.sheets() });
}

export function useSubmissions(status = 'pending') {
  return useQuery({ queryKey: keys.submissions(status), queryFn: () => api.submissions(status) });
}

export function useReviewSubmission() {
  const queryClient = useQueryClient();
  const settle = () => {
    queryClient.invalidateQueries({ queryKey: ['submissions'] });
    queryClient.invalidateQueries({ queryKey: ['scorecard'] });
    queryClient.invalidateQueries({ queryKey: ['compare'] });
    queryClient.invalidateQueries({ queryKey: ['funnel'] });
    queryClient.invalidateQueries({ queryKey: ['summary'] });
    queryClient.invalidateQueries({ queryKey: ['data-quality'] });
    queryClient.invalidateQueries({ queryKey: ['audit'] });
  };

  return {
    approve: useMutation({ mutationFn: (id: string) => api.approveSubmission(id), onSuccess: settle }),
    returnIt: useMutation({
      mutationFn: ({ id, note }: { id: string; note: string }) => api.returnSubmission(id, note),
      onSuccess: settle,
    }),
  };
}

export function useUsers() {
  return useQuery({ queryKey: keys.users, queryFn: () => api.users().then((d) => d.users) });
}

export function useAudit(action?: string) {
  return useQuery({ queryKey: keys.audit(action), queryFn: () => api.audit({ action, limit: 100 }) });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof api.createUser>[0]) => api.createUser(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['audit'] });
    },
  });
}

export function useRevokeUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.revokeUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['audit'] });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['audit'] });
    },
  });
}

export function useResendInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.resendInvite(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Parameters<typeof api.updateUser>[1]) =>
      api.updateUser(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['audit'] });
    },
  });
}

export function useConnectSheet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof api.connectSheet>[0]) => api.connectSheet(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sheets'] }),
  });
}

export function useSyncSheet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.syncSheet(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sheets'] });
      queryClient.invalidateQueries({ queryKey: ['scorecard'] });
      queryClient.invalidateQueries({ queryKey: ['compare'] });
      queryClient.invalidateQueries({ queryKey: ['funnel'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });
      queryClient.invalidateQueries({ queryKey: ['data-quality'] });
    },
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
