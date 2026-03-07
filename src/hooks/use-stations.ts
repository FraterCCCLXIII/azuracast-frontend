"use client";

import { useEffect, useState } from "react";
import { fetchStations, StationOption } from "@/lib/azuracast/client";

export function useStations() {
  const [stations, setStations] = useState<StationOption[]>([]);

  useEffect(() => {
    const controller = new AbortController();

    const loadStations = async () => {
      try {
        const list = await fetchStations(controller.signal);
        setStations(list);
      } catch {
        setStations([]);
      }
    };

    void loadStations();
    const intervalId = window.setInterval(() => {
      void loadStations();
    }, 60000);

    return () => {
      controller.abort();
      window.clearInterval(intervalId);
    };
  }, []);

  return stations;
}
