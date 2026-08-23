/**
 * Typed client for ri-api.
 */
const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

const ACCESS_KEY = 'ri.accessToken';
const REFRESH_KEY = 'ri.refreshToken';

/**
 * A real Error subclass, so it survives being thrown through react-query and
 * narrows cleanly at the call site instead of needing an unchecked cast.
 */
export class ApiError extends Error {
  status: number;
  code: string;
  details: Array<{ field?: string; message: string }>;

  constructor(status: number, code: string, message: string, details: Array<{ field?: string; message: string }> = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/** Message for any thrown value, so error UI never renders "undefined". */
export function errorMessage(error: unknown): string {
  if (isApiError(error)) return error.message;
  if (error instanceof Error) return error.message;
  return 'Something went wrong. Please try again.';
}

export const tokens = {
  get access() {
    return localStorage.getItem(ACCESS_KEY);
  },
  get refresh() {
    return localStorage.getItem(REFRESH_KEY);
  },
  set(access: string, refresh: string) {
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

function toApiError(status: number, body: any): ApiError {
  return new ApiError(
    status,
    body?.error?.code ?? 'UNKNOWN',
    body?.error?.message ?? 'Something went wrong. Please try again.',
    body?.error?.details ?? []
  );
}

let refreshInFlight: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  // Several parallel queries can 401 at once; they must share one refresh so
  // the rotating refresh token is not spent twice.
  if (refreshInFlight) return refreshInFlight;

  const refresh = tokens.refresh;
  if (!refresh) return false;

  refreshInFlight = (async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: refresh }),
      });
      if (!res.ok) return false;
      const body = await res.json();
      tokens.set(body.data.accessToken, body.data.refreshToken);
      return true;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  formData?: FormData;
  signal?: AbortSignal;
};

async function request<T>(path: string, options: RequestOptions = {}, isRetry = false): Promise<T> {
  const { method = 'GET', body, formData, signal } = options;
  const access = tokens.access;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      ...(formData ? {} : { 'Content-Type': 'application/json' }),
      ...(access ? { Authorization: `Bearer ${access}` } : {}),
    },
    body: formData ?? (body ? JSON.stringify(body) : undefined),
    signal,
  });

  if (res.status === 401 && !isRetry && tokens.refresh) {
    if (await tryRefresh()) return request<T>(path, options, true);
    tokens.clear();
    window.dispatchEvent(new CustomEvent('ri:signed-out'));
  }

  const text = await res.text();
  const parsed = text ? JSON.parse(text) : {};

  if (!res.ok) throw toApiError(res.status, parsed);
  return parsed.data as T;
}

function qs(params: Record<string, string | number | boolean | undefined | null>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  }
  const str = search.toString();
  return str ? `?${str}` : '';
}

// ---------------------------------------------------------------- types

export type Role = 'admin' | 'approver' | 'editor' | 'viewer';

export type Scopes = { programs: string[]; metrics: string[] };

export type User = {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  role: Role;
  isActive?: boolean;
  lastLogin?: string | null;
  status?: 'active' | 'invited' | 'disabled';
  invitedAt?: string | null;
  scopes?: Scopes;
  /** How much of the record this person is attached to. */
  footprint?: { facts: number; auditEntries: number };
};

export type Invite = { url: string; expiresAt: string };

export type AuditEntry = {
  _id: string;
  action: string;
  entityType: string;
  summary: string | null;
  createdAt: string;
  ip: string | null;
  before: unknown;
  after: unknown;
  actor: { firstName: string; lastName: string; email: string; role: Role } | null;
};

export type ProgramNode = {
  id: string;
  pageKey: string;
  name: string;
  parent: string | null;
  depth: number;
  category: string;
  metricKeys: string[];
  description: string | null;
  isReportable: boolean;
  children: ProgramNode[];
};

export type Unit = 'count' | 'currency' | 'percent' | 'ratio';

export type Basis = 'recorded_total' | 'derived_from_breakdown' | 'partly_derived' | 'no_data';

export type OrgTotal = {
  key: string;
  /** Overview wording, e.g. "Total no. of people trained". */
  label: string;
  /** The metric's own name, used where the shorter label would be ambiguous. */
  metricLabel: string;
  description: string | null;
  unit: Unit;
  value: number | null;
  programCount: number;
  basis: Basis;
};

