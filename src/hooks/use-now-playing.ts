"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchNowPlaying, getApiBaseUrl } from "@/lib/azuracast/client";
import { AzuraCastNowPlaying } from "@/types/azuracast";

interface UseNowPlayingOptions {
  stationShortName?: string;
  pollMs?: number;
  useSse?: boolean;
}

interface UseNowPlayingResult {
  nowPlaying: AzuraCastNowPlaying | null;
  isLoading: boolean;
  error: string | null;
  refreshedAt: number | null;
  refresh: () => Promise<void>;
}

const DEFAULT_POLL_MS = 20000;
const SSE_FALLBACK_DELAY_MS = 3000;
const FAILURE_THRESHOLD = 3;
const SSE_RECONNECT_MIN_MS = 1000;
const SSE_RECONNECT_MAX_MS = 30000;

export function useNowPlaying(
  options: UseNowPlayingOptions = {}
): UseNowPlayingResult {
  const { stationShortName, pollMs = DEFAULT_POLL_MS, useSse = true } = options;

  const [nowPlaying, setNowPlaying] = useState<AzuraCastNowPlaying | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshedAt, setRefreshedAt] = useState<number | null>(null);
  const nowPlayingRef = useRef<AzuraCastNowPlaying | null>(null);
  const failureCountRef = useRef<number>(0);

  useEffect(() => {
    nowPlayingRef.current = nowPlaying;
  }, [nowPlaying]);

  const refresh = useCallback(async () => {
    const controller = new AbortController();

    try {
      const payload = await fetchNowPlaying(stationShortName, controller.signal);
      failureCountRef.current = 0;
      setNowPlaying(payload);
      setError(null);
      setRefreshedAt(Date.now());
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        return;
      }
      failureCountRef.current += 1;
      if (failureCountRef.current >= FAILURE_THRESHOLD && !nowPlayingRef.current) {
        setError("Unable to load now playing data.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [stationShortName]);

  // Re-fetch immediately when the user returns to the tab. Browsers throttle
  // background timers, so polling alone cannot guarantee a fresh update.
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refresh]);

  useEffect(() => {
    if (!useSse || !stationShortName) {
      return;
    }

    let isMounted = true;
    let fallbackTimer: number | null = null;
    let reconnectTimer: number | null = null;
    let reconnectDelay = SSE_RECONNECT_MIN_MS;
    let eventSource: EventSource | null = null;

    const applyPayload = (payload: AzuraCastNowPlaying) => {
      if (!isMounted) return;
      failureCountRef.current = 0;
      setNowPlaying(payload);
      setError(null);
      setRefreshedAt(Date.now());
      setIsLoading(false);
    };

    const buildSseUrl = () => {
      const sseBaseUrl = `${getApiBaseUrl()}/api/live/nowplaying/sse`;
      const sseParams = new URLSearchParams({
        cf_connect: JSON.stringify({
          subs: {
            [`station:${stationShortName}`]: { recover: true },
          },
        }),
      });
      return `${sseBaseUrl}?${sseParams.toString()}`;
    };

    const connect = () => {
      if (!isMounted) return;

      eventSource = new EventSource(buildSseUrl());

      eventSource.onmessage = (event) => {
        reconnectDelay = SSE_RECONNECT_MIN_MS;
        try {
          const data = JSON.parse(event.data) as {
            connect?: {
              subs?: Record<
                string,
                {
                  publications?: Array<{ data?: { np?: AzuraCastNowPlaying } }>;
                }
              >;
            };
            pub?: { data?: { np?: AzuraCastNowPlaying } };
          };

          if (data.pub?.data?.np) {
            window.clearTimeout(fallbackTimer ?? undefined);
            fallbackTimer = window.setTimeout(() => {
              applyPayload(data.pub!.data!.np!);
            }, SSE_FALLBACK_DELAY_MS);
            return;
          }

          if (!data.connect?.subs) return;

          for (const key of Object.keys(data.connect.subs)) {
            const publications = data.connect.subs[key]?.publications;
            if (!publications || publications.length === 0) continue;
            const initialNp = publications[0]?.data?.np;
            if (initialNp) {
              applyPayload(initialNp);
              return;
            }
          }
        } catch {
          // Ignore malformed SSE payloads and rely on polling fallback.
        }
      };

      eventSource.onerror = () => {
        eventSource?.close();
        eventSource = null;
        if (!isMounted) return;
        // Exponential backoff reconnect so a temporary outage doesn't spam requests.
        reconnectTimer = window.setTimeout(() => {
          reconnectDelay = Math.min(reconnectDelay * 2, SSE_RECONNECT_MAX_MS);
          connect();
        }, reconnectDelay);
      };
    };

    connect();

    // When the user returns to the tab, skip any pending backoff and reconnect
    // immediately so artwork and track info sync right away.
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && !eventSource) {
        if (reconnectTimer !== null) {
          window.clearTimeout(reconnectTimer);
          reconnectTimer = null;
        }
        reconnectDelay = SSE_RECONNECT_MIN_MS;
        connect();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isMounted = false;
      if (fallbackTimer) window.clearTimeout(fallbackTimer);
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      eventSource?.close();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [stationShortName, useSse]);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const runFetch = async () => {
      try {
        const payload = await fetchNowPlaying(stationShortName, controller.signal);
        if (!isMounted) {
          return;
        }
        failureCountRef.current = 0;
        setNowPlaying(payload);
        setError(null);
        setRefreshedAt(Date.now());
      } catch (err) {
        if (!isMounted || (err as Error).name === "AbortError") {
          return;
        }
        failureCountRef.current += 1;
        if (failureCountRef.current >= FAILURE_THRESHOLD && !nowPlayingRef.current) {
          setError("Unable to load now playing data.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    setIsLoading(true);
    void runFetch();

    const intervalId = window.setInterval(() => {
      void runFetch();
    }, pollMs);

    return () => {
      isMounted = false;
      controller.abort();
      window.clearInterval(intervalId);
    };
  }, [pollMs, stationShortName]);

  return useMemo(
    () => ({
      nowPlaying,
      isLoading,
      error,
      refreshedAt,
      refresh,
    }),
    [error, isLoading, nowPlaying, refresh, refreshedAt]
  );
}
