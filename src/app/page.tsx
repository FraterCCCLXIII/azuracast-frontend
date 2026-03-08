import { ListenerDashboardClient } from "@/components/player/listener-dashboard-client";

interface HomeProps {
  searchParams: Promise<{ station?: string }>;
}

export default async function Home({ searchParams }: HomeProps) {
  const stationShortName = process.env.NEXT_PUBLIC_AZURACAST_STATION_SHORT_NAME;
  const { station: urlStation } = await searchParams;

  return (
    <ListenerDashboardClient
      stationShortName={stationShortName}
      urlStation={urlStation}
    />
  );
}
