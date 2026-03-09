"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useNowPlaying } from "@/hooks/use-now-playing";
import { useRequests } from "@/hooks/use-requests";
import { useStations } from "@/hooks/use-stations";
import { useAudioAnalyser } from "@/hooks/use-audio-analyser";
import { AzuraCastSong, AzuraCastStation } from "@/types/azuracast";
import { findRequestableSong, submitSongRequest } from "@/lib/azuracast/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { GlassFilter } from "@/components/ui/glass-filter";
import { LiquidGradientBackground, type GradientScheme } from "@/components/ui/liquid-gradient-background";
import { History, ListPlus, Pause, Play, Radio, Share2, Volume2, VolumeX, X } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { ShareModal } from "@/components/player/share-modal";
import { SongDetailModal, type SelectedSongEntry } from "@/components/player/song-detail-modal";

interface ListenerDashboardProps {
  stationShortName?: string;
  urlStation?: string;
  /** AzuraCast song ID present in a shared URL — auto-opens the song detail modal. */
  urlSongId?: string;
  /** Song title from a shared URL (used to search the requestable list). */
  urlSongTitle?: string;
  /** Song artist from a shared URL. */
  urlSongArtist?: string;
}

interface StreamOption {
  url: string;
  title: string;
}

const LAST_STATION_KEY = "listener-last-station";
const PLAYER_VOLUME_KEY = "listener-player-volume";
const STREAM_KEY_PREFIX = "listener-stream-url";
const ARTWORK_CROSSFADE_MS = 700;

const BG_MODE = process.env.NEXT_PUBLIC_BACKGROUND_MODE ?? "album-art";
const AUDIO_REACTIVE = process.env.NEXT_PUBLIC_AUDIO_REACTIVE === "true";
const CYCLE_SCHEME = process.env.NEXT_PUBLIC_GRADIENT_CYCLE_SCHEME === "true";

function parseGradientScheme(mode: string): GradientScheme | null {
  const match = mode.match(/^gradient-([1-5])$/);
  if (!match) return null;
  return parseInt(match[1], 10) as GradientScheme;
}

