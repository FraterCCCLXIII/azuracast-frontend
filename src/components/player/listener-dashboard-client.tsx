"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type { ListenerDashboard } from "@/components/player/listener-dashboard";

type ListenerDashboardClientProps = ComponentProps<typeof ListenerDashboard>;

export const ListenerDashboardClient = dynamic<ListenerDashboardClientProps>(
  () =>
    import("@/components/player/listener-dashboard").then(
      (m) => m.ListenerDashboard
    ),
  { ssr: false }
);
