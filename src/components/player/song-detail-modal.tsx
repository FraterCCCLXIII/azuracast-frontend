"use client";

import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AzuraCastNowPlayingTrack,
  AzuraCastRequestItem,
  AzuraCastSong,
} from "@/types/azuracast";
import {
  findOnDemandSong,
  findRequestableSong,
  submitSongRequest,
} from "@/lib/azuracast/client";
import { Clock, Disc3, Loader2, Music2, Pause, Play, Share2, Tag } from "lucide-react";
import { toast } from "sonner";

export interface SelectedSongEntry {
  song: AzuraCastSong;
  /** Track metadata (duration, played_at, playlist, is_request) from history or now-playing. */
  track?: AzuraCastNowPlayingTrack | null;
  /**
   * Pre-resolved request item when the entry came from the requests list.
   * - `undefined` = not yet checked (will trigger a background lookup)
   * - `null`      = explicitly not requestable
   * - object      = requestable, contains request_url
   */
  requestItem?: AzuraCastRequestItem | null;
}

interface SongDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: SelectedSongEntry | null;
  stationId?: number;
  requestsEnabled?: boolean;
  /**
   * Called when the user starts playing the individual song so the caller
   * can pause the live stream before playback begins.
   */
  onPauseLiveStream?: () => void;
  /** Opens the share sheet for the current song. */
  onShare?: () => void;
}

function formatDuration(totalSeconds?: number): string {
  if (!totalSeconds || totalSeconds <= 0) return "0:00";
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}