export type AggregateRow = {
  dimensions: Record<string, string>;
  periodStart: string | null;
  periodLabel: string | null;
  value: number;
  factCount: number;
};

export type MetricSummary = {
  key: string;
  label: string;
  unit: Unit;
  aggregation: 'sum' | 'avg' | 'latest';
  category: string;
  total: number | null;
  basis: Basis;
  derivedFrom: string[] | null;
  breakdowns: Array<{ dimension: string; dimensions: string[]; rows: AggregateRow[] }>;
  trend: { groupBy: string | null; rows: AggregateRow[] } | null;
};

export type ProgramSummary = {
  program: {
    id: string;
    pageKey: string;
    name: string;
    description: string | null;
    isReportable: boolean;
  };
  rolledUp: boolean;
  availableYears: number[];
  metrics: MetricSummary[];
};

/**
 * Period-over-period change. Null whenever the metric does not have two
 * comparable years — the API refuses to compare an all-time total against one
 * year's figure, so the UI shows no badge rather than a flattering one.
 */
export type Delta = {
  from: number;
  to: number;
  fromYear: number;
  toYear: number;
  change: number;
  percent: number;
};

export type ScorecardTotal = OrgTotal & {
  delta: Delta | null;
  series: Array<{ year: number; value: number }>;
};

export type CompareRow = {
  pageKey: string | null;
  name: string;
  value: number;
  basis: Basis;
  derivedFrom: string[] | null;
  share: number | null;
};

export type CompareGroupedRow = {
  pageKey: string | null;
  name: string;
  total: number;
  segments: Array<{ value: string; amount: number; share: number | null }>;
};

export type FunnelStage = {
  key: string;
  label: string;
  unit: Unit;
  value: number | null;
  programCount: number;
  basis: Basis;
  /** Share of the stage immediately before this one, or null when that stage has no figure. */
  conversion: number | null;
};

export type QualityReading = {
  basis: string;
  signature: string[];
  value: number;
  parts: number;
};

export type QualityIssue = {
  kind: 'conflicting_values' | 'incomplete_breakdown' | 'reconciliation_failed';
  severity: 'error' | 'warning';
  title: string;
  programPageKey: string | null;
  programName: string;
  metricKey?: string | null;
  metricLabel?: string;
  unit?: Unit;
  period?: string;
  spread?: number;
  readings?: QualityReading[];
  detail?: string;
  sourceRef?: string;
};

export type QualityReport = {
  issues: QualityIssue[];
  counts: { total: number; errors: number; warnings: number };
  coverage: {
    metrics: Array<{ key: string; label: string; category: string }>;
    programs: Array<{ pageKey: string; name: string; expected: string[]; recorded: string[] }>;
  };
};

export type SheetSource = {
  _id: string;
  spreadsheetId: string;
  spreadsheetTitle: string;
  tabName: string;
  program: { pageKey: string; name: string } | null;
  isEnabled: boolean;
  autoCommit: boolean;
  maxChangePercent: number;
  lastSyncedAt: string | null;
  lastStatus: 'never_run' | 'synced' | 'needs_review' | 'failed';
  lastMessage: string;
};

export type SheetTab = { name: string; rowCount: number; columnCount: number };

export type SheetInspection = {
  title: string;
  tabs: SheetTab[];
  suggestion: {
    suggestion: { confidence: 'high' | 'medium' | 'low'; layout: string; notes: string[] } & Record<string, unknown>;
    rowCount: number;
    columnCount: number;
    preview: {
      rows: Array<{ row: number; cells: Array<{ address: string; value: string | number | null; isNumber: boolean }> }>;
      truncated: boolean;
    };
  } | null;
};

export type SheetDryRun = {
  summary: { created: number; updated: number; unchanged: number; conflicts: number; errors: number; checksFailed: number };
  checks: Array<{ label: string; expected: number; actual: number; difference: number; status: 'pass' | 'warn' | 'fail' }>;
  issues: Array<{ severity: string; message: string }>;
  wouldAutoCommit: boolean;
  heldBecause: string[];
  sample: Array<{ metric: string; period: string; dimensions: Record<string, string>; value: number; sourceRef: string }>;
};

