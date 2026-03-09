import {
  AzuraCastNowPlaying,
  AzuraCastOnDemandItem,
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
  return requestJson<AzuraCastNowPlaying[]>("/api/azuracast/nowplaying", signal);
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
      `/api/azuracast/nowplaying/${stationShortName}`,
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

/**
 * Converts an AzuraCast API-relative URL (e.g. `/api/station/1/ondemand/download/abc`)
 * to the Next.js proxy path (e.g. `/api/azuracast/station/1/ondemand/download/abc`).
 * Already-proxied URLs (`/api/azuracast/…`) are returned unchanged.
 */
export function toProxyUrl(apiUrl: string): string {
  if (apiUrl.startsWith("/api/azuracast")) {
    return apiUrl; // already a proxy URL
  }
  if (apiUrl.startsWith("/api/")) {
    // /api/station/1/… → /api/azuracast/station/1/…
    return `/api/azuracast${apiUrl.slice(4)}`;
  }
  return apiUrl;
}

/**
 * Searches the on-demand list for a song matching the given ID.
 * Returns the item (with a proxy-ready `download_url`) or null.
 */
export async function findOnDemandSong(
  stationId: number,
  songId: string,
  searchTitle: string,
  signal?: AbortSignal
): Promise<AzuraCastOnDemandItem | null> {
  try {
    const searchParams = new URLSearchParams({
      searchPhrase: searchTitle,
      rowCount: "20",
    });
    const payload = await requestJson<
      AzuraCastOnDemandItem[] | { rows?: AzuraCastOnDemandItem[] }
    >(
      `/api/azuracast/station/${stationId}/ondemand?${searchParams.toString()}`,
      signal
    );

    const rows = Array.isArray(payload) ? payload : (payload.rows ?? []);
    const match = rows.find((item) => item.media.id === songId) ?? null;

    if (match) {
      return { ...match, download_url: toProxyUrl(match.download_url) };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Searches the requestable songs list for a song matching the given ID.
 * Uses the song title as the search phrase to reduce the result set before matching.
 * Returns the first matching request item, or null if none found.
 */
export async function findRequestableSong(
  stationId: number,
  songId: string,
  searchTitle: string,
  signal?: AbortSignal
): Promise<AzuraCastRequestItem | null> {
  try {
    console.debug("[findRequestableSong] fetching", { stationId, songId, searchTitle });
    const result = await fetchRequestableSongs(
      stationId,
      { search: searchTitle, perPage: 20 },
      signal
    );
    console.debug(
      "[findRequestableSong] received",
      result.rows.length,
      "rows; IDs:",
      result.rows.map((r) => r.song.id)
    );
    const match = result.rows.find((item) => item.song.id === songId) ?? null;
    if (!match) {
      console.debug("[findRequestableSong] no match for songId:", songId);
    }
    return match;
  } catch (err) {
    console.warn("[findRequestableSong] error:", err);
    return null;
  }
}

/** Strips AzuraCast's trailing " in file /var/… on line N" / " on /var/…" suffix. */
function stripFilePath(msg: string): string {
  return msg
    .replace(/\s+in\s+file\s+\S+\s+on\s+line\s+\d+/i, "")
    .replace(/\s+on\s+\/\S+/i, "")
    .trim();
}

/**
 * AzuraCast returns HTTP 500 errors in two formats:
 *  - Plain text: "Error: Cannot submit request: <msg> on /var/azuracast/…"
 *  - HTML page:  the exception message is embedded inside an HTML comment
 *                `<!-- App\Exception\Http\CannotCompleteActionException: <msg>\n… -->`
 *
 * This helper tries the most specific patterns first, strips HTML when needed,
 * and falls back gracefully rather than swallowing the real reason.
 */
function extractAzuraCastError(body: string): string {
  // ── 1. "Cannot submit request: <msg>" anywhere (plain text or HTML comment) ──
  const requestMatch = body.match(/Cannot submit request:\s*([^\n<]+)/i);
  if (requestMatch?.[1]) {
    return stripFilePath(requestMatch[1]);
  }

  // ── 2. Any known AzuraCast exception class with a message ───────────────────
  const exceptionMatch = body.match(
    /(?:CannotCompleteActionException|CannotProcessRequestException):\s*([^\n<]+)/i
  );
  if (exceptionMatch?.[1]) {
    return stripFilePath(exceptionMatch[1]);
  }

  // ── 3. HTML body — strip tags, then search visible text ─────────────────────
  if (body.includes("<")) {
    const text = body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

    const textRequestMatch = text.match(/Cannot submit request:\s*([^.]+\.?)/i);
    if (textRequestMatch?.[1]) return textRequestMatch[1].trim();

    const textGenericMatch = text.match(/Error:\s*(.+?)(?:\s+on\s+\/|$)/i);
    if (textGenericMatch?.[1]) return textGenericMatch[1].trim();

    return "Unable to submit request. Please try again later.";
  }

  // ── 4. Plain-text fallback ───────────────────────────────────────────────────
  const plain = body.trim();

  const plainGenericMatch = plain.match(/^Error:\s*(.+?)(?:\s+on\s+\/|$)/im);
  if (plainGenericMatch?.[1]) return plainGenericMatch[1].trim();

  if (plain.length > 0 && plain.length < 300) return plain;

  return "Unable to submit request. Please try again later.";
}

export async function submitSongRequest(
  requestUrl: string,
  signal?: AbortSignal
): Promise<AzuraCastStatusResponse> {
  const rawPath = requestUrl.startsWith("http")
    ? (() => {
        const parsed = new URL(requestUrl);
        return `${parsed.pathname}${parsed.search}`;
      })()
    : requestUrl;
  const path = toProxyUrl(rawPath);

  console.debug("[submitSongRequest] posting to:", path, "(raw input:", requestUrl, ")");

  const response = await fetch(path, {
    method: "POST",
    signal,
    headers: {
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
    },
  });

  // AzuraCast throws CannotCompleteActionException (and similar) as HTTP 500
  // with a text/html body even for routine user-facing errors (e.g. "played
  // too recently").  Parse the message out and re-throw it so the UI can show
  // something useful.
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    const body = await response.text();

    // AzuraCast error format: "Error: Cannot submit request: <msg> on /var/…"
    // Extract the human-readable part before the file-path suffix.
    const extracted = extractAzuraCastError(body);

    console.warn("[submitSongRequest] non-JSON response from AzuraCast", {
      status: response.status,
      contentType,
      path,
      extracted,
      body: body.slice(0, 800),
    });

    throw new Error(extracted);
  }

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