function formatDuration(totalSeconds?: number): string {
  if (!totalSeconds || totalSeconds <= 0) {
    return "0:00";
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function formatTimeAgo(unixSeconds: number): string {
  const diffMs = Date.now() - unixSeconds * 1000;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  return `${diffHr}h ago`;
}


function getStreamStorageKey(stationCode: string): string {
  return `${STREAM_KEY_PREFIX}-${stationCode}`;
}

function getDefaultStreamUrl(station?: AzuraCastStation): string {
  if (!station) {
    return "";
  }

  if (station.hls_enabled && station.hls_is_default && station.hls_url) {
    return station.hls_url;
  }

  return station.listen_url ?? "";
}

// Stashed original StationWordmark (viewBox="0 0 1084.12 681.96"):
// function StationWordmark() {
//   return (
//     <svg viewBox="0 0 1084.12 681.96" className="h-10 w-auto text-foreground sm:h-12" role="img" aria-label="Station">
//       <g fill="currentColor">
//         <polygon points="0 538.92 45.2 538.92 45.2 681.96 74.34 681.96 74.34 538.92 119.53 538.92 119.53 509.78 0 509.78 0 538.92" />
//         <polygon points="158.18 538.92 203.38 538.92 203.38 652.82 158.18 652.82 158.18 681.96 277.72 681.96 277.72 652.82 232.52 652.82 232.52 538.92 277.72 538.92 277.72 509.78 158.18 509.78 158.18 538.92" />
//         <polygon points="316.37 509.78 316.37 681.96 345.51 681.96 345.51 538.92 400.24 538.92 406.76 545.44 406.76 571.05 400.24 577.57 354.11 577.57 354.11 613.23 406.76 665.88 406.76 681.96 435.9 681.96 435.9 653.99 388.63 606.71 412.12 606.71 435.9 583.2 435.9 533.29 412.12 509.78 316.37 509.78" />
//         <polygon points="564.95 646.3 558.42 652.82 510.21 652.82 503.69 646.3 503.69 509.78 474.55 509.78 474.55 658.43 498.09 681.96 570.3 681.96 594.09 658.45 594.09 509.78 564.95 509.78 564.95 646.3" />
//         <path d="M692.39,652.82c-7.97,0-14.46,6.59-14.46,14.68s6.49,14.46,14.46,14.46,14.68-6.49,14.68-14.46-6.59-14.68-14.68-14.68Z" />
//         <polygon points="790.92 533.31 790.92 681.96 820.06 681.96 820.06 606.71 902.77 606.71 902.77 577.57 820.06 577.57 820.06 545.44 826.58 538.92 910.46 538.92 910.46 509.78 814.46 509.78 790.92 533.31" />
//         <polygon points="1042.91 509.78 1008.99 639.12 975.07 509.78 934.19 509.78 934.19 681.96 963.33 681.96 963.33 579.9 990.26 681.96 1027.71 681.96 1054.64 579.89 1054.64 681.96 1083.78 681.96 1083.78 509.78 1042.91 509.78" />
//       </g>
//       <path d="M.81,408.02l1.07-.92h284.41v-149.14h-38.4v122.24H.81v-183.98h0l.23-97.8h215.01l-.11-31.52-215.12.44V.03l527.28-.03v478h-104.91V103.63l-.06-35.18h-175.46v29.67l145.5.88.22,67.27-145.48-.04v29.99s78.58,0,78.58,0h66.9v281.77H.81M139.1,166.43H30.61v29.81h108.49v-29.81ZM139.1,257.97h-29.81v58.68h29.81v-58.68Z" fill="currentColor" />
//       <polygon points="665.33 0 665.33 405.14 735.7 406.19 979.52 406.19 979.52 131.12 949.7 131.17 949.7 379.29 842.31 379.29 842.31 69.68 803.91 69.68 803.91 379.29 694.81 379.29 694.81 0 1084.12 0 1084.12 69.68 949.7 69.68 949.7 99.41 1084.12 99.41 1084.12 477.09 721.48 477.09 556.84 477.09 556.84 0 665.33 0" fill="currentColor" />
//     </svg>
//   );
// }

function StationWordmark() {
  return (
    <svg
      viewBox="0 0 588.72 211.18"
      className="h-10 w-auto text-foreground sm:h-12"
      role="img"
      aria-label="Station"
      fill="currentColor"
    >
      <path d="M174.36.02h-68c-27.87,0-54.8,10.67-74.7,30.19C11.97,49.53.8,75.18.04,102.61c-.85,30.68,11.77,60.34,34.43,81.04,19.49,17.79,44.55,27.53,71.11,27.53h376.85c28.18,0,55.36-10.95,75.3-30.86s30.99-46.49,30.99-74.73-11.01-54.78-30.99-74.73C537.79,10.97,510.61.02,482.43.02h-195.42s-.02,0-.03-.02M10.97,105.6c0-25.32,9.88-49.12,27.82-67,17.99-17.94,42.63-27.6,68.04-27.6h51.97c13.2,0,13.39,13.29,13.67,14.35.95,3.68-1.8,7.26-5.6,7.26h-74.97c-14.92,0-27.02,12.09-27.02,27.02v5.21c0,1.98-1.03,3.8-2.69,4.89-8.33,5.49-14.05,13.83-16.27,23.75-1.94,8.74-1.94,17.61-.04,26.36,5.92,25.39,30.28,34.67,53.68,37.58,11.01,1.37,21.83,1.79,32.9,1.1,7.08-.45,13.77-1.57,20.49-3.62,15.39-4.69,28.63-14.87,33.63-30.59,1.74-5.49,2.54-10.97,2.56-16.77l.04-17.41c.01-5.77,7.57-8.04,10.7-3.19.39.6.73,1.2,1.03,1.78,9.09,17.76,6.37,39.03-6.43,54.29-6.82,8.13-14.65,14.5-24.72,18.34-7.09,2.71-14.31,4.19-21.93,3.98l-34.86-.95c-8.86-.24-17.29-.63-26.1-.49-6.03.1-11.74.98-17.41,2.75-5.42,1.71-10.05,4.4-14.25,8.21h0c-3.98,3.66-10.13,3.68-14.09,0-.82-.77-1.64-1.55-2.44-2.35-17.87-17.87-27.71-41.63-27.71-66.9ZM81.25,87.24c.12-2.95,1.37-5.43,3.96-7.01,2.66-1.47,5.84-2.12,9.1-2.29,5.15-.27,8.88,3.65,8.37,8.78-.21,2.13-.66,4.22-1.51,6.31-2.19,5.65-10.91,4.11-14.73,2.52-3.5-1.46-5.34-4.61-5.19-8.32ZM78.25,61.63v-.37c-.01-8.96,7.25-16.23,16.2-16.23h0c4.29,0,7.76,3.47,7.77,7.76v6.83c0,4.3-3.47,7.8-7.77,7.81l-10.36.03c-3.22,0-5.84-2.6-5.84-5.82ZM549.93,172.6c-17.99,17.94-42.63,27.6-68.04,27.6H105.58c-11.45,0-22.59-2.02-33.01-5.89-6.1-2.27-6.48-10.91-.57-13.65.04-.02.09-.04.13-.06,5.4-2.51,10.93-3.6,16.91-4.34,9.89-1.02,19.53-1.32,29.48-.7l31.54,1.97,33.37,1.91c8.57.49,16.78-.03,25.26-1.18,10.03-1.36,19.6-3.86,28.75-8.13,18.09-8.43,32.07-21.86,35.8-42.08,3.12-16.94.04-33.31-12.93-45.32-4.07-3.77-8.49-6.94-13.51-9.36-3.98-1.92-8.1-2.86-12.4-3.86-.13-.03-.27-.06-.4-.08-7.63-1.29-15.1-1.93-22.91-1.95l-16.11-.03c-3.29,0-5.93-2.75-5.77-6.08v-10.24c-.2-3.37,2.47-6.16,5.8-6.15,9.74.03,60.64.04,70.36.05,3.2,0,5.79-2.59,5.79-5.79v-.84c0-3.2-2.59-5.79-5.79-5.79h-62.34c-.2,0-.39,0-.58-.03-3.09-.3-8.39-.15-7.79-4.32.47-3.24,2.39-5.85,5.26-7.52,3.7-2.15,7.75-3.33,12.16-3.98,14.77-2.2,34.07-1.89,48.44,2.73,5.59,1.8,10.61,4.47,15,8.32,3.59,3.15,5.92,7.11,7.22,11.76,1.38,4.92,2.03,9.85,2.03,15.15v128.84c.01,3.2,2.6,5.79,5.8,5.79h0c3.2,0,5.79-2.59,5.79-5.79l-.02-152.65c0-5.24-.74-10.38-2.14-15.28-.66-2.33,1.08-4.63,3.5-4.63h185.44c17.01,0,33.33,4.46,47.64,12.83,4.15,2.43,2.41,8.79-2.39,8.79h-172.11c-2.99.01-5.41,2.43-5.41,5.42v115.34c-.01,3,2.43,5.43,5.43,5.41h1.45c2.98-.03,5.38-2.44,5.38-5.42V50.74c0-2.99,2.42-5.41,5.41-5.41h5.55c2.99,0,5.41,2.42,5.41,5.41v68.56c0,21.81,17.68,39.48,39.48,39.49h0c21.81,0,39.49-17.67,39.5-39.48v-31.6c0-3.53,3.34-6.12,6.76-5.24.3.08.59.18.87.31,8.24,3.87,12.96,18.55,13.72,26.82.7,7.6-.2,14.97-1.92,22.3-3.72,15.85-14.09,28.75-28.5,36.26-7.09,3.7-14.52,6.17-22.52,7.57-14.78,2.59-29.9,2.39-44.56-.64-19.49-4.03-36.63-14.56-48.77-30.23-9.31-12.02-14.08-26.53-14.19-41.78-.11-16.06,4.32-31.46,13.64-44.53,3.18-4.49,6.63-8.6,10.6-12.45,2.02-1.96,2.19-5.15.42-7.33l-1.44-1.78c-2.03-2.49-5.75-2.68-8.06-.44-2.61,2.53-4.96,5.25-7.3,8.16-7.39,9.79-12.94,20.68-16.51,32.46-2.26,7.47-3.3,14.86-3.16,22.62.43,23.88,7.75,45.27,25.44,61.82,20.06,18.76,46.26,26.99,73.47,27.99,16.54.61,32.8-.21,49.16-2.29,18.09-2.3,37.71-7.06,53.91-15.39,14.3-7.35,26.61-18.04,32.14-33.55,3.39-9.52,4.16-19.58,2.5-29.57-1.67-10.06-6.62-18.79-13.74-25.95-9.46-9.51-21.61-15.32-35.04-16.47-7.69-.61-15.17-.22-22.85.58-2.58.32-5.05.73-7.54,1.24-3.37.69-6.51-1.9-6.51-5.34v-12.1c0-2.99,2.42-5.41,5.41-5.41h72.91c13.87,0,26.49,8.06,32.3,20.66,5.66,12.26,8.64,25.7,8.64,39.61,0,25.32-9.88,49.12-27.82,67Z" />
    </svg>
  );
}

export function ListenerDashboard({
  stationShortName,
  urlStation,
  urlSongId,
  urlSongTitle,
  urlSongArtist,
}: ListenerDashboardProps) {
  const [selectedStation, setSelectedStation] = useState<string>(() => {
    if (typeof window === "undefined") {
      return urlStation ?? stationShortName ?? "";
    }
    return urlStation ?? window.localStorage.getItem(LAST_STATION_KEY) ?? stationShortName ?? "";
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(70);
  const [hasHydratedVolume, setHasHydratedVolume] = useState(false);
  const [activeStreamUrl, setActiveStreamUrl] = useState<string>(() => {
    if (typeof window === "undefined") {
      return "";
    }

    const initialStation =
      urlStation ?? window.localStorage.getItem(LAST_STATION_KEY) ?? stationShortName ?? "";
    if (!initialStation) {
      return "";
    }

    return window.localStorage.getItem(getStreamStorageKey(initialStation)) ?? "";
  });
  const [preMuteVolume, setPreMuteVolume] = useState(70);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [liveElapsed, setLiveElapsed] = useState(0);
  const [requestSearchInput, setRequestSearchInput] = useState("");
  const [requestSearch, setRequestSearch] = useState("");
  const [requestPage, setRequestPage] = useState(1);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
  const [liveStatsOpen, setLiveStatsOpen] = useState(false);
  const [submittingRequestId, setSubmittingRequestId] = useState<string | null>(null);
  const [songDetailOpen, setSongDetailOpen] = useState(false);
  const [selectedSongEntry, setSelectedSongEntry] = useState<SelectedSongEntry | null>(null);
  const [shareUrl, setShareUrl] = useState<string | undefined>(undefined);
  const [backgroundArtwork, setBackgroundArtwork] = useState("");
  const [nextBackgroundArtwork, setNextBackgroundArtwork] = useState<string | null>(null);
  const [artworkCrossfading, setArtworkCrossfading] = useState(false);
  const crossfadeTimeoutRef = useRef<number | null>(null);
  const crossfadeStartRef = useRef<number | null>(null);
  const isLoadingRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const analyserRef = useAudioAnalyser(AUDIO_REACTIVE ? audioRef : { current: null });
  const urlSongHandledRef = useRef(false);

  const stations = useStations();

  useEffect(() => {
    if (selectedStation === "") {
      return;
    }
    window.localStorage.setItem(LAST_STATION_KEY, selectedStation);
    const url = new URL(window.location.href);
    url.searchParams.set("station", selectedStation);
    window.history.replaceState(null, "", url.toString());
  }, [selectedStation]);

  // Sync the open song detail modal into the URL so shared links re-open it.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (songDetailOpen && selectedSongEntry?.song) {
      const { song } = selectedSongEntry;
      url.searchParams.set("song", song.id);
      url.searchParams.set("song_t", song.title);
      url.searchParams.set("song_a", song.artist);
    } else {
      url.searchParams.delete("song");
      url.searchParams.delete("song_t");
      url.searchParams.delete("song_a");
    }
    window.history.replaceState(null, "", url.toString());
  }, [songDetailOpen, selectedSongEntry]);

  useEffect(() => {
    const savedVolume = window.localStorage.getItem(PLAYER_VOLUME_KEY);
    if (savedVolume !== null) {
      const parsedVolume = Number(savedVolume);
      if (!Number.isNaN(parsedVolume)) {
        const nextVolume = Math.min(100, Math.max(0, parsedVolume));
        setVolume(nextVolume);
        if (nextVolume > 0) {
          setPreMuteVolume(nextVolume);
        }
      }
    }
    setHasHydratedVolume(true);
  }, []);

  useEffect(() => {
    if (!hasHydratedVolume) {
      return;
    }

    if (!audioRef.current) {
      return;
    }

    audioRef.current.volume = volume / 100;
    window.localStorage.setItem(PLAYER_VOLUME_KEY, String(volume));
  }, [hasHydratedVolume, volume]);

  const { nowPlaying, isLoading, error, refresh } = useNowPlaying({
    stationShortName: selectedStation || stationShortName,
    pollMs: 20000,
    useSse: true,
  });

  // Keep a ref in sync so the artwork crossfade effect can read isLoading
  // without adding it to the dependency array (avoids a dep-size change error).
  isLoadingRef.current = isLoading;

  const station = nowPlaying?.station;
  const currentTrack = nowPlaying?.now_playing;
  const currentSong = currentTrack?.song;
  const artworkUrl = currentSong?.art ?? "";
  const history = nowPlaying?.song_history ?? [];
  const listenersCurrent = nowPlaying?.listeners?.current ?? 0;
  const listenersTotal = nowPlaying?.listeners?.total ?? 0;
  const listenersUnique = nowPlaying?.listeners?.unique ?? 0;
  const trackElapsed = currentTrack?.elapsed ?? 0;
  const trackDuration = currentTrack?.duration ?? 0;
  const stationId = station?.id;
  const requestsEnabled = station?.requests_enabled ?? false;

  // When a shared song URL is opened, auto-open the detail modal once nowPlaying loads.
  useEffect(() => {
    if (urlSongHandledRef.current || !urlSongId || !nowPlaying) return;
    urlSongHandledRef.current = true;

    // 1. Check the currently playing track.
    if (nowPlaying.now_playing.song.id === urlSongId) {
      setSelectedSongEntry({ song: nowPlaying.now_playing.song, track: nowPlaying.now_playing });
      setSongDetailOpen(true);
      return;
    }

    // 2. Check recent history.
    const historyMatch = nowPlaying.song_history?.find((e) => e.song.id === urlSongId);
    if (historyMatch) {
      setSelectedSongEntry({ song: historyMatch.song, track: historyMatch });
      setSongDetailOpen(true);
      return;
    }

    // 3. Search the requestable songs list (needs title for the search phrase).
    const sid = nowPlaying.station.id;
    if (sid && urlSongTitle) {
      findRequestableSong(sid, urlSongId, urlSongTitle)
        .then((requestItem) => {
          if (requestItem) {
            setSelectedSongEntry({ song: requestItem.song, requestItem });
          } else {
            // Build a minimal song from URL params and still open the modal.
            const minimalSong: AzuraCastSong = {
              id: urlSongId,
              text:
                urlSongTitle && urlSongArtist
                  ? `${urlSongArtist} - ${urlSongTitle}`
                  : (urlSongTitle ?? urlSongId),
              title: urlSongTitle ?? "",
              artist: urlSongArtist ?? "",
              art: null,
            };
            setSelectedSongEntry({ song: minimalSong });
          }
          setSongDetailOpen(true);
        })
        .catch(() => {
          toast.error("Could not load the shared song.");
        });
      return;
    }

    // 4. Fallback: open with whatever we have from URL params.
    if (urlSongTitle) {
      const minimalSong: AzuraCastSong = {
        id: urlSongId,
        text:
          urlSongTitle && urlSongArtist
            ? `${urlSongArtist} - ${urlSongTitle}`
            : urlSongTitle,
        title: urlSongTitle,
        artist: urlSongArtist ?? "",
        art: null,
      };
      setSelectedSongEntry({ song: minimalSong });
      setSongDetailOpen(true);
    }
  }, [urlSongId, urlSongTitle, urlSongArtist, nowPlaying]);

  const {
    items: requestItems,
    isLoading: requestsLoading,
    error: requestsError,
    total: requestsTotal,
    totalPages: requestsTotalPages,
    perPage: requestsPerPage,
    refresh: refreshRequests,
  } = useRequests({
    stationId: requestsEnabled ? stationId : undefined,
    searchPhrase: requestSearch,
    page: requestPage,
    perPage: 25,
  });


  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setLiveElapsed(Math.max(0, trackElapsed));
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [trackElapsed, currentTrack?.played_at]);

  useEffect(() => {
    if (!trackDuration) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setLiveElapsed((value) => Math.min(trackDuration, value + 1));
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [trackDuration, currentTrack?.played_at]);

  useEffect(() => {
    if (artworkUrl === backgroundArtwork && nextBackgroundArtwork === null) {
      return;
    }

    // While loading new station data, keep the current artwork visible rather
    // than crossfading to a black/empty background mid-switch.
    if (!artworkUrl && isLoadingRef.current && backgroundArtwork) {
      return;
    }

    if (crossfadeTimeoutRef.current !== null) {
      window.clearTimeout(crossfadeTimeoutRef.current);
      crossfadeTimeoutRef.current = null;
    }
    if (crossfadeStartRef.current !== null) {
      window.clearTimeout(crossfadeStartRef.current);
      crossfadeStartRef.current = null;
    }

    setNextBackgroundArtwork(artworkUrl);
    setArtworkCrossfading(false);

    crossfadeStartRef.current = window.setTimeout(() => {
      setArtworkCrossfading(true);
      crossfadeStartRef.current = null;
    }, 20);

    crossfadeTimeoutRef.current = window.setTimeout(() => {
      setBackgroundArtwork(artworkUrl);
      setNextBackgroundArtwork(null);
      setArtworkCrossfading(false);
      crossfadeTimeoutRef.current = null;
    }, ARTWORK_CROSSFADE_MS + 20);
  }, [artworkUrl, backgroundArtwork, nextBackgroundArtwork]);

  useEffect(() => {
    return () => {
      if (crossfadeTimeoutRef.current !== null) {
        window.clearTimeout(crossfadeTimeoutRef.current);
      }
      if (crossfadeStartRef.current !== null) {
        window.clearTimeout(crossfadeStartRef.current);
      }
    };
  }, []);

  const streamOptions = useMemo(() => {
    if (!station) {
      return [] as StreamOption[];
    }

    const options: StreamOption[] = [];
    const seen = new Set<string>();

    if (station.hls_enabled && station.hls_url) {
      options.push({ url: station.hls_url, title: "HLS Stream" });
      seen.add(station.hls_url);
    }

    station.mounts?.forEach((mount) => {
      if (!mount.url || seen.has(mount.url)) {
        return;
      }
      seen.add(mount.url);
      options.push({
        url: mount.url,
        title: mount.name || mount.path || "Mount Stream",
      });
    });

    station.remotes?.forEach((remote) => {
      if (!remote.url || seen.has(remote.url)) {
        return;
      }
      seen.add(remote.url);
      options.push({
        url: remote.url,
        title: `Remote: ${remote.name || "Stream"}`,
      });
    });

    if (station.listen_url && !seen.has(station.listen_url)) {
      options.push({ url: station.listen_url, title: "Default Stream" });
    }

    return options;
  }, [station]);

  const effectiveStreamUrl = useMemo(() => {
    if (!streamOptions.length) {
      return station?.listen_url ?? null;
    }

    if (activeStreamUrl && streamOptions.some((entry) => entry.url === activeStreamUrl)) {
      return activeStreamUrl;
    }

    const defaultUrl = getDefaultStreamUrl(station);
    const fallback = streamOptions.find((entry) => entry.url === defaultUrl)?.url;
    return fallback ?? streamOptions[0]?.url ?? null;
  }, [activeStreamUrl, station, streamOptions]);

  const progressPercent = useMemo(() => {
    if (!trackDuration) {
      return 0;
    }
    return Math.min(100, Math.max(0, (liveElapsed / trackDuration) * 100));
  }, [liveElapsed, trackDuration]);

  const stationOptions = useMemo(() => {
    if (!stations.length && station) {
      return [{ shortcode: station.shortcode, name: station.name }];
    }

    if (!station) {
      return stations;
    }

    const hasCurrent = stations.some(
      (entry) => entry.shortcode === station.shortcode
    );
    if (hasCurrent) {
      return stations;
    }

    return [
      ...stations,
      { shortcode: station.shortcode, name: station.name || station.shortcode },
    ].sort((a, b) => a.name.localeCompare(b.name));
  }, [station, stations]);

  const openSongDetail = (entry: SelectedSongEntry) => {
    setShareUrl(undefined);
    setSelectedSongEntry(entry);
    setSongDetailOpen(true);
  };

  const handleSubmitRequest = async (requestId: string, requestUrl: string) => {
    setSubmittingRequestId(requestId);
    try {
      const result = await submitSongRequest(requestUrl);
      toast.success(result.message || "Request submitted successfully.");
      await refreshRequests();
    } catch (err) {
      toast.error((err as Error).message || "Unable to submit request.");
    } finally {
      setSubmittingRequestId(null);
    }
  };

  const togglePlayback = async () => {
    if (!audioRef.current || !effectiveStreamUrl) {
      return;
    }

    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        setAudioError(null);
        await audioRef.current.play();
        setIsPlaying(true);
      }
    } catch {
      setAudioError("Unable to start playback in this browser yet.");
    }
  };

  const toggleMute = () => {
    if (volume === 0) {
      setVolume(preMuteVolume > 0 ? preMuteVolume : 70);
      return;
    }

    setPreMuteVolume(volume);
    setVolume(0);
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      {parseGradientScheme(BG_MODE) !== null ? (
        <LiquidGradientBackground
          scheme={parseGradientScheme(BG_MODE)!}
          analyserRef={AUDIO_REACTIVE ? analyserRef : undefined}
          cycleOnSongChange={CYCLE_SCHEME}
          songId={CYCLE_SCHEME ? (currentSong?.id ?? currentSong?.text) : undefined}
        />
      ) : (
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-background" />
          {backgroundArtwork ? (
            <div
              className="absolute inset-0 scale-110 bg-cover bg-center blur-2xl"
              style={{ backgroundImage: `url(${backgroundArtwork})` }}
            />
          ) : null}
          {nextBackgroundArtwork !== null ? (
            <div
              className={`absolute inset-0 scale-110 bg-cover bg-center blur-2xl transition-opacity duration-700 ${
                artworkCrossfading ? "opacity-100" : "opacity-0"
              } ${nextBackgroundArtwork ? "" : "bg-background"}`}
              style={
                nextBackgroundArtwork
                  ? { backgroundImage: `url(${nextBackgroundArtwork})` }
                  : undefined
              }
            />
          ) : null}
          <div className="absolute inset-0 bg-background/70" />
        </div>
      )}
      {/* Texture overlay — multiply blend over the gradient */}
      <div
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{ mixBlendMode: "multiply" }}
        aria-hidden="true"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/DYn6E6RXkAEgoRX.jpeg"
          alt=""
          className="h-full w-full object-cover opacity-55"
        />
      </div>
      <div className="relative z-10 flex min-h-screen">
        {/* Push drawer — history panel */}
        <aside
          aria-label="Recent tracks history"
          className={`sticky top-0 h-dvh flex-shrink-0 overflow-hidden transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${historyDrawerOpen ? "w-80" : "w-0"}`}
        >
          <div className="flex h-dvh w-80 flex-col border-r border-border bg-background/80 backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <p className="text-sm font-semibold">Recent Tracks</p>
                <p className="text-xs text-muted-foreground">History from current station feed</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="rounded-full"
                onClick={() => setHistoryDrawerOpen(false)}
                aria-label="Close recent tracks"
              >
                <X />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground">No track history available yet.</p>
              ) : (
                <div className="space-y-3">
                  {history.map((entry) => (
                    <div key={`${entry.played_at}-${entry.song.id}`} className="space-y-2">
                      <button
                        type="button"
                        className="group flex w-full items-center gap-3 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label={`View details for ${entry.song.title}`}
                        onClick={() => openSongDetail({ song: entry.song, track: entry })}
                      >
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded bg-muted">
                          {entry.song.art ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={entry.song.art}
                              alt={entry.song.text}
                              className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
                              No art
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium leading-snug group-hover:underline group-hover:underline-offset-1">
                            {entry.song.title}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">{entry.song.artist}</p>
                          <p className="mt-0.5 text-[10px] tabular-nums text-muted-foreground/50">
                            {formatTimeAgo(entry.played_at)}
                          </p>
                        </div>
                      </button>
                      <Separator />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex flex-1 flex-col">
        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center gap-6 px-4 py-6 sm:px-6 lg:py-10">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4 flex-wrap">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              <StationWordmark />
            </h1>
            {stationOptions.length > 1 && (
              <nav className="flex items-center justify-start gap-1.5" aria-label="Station switcher">
                {stationOptions.map((entry) => {
                  const isActive = selectedStation === entry.shortcode;
                  return (
                    <button
                      key={entry.shortcode}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => {
                        if (isActive) return;
                        setSelectedStation(entry.shortcode);
                        setIsPlaying(false);
                        setRequestPage(1);
                        setRequestSearch("");
                        setRequestSearchInput("");
                        const savedStream = window.localStorage.getItem(
                          getStreamStorageKey(entry.shortcode)
                        );
                        setActiveStreamUrl(savedStream ?? "");
                        if (audioRef.current) {
                          audioRef.current.pause();
                        }
                      }}
                      className={[
                        "relative px-3 py-1.5 text-sm font-medium rounded-full transition-all duration-200 overflow-hidden",
                        isActive
                          ? "bg-white/40 text-foreground shadow-sm"
                          : "bg-white/15 text-foreground/70 hover:bg-white/25 hover:text-foreground",
                      ].join(" ")}
                      style={{
                        backdropFilter: "url(#glass-filter) blur(12px) saturate(180%)",
                        WebkitBackdropFilter: "blur(12px) saturate(180%)",
                        boxShadow: isActive
                          ? "0px 1px 5px 0px rgba(0,0,0,0.1), 0px 4px 12px 0px rgba(0,0,0,0.07)"
                          : "none",
                      }}
                    >
                      {entry.name}
                    </button>
                  );
                })}
              </nav>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Popover open={liveStatsOpen} onOpenChange={setLiveStatsOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="rounded-md"
                  onMouseEnter={() => setLiveStatsOpen(true)}
                  onMouseLeave={() => setLiveStatsOpen(false)}
                  onFocus={() => setLiveStatsOpen(true)}
                  onBlur={() => setLiveStatsOpen(false)}
                  aria-label="Show listener stats"
                >
                  <Badge
                    variant={error && !nowPlaying ? "destructive" : "secondary"}
                    className={`cursor-default border-none px-3 py-1${!(error && !nowPlaying) ? " bg-white/30 backdrop-blur-md text-foreground" : ""}`}
                  >
                    {error && !nowPlaying ? "Reconnecting..." : <><Radio className="mr-1 h-3 w-3" />Live</>}
                  </Badge>
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                className="w-64"
                onMouseEnter={() => setLiveStatsOpen(true)}
                onMouseLeave={() => setLiveStatsOpen(false)}
              >
                <div className="space-y-2">
                  <p className="text-sm font-medium">Listener Stats</p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-md border p-2">
                      <p className="text-[11px] text-muted-foreground">Current</p>
                      <p className="text-sm font-semibold">{listenersCurrent}</p>
                    </div>
                    <div className="rounded-md border p-2">
                      <p className="text-[11px] text-muted-foreground">Unique</p>
                      <p className="text-sm font-semibold">{listenersUnique}</p>
                    </div>
                    <div className="rounded-md border p-2">
                      <p className="text-[11px] text-muted-foreground">Total</p>
                      <p className="text-sm font-semibold">{listenersTotal}</p>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            {nowPlaying?.live?.is_live ? (
              <Badge>
                {`Live DJ${nowPlaying.live.streamer_name ? `: ${nowPlaying.live.streamer_name}` : ""}`}
              </Badge>
            ) : null}
          </div>
        </header>

        {isLoading && !nowPlaying ? (
          <div className="grid gap-6">
            <GlassCard className="bg-white/30 dark:bg-white/10">
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-56 w-full" />
                <Skeleton className="h-10 w-32" />
              </CardContent>
            </GlassCard>
          </div>
        ) : (
          <div className="grid gap-6">
            <GlassCard className="bg-white/30 dark:bg-white/10">
              <CardContent className="space-y-5">
                {error && !nowPlaying ? (
                  <div className="space-y-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4">
                    <p className="text-sm text-destructive">{error}</p>
                    <Button size="sm" variant="outline" onClick={() => void refresh()}>
                      Retry
                    </Button>
                  </div>
                ) : null}

                <div className="flex flex-col gap-5 sm:flex-row">
                  <div className="flex shrink-0 flex-col gap-2">
                    <button
                      type="button"
                      className="group aspect-square w-40 overflow-hidden rounded-lg bg-muted sm:aspect-auto sm:h-56 sm:w-56 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label={currentSong ? `View details for ${currentSong.title}` : undefined}
                      disabled={!currentSong}
                      onClick={() => {
                        if (currentSong && currentTrack) {
                          openSongDetail({ song: currentSong, track: currentTrack });
                        }
                      }}
                    >
                      {currentSong?.art ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={currentSong.art}
                          alt={currentSong.text}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                          No artwork
                        </div>
                      )}
                    </button>
                    <div className="hidden sm:block rounded-md bg-muted/30 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        Playing next
                      </p>
                      {nowPlaying?.playing_next?.song ? (
                        <>
                          <p className="mt-0.5 truncate text-sm font-medium leading-snug">
                            {nowPlaying.playing_next.song.title}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {nowPlaying.playing_next.song.artist}
                          </p>
                        </>
                      ) : (
                        <p className="mt-0.5 text-xs text-muted-foreground">No next track in queue.</p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col">
                    <div className="flex-1 space-y-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Current track
                      </p>
                      <button
                        type="button"
                        className="group block text-left focus-visible:outline-none"
                        aria-label={currentSong ? `View details for ${currentSong.title}` : undefined}
                        disabled={!currentSong}
                        onClick={() => {
                          if (currentSong && currentTrack) {
                            openSongDetail({ song: currentSong, track: currentTrack });
                          }
                        }}
                      >
                        <h2 className="text-xl font-semibold leading-tight sm:text-2xl group-hover:underline group-hover:underline-offset-2">
                          {currentSong?.title ?? "No track loaded"}
                        </h2>
                        <p className="mt-1 text-base text-muted-foreground group-hover:text-foreground">
                          {currentSong?.artist ?? "Unknown artist"}
                        </p>
                      </button>
                      {nowPlaying?.live?.is_live && nowPlaying.live.streamer_name ? (
                        <p className="text-sm font-medium text-primary">
                          Live by {nowPlaying.live.streamer_name}
                        </p>
                      ) : null}
                    </div>

                    <div className="mt-auto space-y-3 pt-4">
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-[width] duration-1000 ease-linear"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>{formatDuration(liveElapsed)}</span>
                        <span>{formatDuration(trackDuration)}</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                      <Button variant="ghost" className="rounded-full bg-foreground/5 hover:bg-foreground/8 shadow-none" onClick={() => void togglePlayback()} disabled={!effectiveStreamUrl}>
                        {isPlaying ? <Pause /> : <Play />}
                        {isPlaying ? "Pause stream" : "Play stream"}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="rounded-full bg-foreground/5 hover:bg-foreground/8 shadow-none"
                        aria-label="Recent tracks"
                        aria-expanded={historyDrawerOpen}
                        onClick={() => setHistoryDrawerOpen((v) => !v)}
                      >
                        <History />
                      </Button>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="rounded-full bg-foreground/5 hover:bg-foreground/8 shadow-none"
                            aria-label={volume === 0 ? "Unmute audio" : "Adjust volume"}
                          >
                            {volume === 0 ? <VolumeX /> : <Volume2 />}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent align="start" className="w-64 space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">Volume</p>
                            <span
                              className="text-xs text-muted-foreground"
                              suppressHydrationWarning
                            >
                              {volume}%
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={toggleMute}
                            >
                              {volume === 0 ? "Unmute" : "Mute"}
                            </Button>
                            <Slider
                              aria-label="Volume"
                              value={[volume]}
                              max={100}
                              step={1}
                              onValueChange={(value) => {
                                const next = value[0] ?? 70;
                                setVolume(next);
                              }}
                            />
                          </div>
                        </PopoverContent>
                      </Popover>
                      <Dialog
                        open={requestModalOpen}
                        onOpenChange={(open) => {
                          setRequestModalOpen(open);
                          if (open) {
                            setRequestPage(1);
                          }
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button type="button" variant="ghost" size="icon" className="rounded-full bg-foreground/5 hover:bg-foreground/8 shadow-none" aria-label="Request song" disabled={!requestsEnabled}>
                            <ListPlus />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
                          <DialogHeader>
                            <DialogTitle>Song Requests</DialogTitle>
                            <DialogDescription>
                              Browse requestable songs and submit a request to play one next.
                            </DialogDescription>
                          </DialogHeader>

                          <div className="space-y-4">
                            {!requestsEnabled ? (
                              <div className="rounded-lg border border-border bg-muted/40 p-3">
                                <p className="text-sm font-medium">
                                  Song requests are disabled for this station.
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  Enable requests in AzuraCast station settings and include at least
                                  one enabled playlist in requests.
                                </p>
                              </div>
                            ) : null}

                            <div className="flex flex-col gap-3 sm:flex-row">
                              <Input
                                value={requestSearchInput}
                                onChange={(event) => setRequestSearchInput(event.target.value)}
                                placeholder="Search title, artist, album, genre..."
                                disabled={!requestsEnabled}
                              />
                              <Button
                                type="button"
                                variant="outline"
                                disabled={!requestsEnabled}
                                onClick={() => {
                                  setRequestPage(1);
                                  setRequestSearch(requestSearchInput);
                                }}
                              >
                                Search
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                disabled={!requestsEnabled}
                                onClick={() => {
                                  setRequestSearchInput("");
                                  setRequestSearch("");
                                  setRequestPage(1);
                                }}
                              >
                                Clear
                              </Button>
                            </div>

                            {requestsEnabled && requestsError ? (
                              <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3">
                                <p className="text-sm text-destructive">{requestsError}</p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  Requests may be unavailable if this station has no request-enabled playlists.
                                </p>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="mt-3"
                                  onClick={() => void refreshRequests()}
                                >
                                  Retry
                                </Button>
                              </div>
                            ) : null}

                            {requestsEnabled && !requestsError && requestsLoading ? (
                              <div className="space-y-3">
                                <Skeleton className="h-14 w-full" />
                                <Skeleton className="h-14 w-full" />
                                <Skeleton className="h-14 w-full" />
                              </div>
                            ) : null}

                            {requestsEnabled && !requestsError && !requestsLoading ? (
                              <>
                                {requestItems.length === 0 ? (
                                  <p className="text-sm text-muted-foreground">
                                    No requestable songs found for this station.
                                  </p>
                                ) : (
                                  <div className="space-y-2">
                                    {requestItems.map((item) => (
                                      <div
                                        key={item.request_id}
                                        className="flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
                                      >
                                        <button
                                          type="button"
                                          className="group flex items-center gap-3 text-left focus-visible:outline-none"
                                          aria-label={`View details for ${item.song.title}`}
                                          onClick={() =>
                                            openSongDetail({ song: item.song, requestItem: item })
                                          }
                                        >
                                          <div className="h-10 w-10 shrink-0 overflow-hidden rounded bg-muted">
                                            {item.song.art ? (
                                              // eslint-disable-next-line @next/next/no-img-element
                                              <img
                                                src={item.song.art}
                                                alt={item.song.text}
                                                className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                                              />
                                            ) : null}
                                          </div>
                                          <div>
                                            <p className="text-sm font-medium leading-snug group-hover:underline group-hover:underline-offset-1">
                                              {item.song.title}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                              {item.song.artist}
                                            </p>
                                          </div>
                                        </button>
                                        <Button
                                          type="button"
                                          size="sm"
                                          disabled={submittingRequestId === item.request_id}
                                          onClick={() =>
                                            void handleSubmitRequest(item.request_id, item.request_url)
                                          }
                                        >
                                          {submittingRequestId === item.request_id
                                            ? "Requesting..."
                                            : "Request"}
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                <div className="flex items-center justify-between">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={requestPage <= 1}
                                    onClick={() => setRequestPage((value) => Math.max(1, value - 1))}
                                  >
                                    Previous
                                  </Button>
                                  <span className="text-xs text-muted-foreground">
                                    Page {requestPage} of {requestsTotalPages} ({requestsTotal} songs)
                                  </span>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={
                                      requestsTotalPages > 0
                                        ? requestPage >= requestsTotalPages
                                        : requestItems.length < requestsPerPage
                                    }
                                    onClick={() => setRequestPage((value) => value + 1)}
                                  >
                                    Next
                                  </Button>
                                </div>
                              </>
                            ) : null}
                          </div>
                        </DialogContent>
                      </Dialog>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="rounded-full bg-foreground/5 hover:bg-foreground/8 shadow-none"
                        aria-label="Share station"
                        onClick={() => {
                          setShareUrl(undefined);
                          setShareModalOpen(true);
                        }}
                      >
                        <Share2 />
                      </Button>
                      </div>
                      {audioError ? (
                        <p className="text-sm text-destructive">{audioError}</p>
                      ) : null}
                      <div className="sm:hidden rounded-md bg-muted/30 px-3 py-2">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          Playing next
                        </p>
                        {nowPlaying?.playing_next?.song ? (
                          <>
                            <p className="mt-0.5 truncate text-sm font-medium leading-snug">
                              {nowPlaying.playing_next.song.title}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {nowPlaying.playing_next.song.artist}
                            </p>
                          </>
                        ) : (
                          <p className="mt-0.5 text-xs text-muted-foreground">No next track in queue.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </GlassCard>


          </div>
        )}

        <ShareModal
          open={shareModalOpen}
          onOpenChange={(open) => {
            setShareModalOpen(open);
            if (!open) setShareUrl(undefined);
          }}
          stationName={station?.name}
          songId={shareUrl ? selectedSongEntry?.song.id : currentSong?.id}
          songTitle={shareUrl ? selectedSongEntry?.song.title : currentSong?.title}
          songArtist={shareUrl ? selectedSongEntry?.song.artist : currentSong?.artist}
          songArt={shareUrl ? (selectedSongEntry?.song.art ?? null) : (currentSong?.art ?? null)}
          shareUrl={shareUrl}
        />

        <SongDetailModal
          open={songDetailOpen}
          onOpenChange={setSongDetailOpen}
          entry={selectedSongEntry}
          stationId={stationId}
          requestsEnabled={requestsEnabled}
          onPauseLiveStream={() => {
            if (audioRef.current) audioRef.current.pause();
            setIsPlaying(false);
          }}
          onShare={() => {
            // Capture the song URL *before* closing the modal so the URL
            // sync effect doesn't strip the song params before ShareModal reads them.
            if (selectedSongEntry?.song) {
              const url = new URL(window.location.href);
              url.searchParams.set("song", selectedSongEntry.song.id);
              url.searchParams.set("song_t", selectedSongEntry.song.title);
              url.searchParams.set("song_a", selectedSongEntry.song.artist);
              setShareUrl(url.toString());
            }
            setSongDetailOpen(false);
            setShareModalOpen(true);
          }}
        />

        <audio
          ref={audioRef}
          src={effectiveStreamUrl ?? undefined}
          preload="none"
          crossOrigin={AUDIO_REACTIVE ? "anonymous" : undefined}
          onPause={() => setIsPlaying(false)}
          onPlay={() => setIsPlaying(true)}
        />
        </div>{/* end max-w-6xl content */}
        </div>{/* end flex-1 main column */}
      </div>{/* end flex min-h-screen z-10 row */}
      <GlassFilter />
    </div>
  );
}
