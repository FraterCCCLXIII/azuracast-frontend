"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useNowPlaying } from "@/hooks/use-now-playing";
import { useRequests } from "@/hooks/use-requests";
import { useStations } from "@/hooks/use-stations";
import { useAudioAnalyser } from "@/hooks/use-audio-analyser";
import { AzuraCastStation } from "@/types/azuracast";
import { submitSongRequest } from "@/lib/azuracast/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { GlassFilter } from "@/components/ui/glass-filter";
import { LiquidGradientBackground, type GradientScheme } from "@/components/ui/liquid-gradient-background";
import { EllipsisVertical, History, ListPlus, Pause, Play, Radio, Volume2, VolumeX } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

interface ListenerDashboardProps {
  stationShortName?: string;
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

function StationWordmark() {
  return (
    <svg
      viewBox="0 0 1084.12 681.96"
      className="h-10 w-auto text-foreground sm:h-12"
      role="img"
      aria-label="Station"
    >
      <g fill="currentColor">
        <polygon points="0 538.92 45.2 538.92 45.2 681.96 74.34 681.96 74.34 538.92 119.53 538.92 119.53 509.78 0 509.78 0 538.92" />
        <polygon points="158.18 538.92 203.38 538.92 203.38 652.82 158.18 652.82 158.18 681.96 277.72 681.96 277.72 652.82 232.52 652.82 232.52 538.92 277.72 538.92 277.72 509.78 158.18 509.78 158.18 538.92" />
        <polygon points="316.37 509.78 316.37 681.96 345.51 681.96 345.51 538.92 400.24 538.92 406.76 545.44 406.76 571.05 400.24 577.57 354.11 577.57 354.11 613.23 406.76 665.88 406.76 681.96 435.9 681.96 435.9 653.99 388.63 606.71 412.12 606.71 435.9 583.2 435.9 533.29 412.12 509.78 316.37 509.78" />
        <polygon points="564.95 646.3 558.42 652.82 510.21 652.82 503.69 646.3 503.69 509.78 474.55 509.78 474.55 658.43 498.09 681.96 570.3 681.96 594.09 658.45 594.09 509.78 564.95 509.78 564.95 646.3" />
        <path d="M692.39,652.82c-7.97,0-14.46,6.59-14.46,14.68s6.49,14.46,14.46,14.46,14.68-6.49,14.68-14.46-6.59-14.68-14.68-14.68Z" />
        <polygon points="790.92 533.31 790.92 681.96 820.06 681.96 820.06 606.71 902.77 606.71 902.77 577.57 820.06 577.57 820.06 545.44 826.58 538.92 910.46 538.92 910.46 509.78 814.46 509.78 790.92 533.31" />
        <polygon points="1042.91 509.78 1008.99 639.12 975.07 509.78 934.19 509.78 934.19 681.96 963.33 681.96 963.33 579.9 990.26 681.96 1027.71 681.96 1054.64 579.89 1054.64 681.96 1083.78 681.96 1083.78 509.78 1042.91 509.78" />
      </g>
      <path
        d="M.81,408.02l1.07-.92h284.41v-149.14h-38.4v122.24H.81v-183.98h0l.23-97.8h215.01l-.11-31.52-215.12.44V.03l527.28-.03v478h-104.91V103.63l-.06-35.18h-175.46v29.67l145.5.88.22,67.27-145.48-.04v29.99s78.58,0,78.58,0h66.9v281.77H.81M139.1,166.43H30.61v29.81h108.49v-29.81ZM139.1,257.97h-29.81v58.68h29.81v-58.68Z"
        fill="currentColor"
      />
      <polygon
        points="665.33 0 665.33 405.14 735.7 406.19 979.52 406.19 979.52 131.12 949.7 131.17 949.7 379.29 842.31 379.29 842.31 69.68 803.91 69.68 803.91 379.29 694.81 379.29 694.81 0 1084.12 0 1084.12 69.68 949.7 69.68 949.7 99.41 1084.12 99.41 1084.12 477.09 721.48 477.09 556.84 477.09 556.84 0 665.33 0"
        fill="currentColor"
      />
    </svg>
  );
}

export function ListenerDashboard({ stationShortName }: ListenerDashboardProps) {
  const [selectedStation, setSelectedStation] = useState<string>(() => {
    if (typeof window === "undefined") {
      return stationShortName ?? "";
    }
    return window.localStorage.getItem(LAST_STATION_KEY) ?? stationShortName ?? "";
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(70);
  const [hasHydratedVolume, setHasHydratedVolume] = useState(false);
  const [activeStreamUrl, setActiveStreamUrl] = useState<string>(() => {
    if (typeof window === "undefined") {
      return "";
    }

    const initialStation =
      window.localStorage.getItem(LAST_STATION_KEY) ?? stationShortName ?? "";
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
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
  const [liveStatsOpen, setLiveStatsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [submittingRequestId, setSubmittingRequestId] = useState<string | null>(null);
  const [backgroundArtwork, setBackgroundArtwork] = useState("");
  const [nextBackgroundArtwork, setNextBackgroundArtwork] = useState<string | null>(null);
  const [artworkCrossfading, setArtworkCrossfading] = useState(false);
  const crossfadeTimeoutRef = useRef<number | null>(null);
  const crossfadeStartRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const analyserRef = useAudioAnalyser(AUDIO_REACTIVE ? audioRef : { current: null });

  const stations = useStations();

  useEffect(() => {
    if (selectedStation === "") {
      return;
    }
    window.localStorage.setItem(LAST_STATION_KEY, selectedStation);
  }, [selectedStation]);

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
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center gap-6 px-4 py-6 sm:px-6 lg:py-10">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              <StationWordmark />
            </h1>
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
            <Popover open={settingsOpen} onOpenChange={setSettingsOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="rounded-full hover:bg-foreground/8 shadow-none"
                  aria-label="Station and stream settings"
                >
                  <EllipsisVertical />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                className="w-80 space-y-4"
                onInteractOutside={(e) => {
                  const target = e.target as Element | null;
                  if (target?.closest("[data-radix-popper-content-wrapper]")) {
                    e.preventDefault();
                  }
                }}
              >
                {effectiveStreamUrl ? (
                  <a
                    href={effectiveStreamUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                  >
                    Open stream URL
                  </a>
                ) : null}
                <div className="space-y-2">
                  <p className="text-sm font-medium">Station</p>
                  <Select
                    value={selectedStation}
                    onValueChange={(value) => {
                      setSelectedStation(value);
                      setIsPlaying(false);
                      setRequestPage(1);
                      setRequestSearch("");
                      setRequestSearchInput("");
                      const savedStream = window.localStorage.getItem(
                        getStreamStorageKey(value)
                      );
                      setActiveStreamUrl(savedStream ?? "");
                      if (audioRef.current) {
                        audioRef.current.pause();
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select station" />
                    </SelectTrigger>
                    <SelectContent>
                      {stationOptions.length ? (
                        stationOptions.map((entry) => (
                          <SelectItem key={entry.shortcode} value={entry.shortcode}>
                            {entry.name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="__no-station" disabled>
                          No stations available yet
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Stream</p>
                  <Select
                    value={effectiveStreamUrl ?? ""}
                    onValueChange={(value) => {
                      setActiveStreamUrl(value);
                      if (selectedStation) {
                        window.localStorage.setItem(
                          getStreamStorageKey(selectedStation),
                          value
                        );
                      }
                      setIsPlaying(false);
                      if (audioRef.current) {
                        audioRef.current.pause();
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select stream" />
                    </SelectTrigger>
                    <SelectContent>
                      {streamOptions.length ? (
                        streamOptions.map((stream) => (
                          <SelectItem key={stream.url} value={stream.url}>
                            {stream.title}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="__no-stream" disabled>
                          No stream options available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </header>

        {isLoading ? (
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-56 w-full" />
                <Skeleton className="h-10 w-32" />
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="grid gap-6">
            {/* <GlassCard> */}
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
                    <div className="h-48 w-full overflow-hidden rounded-lg bg-muted sm:h-56 sm:w-56">
                      {currentSong?.art ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={currentSong.art}
                          alt={currentSong.text}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                          No artwork
                        </div>
                      )}
                    </div>
                    <div className="rounded-md bg-muted/30 px-3 py-2">
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
                      <h2 className="text-xl font-semibold leading-tight sm:text-2xl">
                        {currentSong?.title ?? "No track loaded"}
                      </h2>
                      <p className="text-base text-muted-foreground">
                        {currentSong?.artist ?? "Unknown artist"}
                      </p>
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
                      <Dialog open={historyDrawerOpen} onOpenChange={setHistoryDrawerOpen}>
                        <DialogTrigger asChild>
                          <Button type="button" variant="ghost" size="icon" className="rounded-full bg-foreground/5 hover:bg-foreground/8 shadow-none" aria-label="Recent tracks">
                            <History />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="left-0 top-0 h-dvh w-[90vw] max-w-md translate-x-0 translate-y-0 rounded-none border-r p-0 sm:max-w-md">
                          <DialogHeader className="border-b px-5 py-4">
                            <DialogTitle>Recent Tracks</DialogTitle>
                            <DialogDescription>History from current station feed</DialogDescription>
                          </DialogHeader>
                          <div className="h-[calc(100dvh-80px)] overflow-y-auto px-5 py-4">
                            {history.length === 0 ? (
                              <p className="text-sm text-muted-foreground">
                                No track history available yet.
                              </p>
                            ) : (
                              <div className="space-y-3">
                                {history.map((entry) => (
                                  <div key={`${entry.played_at}-${entry.song.id}`} className="space-y-2">
                                    <div className="flex items-center gap-3">
                                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded bg-muted">
                                        {entry.song.art ? (
                                          // eslint-disable-next-line @next/next/no-img-element
                                          <img
                                            src={entry.song.art}
                                            alt={entry.song.text}
                                            className="h-full w-full object-cover"
                                          />
                                        ) : (
                                          <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
                                            No art
                                          </div>
                                        )}
                                      </div>
                                      <div className="min-w-0">
                                        <p className="truncate text-sm font-medium leading-snug">
                                          {entry.song.title}
                                        </p>
                                        <p className="truncate text-xs text-muted-foreground">
                                          {entry.song.artist}
                                        </p>
                                      </div>
                                    </div>
                                    <Separator />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
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
                                        <div className="flex items-center gap-3">
                                          <div className="h-10 w-10 overflow-hidden rounded bg-muted">
                                            {item.song.art ? (
                                              // eslint-disable-next-line @next/next/no-img-element
                                              <img
                                                src={item.song.art}
                                                alt={item.song.text}
                                                className="h-full w-full object-cover"
                                              />
                                            ) : null}
                                          </div>
                                          <div>
                                            <p className="text-sm font-medium leading-snug">
                                              {item.song.title}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                              {item.song.artist}
                                            </p>
                                          </div>
                                        </div>
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
                      </div>
                      {audioError ? (
                        <p className="text-sm text-destructive">{audioError}</p>
                      ) : null}
                    </div>
                  </div>
                </div>
              </CardContent>
            {/* </GlassCard> */}

          </div>
        )}

        <audio
          ref={audioRef}
          src={effectiveStreamUrl ?? undefined}
          preload="none"
          crossOrigin={AUDIO_REACTIVE ? "anonymous" : undefined}
          onPause={() => setIsPlaying(false)}
          onPlay={() => setIsPlaying(true)}
        />
      </div>
      {/* <GlassFilter /> */}
    </div>
  );
}
