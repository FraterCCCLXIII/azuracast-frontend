import { ListenerDashboardClient } from "@/components/player/listener-dashboard-client";

interface HomeProps {
  searchParams: Promise<{
    station?: string;
    /** AzuraCast song ID from a shared song link. */
    song?: string;
    /** Song title (URL-decoded) from a shared song link. */
    song_t?: string;
    /** Song artist (URL-decoded) from a shared song link. */
    song_a?: string;
  }>;
}

export default async function Home({ searchParams }: HomeProps) {
  const stationShortName = process.env.NEXT_PUBLIC_AZURACAST_STATION_SHORT_NAME;
  const { station: urlStation, song: urlSongId, song_t: urlSongTitle, song_a: urlSongArtist } =
    await searchParams;

  return (
    <ListenerDashboardClient
      stationShortName={stationShortName}
      urlStation={urlStation}
      urlSongId={urlSongId}
      urlSongTitle={urlSongTitle}
      urlSongArtist={urlSongArtist}
    />
  );
}
