import {
  AzuraCastNowPlaying,
  AzuraCastRequestItem,
  AzuraCastStatusResponse,
} from "@/types/azuracast";

const DEFAULT_BASE_URL = "http://127.0.0.1";

export function getApiBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_AZURACAST_BASE_URL?.trim();
  return fromEnv && fromEnv.length > 0 ? fromEnv : DEFAULT_BASE_URL;
}

function buildApiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  // Keep Next.js same-origin proxy paths on the current origin.
  if (normalizedPath.startsWith("/api/azuracast/")) {
    return normalizedPath;
  }
  return `${getApiBaseUrl()}${normalizedPath}`;
}

async function requestJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(buildApiUrl(path), {
    signal,
    cache: "no-store",
    headers: {
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
    },
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const payload = (await response.json()) as {
        message?: string;
        formatted_message?: string;
      };
      if (payload.formatted_message || payload.message) {
        message = payload.formatted_message ?? payload.message ?? message;
      }
    } catch {
      // Keep generic message if no JSON body.
    }
    const error = new Error(message);
    (error as Error & { status?: number; messageFromApi?: string }).status =
      response.status;
    (error as Error & { status?: number; messageFromApi?: string }).messageFromApi =
      message;
    throw error;
  }

  return (await response.json()) as T;
}

export async function fetchNowPlayingAggregate(
  signal?: AbortSignal
): Promise<AzuraCastNowPlaying[]> {
  return requestJson<AzuraCastNowPlaying[]>("/api/nowplaying", signal);
}

export async function fetchStationShortcodes(signal?: AbortSignal): Promise<string[]> {
  const aggregate = await fetchNowPlayingAggregate(signal);
  return Array.from(
    new Set(
      aggregate
        .map((item) => item.station.shortcode)
        .filter((code) => typeof code === "string" && code.length > 0)
    )
  );
}

export interface StationOption {
  shortcode: string;
  name: string;
}

export async function fetchStations(signal?: AbortSignal): Promise<StationOption[]> {
  const aggregate = await fetchNowPlayingAggregate(signal);
  const stationMap = new Map<string, StationOption>();

  for (const row of aggregate) {
    const shortcode = row.station.shortcode;
    if (!shortcode) {
      continue;
    }
    if (!stationMap.has(shortcode)) {
      stationMap.set(shortcode, {
        shortcode,
        name: row.station.name || shortcode,
      });
    }
  }

  return Array.from(stationMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
}

export async function fetchNowPlayingByStation(
  stationShortName: string,
  signal?: AbortSignal
): Promise<AzuraCastNowPlaying | null> {
  try {
    return await requestJson<AzuraCastNowPlaying>(
      `/api/nowplaying/${stationShortName}`,
      signal
    );
  } catch (error) {
    const status = (error as { status?: number }).status;
    if (status === 404) {
      return null;
    }
    throw error;
  }
}

export async function fetchNowPlaying(
  stationShortName?: string,
  signal?: AbortSignal
): Promise<AzuraCastNowPlaying | null> {
  if (stationShortName) {
    const stationResult = await fetchNowPlayingByStation(stationShortName, signal);
    if (stationResult) {
      return stationResult;
    }
  }

  const aggregate = await fetchNowPlayingAggregate(signal);
  if (!aggregate.length) {
    return null;
  }

  if (!stationShortName) {
    return aggregate[0];
  }

  return (
    aggregate.find((item) => item.station.shortcode === stationShortName) ?? null
  );
}

export interface RequestsQuery {
  search?: string;
  page?: number;
  perPage?: number;
}

export interface RequestSongsResult {
  rows: AzuraCastRequestItem[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export async function fetchRequestableSongs(
  stationId: number,
  query: RequestsQuery = {},
  signal?: AbortSignal
): Promise<RequestSongsResult> {
  const searchParams = new URLSearchParams();
  if (query.search) {
    searchParams.set("searchPhrase", query.search);
  }
  if (query.page) {
    searchParams.set("current", String(query.page));
  }
  if (query.perPage) {
    searchParams.set("rowCount", String(query.perPage));
  }

  const queryString = searchParams.toString();
  const path = `/api/azuracast/station/${stationId}/requests${
    queryString.length ? `?${queryString}` : ""
  }`;

  console.debug("[requests] fetchRequestableSongs:start", {
    stationId,
    path,
    search: query.search ?? "",
    page: query.page ?? 1,
    perPage: query.perPage ?? 25,
  });

  const payload = await requestJson<
    | AzuraCastRequestItem[]
    | {
        rows?: AzuraCastRequestItem[];
        page?: number;
        per_page?: number;
        total?: number;
        total_pages?: number;
      }
  >(path, signal).catch((error) => {
    console.warn("[requests] fetchRequestableSongs:error", {
      stationId,
      path,
      message: (error as Error).message,
      status: (error as { status?: number }).status,
      asString: String(error),
      error,
    });
    throw error;
  });

  if (Array.isArray(payload)) {
    console.debug("[requests] fetchRequestableSongs:success-array", {
      stationId,
      path,
      rows: payload.length,
    });
    return {
      rows: payload,
      page: query.page ?? 1,
      perPage: query.perPage ?? payload.length,
      total: payload.length,
      totalPages: 1,
    };
  }

  const rows = payload.rows ?? [];
  console.debug("[requests] fetchRequestableSongs:success-paginated", {
    stationId,
    path,
    rows: rows.length,
    page: payload.page ?? query.page ?? 1,
    perPage: payload.per_page ?? query.perPage ?? rows.length,
    total: payload.total ?? rows.length,
    totalPages: payload.total_pages ?? 1,
  });
  return {
    rows,
    page: payload.page ?? query.page ?? 1,
    perPage: payload.per_page ?? query.perPage ?? rows.length,
    total: payload.total ?? rows.length,
    totalPages: payload.total_pages ?? 1,
  };
}

export async function submitSongRequest(
  requestUrl: string,
  signal?: AbortSignal
): Promise<AzuraCastStatusResponse> {
  const normalizedPath = requestUrl.startsWith("http")
    ? (() => {
        const parsed = new URL(requestUrl);
        return `${parsed.pathname}${parsed.search}`;
      })()
    : requestUrl;
  const path = normalizedPath.startsWith("/api/azuracast")
    ? normalizedPath
    : `/api/azuracast${normalizedPath.startsWith("/") ? "" : "/"}${normalizedPath}`;

  const response = await fetch(path, {
    method: "POST",
    signal,
    headers: {
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
    },
  });

  const payload = (await response.json()) as AzuraCastStatusResponse & {
    formatted_message?: string;
  };

  if (!response.ok || !payload.success) {
    const message =
      payload.formatted_message ?? payload.message ?? "Unable to submit request.";
    const error = new Error(message);
    (error as Error & { status?: number }).status = response.status;
    throw error;
  }

  return payload;
}
