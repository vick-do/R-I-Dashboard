/**
 * Typed client for ri-api.
 *
 * All responses use the API's envelope: { success, data, message, error }.
 * A 401 triggers one silent refresh-and-retry before the session is dropped,
 * so a 15-minute access token never interrupts someone mid-task.
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

export type Role = 'admin' | 'editor' | 'viewer';

export type User = {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  role: Role;
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
  breakdowns: Array<{ dimension: string; rows: AggregateRow[] }>;
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

  history: (params: { program: string; metric: string; periodType?: string; periodStart?: string; dimensions?: string }) =>
    request<{ versions: FactVersion[] }>(`/api/v1/facts/history${qs(params)}`),
};

export { BASE_URL };
