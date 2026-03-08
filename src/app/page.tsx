import { ListenerDashboardClient } from "@/components/player/listener-dashboard-client";

export default function Home() {
  const stationShortName = process.env.NEXT_PUBLIC_AZURACAST_STATION_SHORT_NAME;

  return <ListenerDashboardClient stationShortName={stationShortName} />;
}