export type Submission = {
  id: string;
  program: { pageKey: string; name: string } | null;
  metric: { key: string; label: string; unit: Unit } | null;
  periodLabel: string;
  dimensions: Record<string, string>;
  value: number;
  currentValue: number | null;
  change: number | null;
  percent: number | null;
  isFirstValue: boolean;
  note: string | null;
  status: 'pending' | 'approved' | 'returned';
  submittedBy: { firstName: string; lastName: string; email: string } | null;
  submittedAt: string;
  reviewedBy: { firstName: string; lastName: string } | null;
  reviewedAt: string | null;
  reviewNote: string | null;
};

export type HeldBatch = {
  id: string;
  fileName: string;
  sheetName: string;
  program: { pageKey: string; name: string } | null;
  createdAt: string;
  failedChecks: Array<{ label: string; expected: number; actual: number }>;
  issues: Array<{ message: string }>;
};

export type ApprovalQueue = {
  submissions: Submission[];
  heldBatches: HeldBatch[];
  counts: { pending: number; returned: number; heldBatches: number; total: number };
  canReview: boolean;
};

export type DimensionValue = { value: string; label: string; order: number };
export type Dimension = {
  name: string;
  label: string;
  /** Closed axes reject unknown values; open ones grow as new values are recorded. */
  isClosed: boolean;
  values: DimensionValue[];
};

export type Metric = {
  key: string;
  label: string;
  description: string | null;
  unit: Unit;
  aggregation: 'sum' | 'avg' | 'latest';
  category: string;
  allowedDimensions: string[];
  headlineOrder: number | null;
  headlineLabel: string | null;
};

export type CreateFactInput = {
  program: string;
  metric: string;
  periodType: 'all_time' | 'year' | 'quarter' | 'month';
  year?: number;
  month?: number;
  quarter?: number;
  dimensions?: Record<string, string>;
  value: number;
  note?: string;
};

export type CreateFactResult = {
  fact: { value: number; periodLabel: string };
  outcome: 'created' | 'updated' | 'unchanged';
};

export type FactVersion = {
  _id: string;
  value: number;
  version: number;
  isCurrent: boolean;
  periodLabel: string;
  sourceRef: string | null;
  source: string;
  createdAt: string;
  enteredBy: { firstName: string; lastName: string } | null;
  batch: { fileName: string; sheetName: string; committedAt: string } | null;
};

// ------------------------------------------------------------- endpoints