export function SongDetailModal({
  open,
  onOpenChange,
  entry,
  stationId,
  requestsEnabled,
  onPauseLiveStream,
  onShare,
}: SongDetailModalProps) {
  // ── Request item ────────────────────────────────────────────────────────────
  const [searchedRequestItem, setSearchedRequestItem] = useState<
    AzuraCastRequestItem | null | undefined
  >(undefined);
  const [isSearchingRequest, setIsSearchingRequest] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ── On-demand audio ─────────────────────────────────────────────────────────
  // undefined = not yet resolved, null = not available, string = proxy URL
  const [onDemandUrl, setOnDemandUrl] = useState<string | null | undefined>(undefined);
  const [isSearchingOnDemand, setIsSearchingOnDemand] = useState(false);
  const [isSongPlaying, setIsSongPlaying] = useState(false);
  const [songError, setSongError] = useState<string | null>(null);
  const songAudioRef = useRef<HTMLAudioElement | null>(null);

  const song = entry?.song ?? null;
  const track = entry?.track ?? null;

  // Use the pre-resolved request item when available; fall back to async search result.
  const hasPreResolved =
    entry !== null && "requestItem" in entry && entry.requestItem !== undefined;
  const requestItem: AzuraCastRequestItem | null | undefined = hasPreResolved
    ? entry?.requestItem
    : searchedRequestItem;

  const extendedSong = requestItem?.song as
    | (AzuraCastRequestItem["song"] & { album?: string; genre?: string })
    | undefined;
  const album = extendedSong?.album;
  const genre = extendedSong?.genre;

  // ── Search for requestable item (for the Request button) ────────────────────
  useEffect(() => {
    if (!open || !song) return;

    if (!requestsEnabled) {
      console.debug("[RequestButton] skip search — requestsEnabled is false");
      setSearchedRequestItem(undefined);
      return;
    }
    if (!stationId) {
      console.debug("[RequestButton] skip search — no stationId");
      setSearchedRequestItem(undefined);
      return;
    }
    if (hasPreResolved) {
      console.debug("[RequestButton] using pre-resolved requestItem:", entry?.requestItem ?? null);
      setSearchedRequestItem(undefined);
      return;
    }

    console.debug("[RequestButton] searching for requestable song", {
      stationId,
      songId: song.id,
      songTitle: song.title,
    });

    const controller = new AbortController();
    setIsSearchingRequest(true);
    setSearchedRequestItem(undefined);

    findRequestableSong(stationId, song.id, song.title, controller.signal)
      .then((found) => {
        console.debug("[RequestButton] search result:", found ?? "not found (null)");
        setSearchedRequestItem(found);
      })
      .catch((err) => {
        console.warn("[RequestButton] search error:", err);
        setSearchedRequestItem(null);
      })
      .finally(() => setIsSearchingRequest(false));

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, song?.id, stationId, requestsEnabled, hasPreResolved]);

  // ── Search for on-demand URL (for the Play button) ──────────────────────────
  useEffect(() => {
    if (!open || !song || !stationId) {
      setOnDemandUrl(undefined);
      return;
    }

    const controller = new AbortController();
    setIsSearchingOnDemand(true);
    setOnDemandUrl(undefined);
    setSongError(null);

    findOnDemandSong(stationId, song.id, song.title, controller.signal)
      .then((item) => setOnDemandUrl(item?.download_url ?? null))
      .catch(() => setOnDemandUrl(null))
      .finally(() => setIsSearchingOnDemand(false));

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, song?.id, stationId]);

  // ── Stop audio playback when modal closes ───────────────────────────────────
  useEffect(() => {
    if (!open) {
      if (songAudioRef.current) {
        songAudioRef.current.pause();
      }
      setIsSongPlaying(false);
      setSongError(null);
    }
  }, [open]);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleToggleSongPlay = () => {
    const audio = songAudioRef.current;
    if (!audio || !onDemandUrl) return;

    if (isSongPlaying) {
      audio.pause();
    } else {
      onPauseLiveStream?.();
      setSongError(null);
      audio.play().catch(() => {
        setSongError("Could not play this track.");
        setIsSongPlaying(false);
      });
    }
  };

  const handleRequest = async () => {
    if (!requestItem?.request_url) {
      console.warn("[RequestButton] handleRequest called but request_url is missing", requestItem);
      return;
    }
    console.debug("[RequestButton] submitting request", {
      request_url: requestItem.request_url,
      song: requestItem.song,
    });
    setSubmitting(true);
    try {
      const result = await submitSongRequest(requestItem.request_url);
      console.debug("[RequestButton] request success:", result);
      toast.success(result.message || "Request submitted!");
      onOpenChange(false);
    } catch (err) {
      console.warn("[RequestButton] request failed:", err);
      toast.error((err as Error).message || "Unable to submit request.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!entry || !song) return null;

  const hasMetadata = album || genre || track?.duration;
  const showPlaySection = isSearchingOnDemand || onDemandUrl !== undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="sr-only">Song Details</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          {/* Artwork */}
          <div className="mx-auto h-44 w-44 shrink-0 overflow-hidden rounded-xl bg-muted shadow-md">
            {song.art ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={song.art} alt={song.text} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center">
                <Music2 className="h-10 w-10 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Title & Artist */}
          <div className="space-y-0.5 text-center">
            <h2 className="text-lg font-semibold leading-tight">
              {song.title || "Unknown Title"}
            </h2>
            <p className="text-sm text-muted-foreground">{song.artist || "Unknown Artist"}</p>
            {track?.is_request ? (
              <Badge variant="secondary" className="mt-1">
                Listener Request
              </Badge>
            ) : null}
          </div>

          {/* Metadata grid */}
          {hasMetadata ? (
            <>
              <Separator />
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                {album ? (
                  <div className="flex items-start gap-2">
                    <Disc3 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        Album
                      </p>
                      <p className="truncate font-medium">{album}</p>
                    </div>
                  </div>
                ) : null}

                {genre ? (
                  <div className="flex items-start gap-2">
                    <Tag className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        Genre
                      </p>
                      <p className="truncate font-medium">{genre}</p>
                    </div>
                  </div>
                ) : null}

                {track?.duration ? (
                  <div className="flex items-start gap-2">
                    <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        Duration
                      </p>
                      <p className="font-medium">{formatDuration(track.duration)}</p>
                    </div>
                  </div>
                ) : null}

              </div>
            </>
          ) : null}

          {/* Play + Share row */}
          {(showPlaySection || onShare) ? (
            <>
              <Separator />
              <div className="flex gap-2">
                {/* Play button — loading skeleton, active button, or hidden when unavailable */}
                {isSearchingOnDemand ? (
                  <Button variant="outline" className="flex-1 gap-2" disabled>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading…
                  </Button>
                ) : onDemandUrl ? (
                  <Button
                    variant="outline"
                    className="flex-1 gap-2"
                    onClick={handleToggleSongPlay}
                    aria-label={isSongPlaying ? "Pause song" : "Play song"}
                  >
                    {isSongPlaying ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    {isSongPlaying ? "Pause" : "Play"}
                  </Button>
                ) : null}

                {onShare ? (
                  <Button
                    variant="outline"
                    className="flex-1 gap-2"
                    onClick={onShare}
                    aria-label="Share this song"
                  >
                    <Share2 className="h-4 w-4" />
                    Share
                  </Button>
                ) : null}
              </div>

              {songError ? (
                <p className="text-center text-xs text-destructive">{songError}</p>
              ) : null}
            </>
          ) : null}

          {/* Request section */}
          {requestsEnabled ? (
            <>
              <Separator />
              {isSearchingRequest ? (
                <Skeleton className="h-9 w-full rounded-md" />
              ) : requestItem ? (
                <Button
                  className="w-full"
                  onClick={() => void handleRequest()}
                  disabled={submitting}
                >
                  {submitting ? "Requesting…" : "Request this song"}
                </Button>
              ) : !isSearchingRequest && (hasPreResolved || searchedRequestItem === null) ? (
                <p className="text-center text-xs text-muted-foreground">
                  This song is not currently requestable.
                </p>
              ) : null}
            </>
          ) : null}
        </div>

        {/* Hidden audio element for on-demand playback */}
        {onDemandUrl ? (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <audio
            ref={songAudioRef}
            src={onDemandUrl}
            preload="none"
            onPlay={() => setIsSongPlaying(true)}
            onPause={() => setIsSongPlaying(false)}
            onEnded={() => setIsSongPlaying(false)}
            onError={() => {
              setIsSongPlaying(false);
              setSongError("Could not play this track.");
            }}
            style={{ display: "none" }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
