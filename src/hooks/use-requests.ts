"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchRequestableSongs } from "@/lib/azuracast/client";
import { AzuraCastRequestItem } from "@/types/azuracast";

interface UseRequestsOptions {
  stationId?: number;
  searchPhrase: string;
  page: number;
  perPage: number;
}

interface UseRequestsResult {
  items: AzuraCastRequestItem[];
  isLoading: boolean;
  error: string | null;
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
  refresh: () => Promise<void>;
}

export function useRequests({
  stationId,
  searchPhrase,
  page,
  perPage,
}: UseRequestsOptions): UseRequestsResult {
  const [items, setItems] = useState<AzuraCastRequestItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState({
    page: 1,
    perPage,
    total: 0,
    totalPages: 1,
  });

  const load = useCallback(async () => {
    console.debug("[requests] useRequests:load", {
      stationId: stationId ?? null,
      searchPhrase,
      page,
      perPage,
    });

    if (!stationId) {
      setItems([]);
      setError(null);
      setMeta({
        page: 1,
        perPage,
        total: 0,
        totalPages: 1,
      });
      return;
    }

    setIsLoading(true);
    const controller = new AbortController();
    try {
      const result = await fetchRequestableSongs(
        stationId,
        {
          search: searchPhrase.trim() || undefined,
          page,
          perPage,
        },
        controller.signal
      );
      setItems(result.rows);
      setMeta({
        page: result.page,
        perPage: result.perPage,
        total: result.total,
        totalPages: result.totalPages,
      });
      setError(null);
      console.debug("[requests] useRequests:load-success", {
        stationId,
        page: result.page,
        perPage: result.perPage,
        total: result.total,
        totalPages: result.totalPages,
        rows: result.rows.length,
      });
    } catch (err) {
      console.warn("[requests] useRequests:load-error", {
        stationId,
        searchPhrase,
        page,
        perPage,
        message: (err as Error).message,
        status: (err as { status?: number }).status,
        asString: String(err),
        err,
      });
      // AzuraCast may return 500 for out-of-range pages.
      // If that happens, retry the first page to recover automatically.
      if (page > 1) {
        try {
          const fallback = await fetchRequestableSongs(
            stationId,
            {
              search: searchPhrase.trim() || undefined,
              page: 1,
              perPage,
            },
            controller.signal
          );
          setItems(fallback.rows);
          setMeta({
            page: fallback.page,
            perPage: fallback.perPage,
            total: fallback.total,
            totalPages: fallback.totalPages,
          });
          setError(null);
          console.debug("[requests] useRequests:fallback-success", {
            stationId,
            page: fallback.page,
            perPage: fallback.perPage,
            total: fallback.total,
            totalPages: fallback.totalPages,
            rows: fallback.rows.length,
          });
          return;
        } catch {
          // Fall through to the normal error handling below.
        }
      }

      setItems([]);
      setMeta({
        page: 1,
        perPage,
        total: 0,
        totalPages: 1,
      });
      setError((err as Error).message || "Unable to load request list.");
    } finally {
      setIsLoading(false);
    }
  }, [page, perPage, searchPhrase, stationId]);

  useEffect(() => {
    void load();
  }, [load]);

  return useMemo(
    () => ({
      items,
      isLoading,
      error,
      page: meta.page,
      perPage: meta.perPage,
      total: meta.total,
      totalPages: meta.totalPages,
      refresh: load,
    }),
    [error, isLoading, items, load, meta.page, meta.perPage, meta.total, meta.totalPages]
  );
}
