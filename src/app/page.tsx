import { ListenerDashboard } from "@/components/player/listener-dashboard";

export default function Home() {
  const stationShortName = process.env.NEXT_PUBLIC_AZURACAST_STATION_SHORT_NAME;

  return <ListenerDashboard stationShortName={stationShortName} />;
}
