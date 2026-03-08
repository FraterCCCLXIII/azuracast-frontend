"use client";

import dynamic from "next/dynamic";

export const ListenerDashboardClient = dynamic(
  () =>
    import("@/components/player/listener-dashboard").then(
      (m) => m.ListenerDashboard
    ),
  { ssr: false }
);