export const api = {
  login: (email: string, password: string) =>
    request<{ user: User; accessToken: string; refreshToken: string }>('/api/v1/auth/login', {
      method: 'POST',
      body: { email, password },
    }),

  me: () => request<{ user: User }>('/api/v1/auth/me'),

  users: () => request<{ users: User[] }>('/api/v1/auth/users'),

  submissions: (status = 'pending') =>
    request<ApprovalQueue>(`/api/v1/submissions${qs({ status })}`),

  approveSubmission: (id: string) =>
    request<{ submission: Submission }>(`/api/v1/submissions/${id}/approve`, { method: 'POST' }),

  returnSubmission: (id: string, note: string) =>
    request<{ submission: Submission }>(`/api/v1/submissions/${id}/return`, {
      method: 'POST',
      body: { note },
    }),

  createUser: (body: {
    firstName: string;
    lastName: string;
    email: string;
    role: Role;
    password?: string;
    scopes?: Scopes;
  }) => request<{ user: User; invite: Invite | null }>('/api/v1/auth/users', { method: 'POST', body }),

  revokeUser: (id: string) =>
    request<{ user: User }>(`/api/v1/auth/users/${id}/revoke`, { method: 'POST' }),

  deleteUser: (id: string) =>
    request<{ footprint: { facts: number } }>(`/api/v1/auth/users/${id}`, { method: 'DELETE' }),

  resendInvite: (id: string) =>
    request<{ invite: Invite }>(`/api/v1/auth/users/${id}/invite`, { method: 'POST' }),

  getInvite: (token: string) =>
    request<{ firstName: string; lastName: string; email: string; role: Role }>(
      `/api/v1/auth/invite/${token}`
    ),

  acceptInvite: (token: string, password: string) =>
    request<{ user: User; accessToken: string; refreshToken: string }>(`/api/v1/auth/invite/${token}`, {
      method: 'POST',
      body: { password },
    }),

  updateUser: (id: string, body: Partial<{ role: Role; isActive: boolean; scopes: Scopes; password: string }>) =>
    request<{ user: User }>(`/api/v1/auth/users/${id}`, { method: 'PUT', body }),

  audit: (params: { action?: string; limit?: number } = {}) =>
    request<{ entries: AuditEntry[]; actions: string[] }>(`/api/v1/audit${qs(params)}`),

  logout: () =>
    request<Record<string, never>>('/api/v1/auth/logout', {
      method: 'POST',
      body: { refreshToken: tokens.refresh },
    }),

  programs: () => request<{ programs: ProgramNode[] }>('/api/v1/programs'),

  dimensions: () => request<{ dimensions: Dimension[] }>('/api/v1/dimensions'),

  metrics: () => request<{ metrics: Metric[] }>('/api/v1/metrics'),

  createFact: (input: CreateFactInput) =>
    request<CreateFactResult>('/api/v1/facts', { method: 'POST', body: input }),

  orgTotals: (params: { year?: number } = {}) =>
    request<{ totals: OrgTotal[] }>(`/api/v1/facts/org-totals${qs(params)}`),

  scorecard: (params: { year?: number } = {}) =>
    request<{ totals: ScorecardTotal[]; years: number[] }>(`/api/v1/insights/scorecard${qs(params)}`),

  compare: (params: { metric: string; year?: number }) =>
    request<{ metric: { key: string; label: string; unit: Unit }; groupBy: null; total: number | null; rows: CompareRow[] }>(
      `/api/v1/insights/compare${qs(params)}`
    ),

  compareGrouped: (params: { metric: string; groupBy: string; year?: number }) =>
    request<{ metric: { key: string; label: string; unit: Unit }; groupBy: string; rows: CompareGroupedRow[] }>(
      `/api/v1/insights/compare${qs(params)}`
    ),

  dataQuality: (params: { year?: number } = {}) =>
    request<QualityReport>(`/api/v1/insights/data-quality${qs(params)}`),

  sheets: () => request<{ sources: SheetSource[]; configured: boolean }>('/api/v1/sheets'),

  inspectSheet: (params: { spreadsheetId: string; tabName?: string }) =>
    request<SheetInspection>(`/api/v1/sheets/inspect${qs(params)}`),

  dryRunSheet: (body: { spreadsheetId: string; tabName: string; program: string; mapping: unknown }) =>
    request<SheetDryRun>('/api/v1/sheets/dry-run', { method: 'POST', body }),

  connectSheet: (body: {
    spreadsheetId: string;
    tabName: string;
    program: string;
    mapping: unknown;
    autoCommit?: boolean;
    maxChangePercent?: number;
  }) => request<{ source: SheetSource }>('/api/v1/sheets', { method: 'POST', body }),

  sheetStatus: () =>
    request<{ configured: boolean; serviceAccount: string | null }>('/api/v1/sheets/status'),

  syncSheet: (id: string) =>
    request<{ status: string }>(`/api/v1/sheets/${id}/sync`, { method: 'POST' }),

  funnel: (params: { year?: number } = {}) =>
    request<{ stages: FunnelStage[] }>(`/api/v1/insights/funnel${qs(params)}`),

  summary: (pageKey: string, params: { year?: number } = {}) =>
    request<ProgramSummary>(`/api/v1/facts/summary${qs({ program: pageKey, ...params })}`),

  aggregate: (params: {
    program?: string;
    metric: string;
    groupBy?: string;
    year?: number;
    splitByPeriod?: boolean;
    includeDescendants?: boolean;
  }) =>
    request<{ metric: { key: string; label: string; unit: Unit }; groupBy: string[]; rows: AggregateRow[] }>(
      `/api/v1/facts/aggregate${qs(params)}`
    ),

  byYear: (params: { program: string; metric: string }) =>
    request<{
      metric: { key: string; label: string; unit: Unit };
      points: Array<{ year: number; value: number; basis: Basis }>;
    }>(`/api/v1/insights/by-year${qs(params)}`),

  history: (params: { program: string; metric: string; periodType?: string; periodStart?: string; dimensions?: string }) =>
    request<{ versions: FactVersion[] }>(`/api/v1/facts/history${qs(params)}`),
};

export { BASE_URL };
