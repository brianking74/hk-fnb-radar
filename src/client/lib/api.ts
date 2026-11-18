// Typed fetch wrappers for every public API endpoint, plus a small args-driven
// useApi hook. Same-origin endpoints — no base URL needed. No react-query.
import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  EntitiesResponse,
  Entity,
  EntityDetailResponse,
  ExpiryItem,
  MetaResponse,
  Paginated,
  SignalListItem,
  SignalsResponse,
  SignalType,
  SourceId,
  WineSpiritsStats
} from '../../shared/types';

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, code: string) {
    super(code);
    this.name = 'ApiError';
    this.status = status;
  }
}

export type QueryValue = string | number | boolean | undefined | null;

function buildPath(path: string, params: Record<string, QueryValue>): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    sp.set(key, String(value));
  }
  const qs = sp.toString();
  return qs ? `${path}?${qs}` : path;
}

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, { signal, headers: { Accept: 'application/json' } });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new ApiError(0, 'network_error');
  }
  if (!res.ok) {
    let code = 'request_failed';
    try {
      const body = (await res.json()) as { error?: string };
      if (typeof body.error === 'string' && body.error) code = body.error;
    } catch {
      // Non-JSON error body — keep the generic code.
    }
    throw new ApiError(res.status, code);
  }
  return (await res.json()) as T;
}

// ------------------------------------------------------------------ params

export interface EntitiesParams {
  q?: string;
  source?: SourceId;
  district?: string;
  lic_type?: string;
  page?: number;
  page_size?: number;
  include_absent?: boolean;
}

export interface SignalsParams {
  type?: SignalType;
  source?: SourceId;
  district?: string;
  page?: number;
  page_size?: number;
}

export interface WineSignalsParams {
  type?: SignalType;
  district?: string;
  page?: number;
  page_size?: number;
}

export interface WineExpiryParams {
  window?: number;
  district?: string;
  page?: number;
  page_size?: number;
}

export interface WineDirectoryParams {
  q?: string;
  district?: string;
  lic_type?: string;
  page?: number;
  page_size?: number;
}

// --------------------------------------------------------------- endpoints

export function fetchHealth(signal?: AbortSignal): Promise<{ ok: boolean; time: string }> {
  return getJson('/api/health', signal);
}

export function fetchMeta(signal?: AbortSignal): Promise<MetaResponse> {
  return getJson('/api/meta', signal);
}

export function fetchEntities(params: EntitiesParams, signal?: AbortSignal): Promise<EntitiesResponse> {
  return getJson(
    buildPath('/api/entities', {
      q: params.q,
      source: params.source,
      district: params.district,
      lic_type: params.lic_type,
      page: params.page,
      page_size: params.page_size,
      include_absent: params.include_absent ? 1 : undefined
    }),
    signal
  );
}

export function fetchEntity(id: number, signal?: AbortSignal): Promise<EntityDetailResponse> {
  return getJson(`/api/entities/${encodeURIComponent(String(id))}`, signal);
}

export function fetchSignals(params: SignalsParams, signal?: AbortSignal): Promise<SignalsResponse> {
  return getJson(
    buildPath('/api/signals', {
      type: params.type,
      source: params.source,
      district: params.district,
      page: params.page,
      page_size: params.page_size
    }),
    signal
  );
}

export function fetchWineStats(signal?: AbortSignal): Promise<WineSpiritsStats> {
  return getJson('/api/wine-spirits/stats', signal);
}

export function fetchWineSignals(params: WineSignalsParams, signal?: AbortSignal): Promise<SignalsResponse> {
  return getJson(
    buildPath('/api/wine-spirits/signals', {
      type: params.type,
      district: params.district,
      page: params.page,
      page_size: params.page_size
    }),
    signal
  );
}

export function fetchWineExpiry(params: WineExpiryParams, signal?: AbortSignal): Promise<Paginated<ExpiryItem>> {
  return getJson(
    buildPath('/api/wine-spirits/expiry', {
      window: params.window,
      district: params.district,
      page: params.page,
      page_size: params.page_size
    }),
    signal
  );
}

export function fetchWineDirectory(
  params: WineDirectoryParams,
  signal?: AbortSignal
): Promise<Paginated<EntityListItem>> {
  return getJson(
    buildPath('/api/wine-spirits/directory', {
      q: params.q,
      district: params.district,
      lic_type: params.lic_type,
      page: params.page,
      page_size: params.page_size
    }),
    signal
  );
}

export type EntityListItem = Entity;

// ------------------------------------------------------------------- hook

export interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: unknown;
  reload: () => void;
}

/**
 * Fetches on mount and whenever `deps` change. Aborts the in-flight request
 * when deps change again or the component unmounts. Keeps previously loaded
 * data visible (with `loading` true) while a refresh is in flight.
 */
export function useApi<T>(fetcher: (signal: AbortSignal) => Promise<T>, deps: readonly unknown[]): ApiState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [tick, setTick] = useState(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    setError(null);
    fetcherRef
      .current(ac.signal)
      .then((result) => {
        if (ac.signal.aborted) return;
        setData(result);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (ac.signal.aborted) return;
        setData(null);
        setError(err);
        setLoading(false);
      });
    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const reload = useCallback(() => setTick((v) => v + 1), []);

  return { data, loading, error, reload };
}

/** Maps an unknown error from useApi to a translation key. */
export function apiErrorKey(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 404) return 'common.error_not_found';
    if (error.status === 0) return 'common.error_network';
    return 'common.error_generic';
  }
  return 'common.error_network';
}
