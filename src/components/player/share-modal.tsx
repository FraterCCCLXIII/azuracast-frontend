"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Mail } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface ShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stationName?: string;
  songId?: string;
  songTitle?: string;
  songArtist?: string;
  songArt?: string | null;
  /**
   * Explicit URL to share. When provided it overrides the current
   * `window.location.href` — use this when the modal is opened from a
   * context that has already cleaned up URL params (e.g. after closing
   * the song detail modal).
   */
  shareUrl?: string;
}

const COPY_RESET_MS = 2000;

function buildShareText(
  stationName?: string,
  songTitle?: string,
  songArtist?: string
): string {
  if (songTitle && songArtist) {
    return `Listening to ${songArtist} – ${songTitle}${stationName ? ` on ${stationName}` : ""} 🎵`;
  }
  if (stationName) {
    return `Tuned in to ${stationName} 🎵`;
  }
  return "Check out this radio station 🎵";
}

interface SocialCircleProps {
  label: string;
  href: string;
  color: string;
  iconColor?: string;
  icon: React.ReactNode;
}

function SocialCircle({ label, href, color, iconColor = "white", icon }: SocialCircleProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={label}
      aria-label={`Share on ${label}`}
      className="flex size-11 items-center justify-center rounded-full border border-border/40 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      style={{ backgroundColor: color, color: iconColor }}
    >
      {icon}
    </a>
  );
}

type LinkType = "song" | "station";

function stripSongParams(url: string): string {
  try {
    const u = new URL(url);
    u.searchParams.delete("song");
    u.searchParams.delete("song_t");
    u.searchParams.delete("song_a");
    return u.toString();
  } catch {
    return url;
  }
}

export function ShareModal({
  open,
  onOpenChange,
  stationName,
  songId,
  songTitle,
  songArtist,
  songArt,
  shareUrl,
}: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [linkType, setLinkType] = useState<LinkType>("song");

  const baseUrl = shareUrl ?? (typeof window !== "undefined" ? window.location.href : "");
  const stationUrl = stripSongParams(baseUrl);

  // If the caller has song info but the URL doesn't already have song params,
  // synthesise the song URL ourselves (e.g. sharing from the main player bar).
  const synthesisedSongUrl: string | undefined =
    songId && songTitle && songArtist && baseUrl === stationUrl
      ? (() => {
          try {
            const u = new URL(baseUrl);
            u.searchParams.set("song", songId);
            u.searchParams.set("song_t", songTitle);
            u.searchParams.set("song_a", songArtist);
            return u.toString();
          } catch {
            return undefined;
          }
        })()
      : undefined;

  const rawUrl = synthesisedSongUrl ?? baseUrl;
  const hasSongLink = rawUrl !== stationUrl;

  // Reset to "song" tab each time the modal opens
  useEffect(() => {
    if (open) setLinkType("song");
  }, [open]);

  const pageUrl = hasSongLink && linkType === "station" ? stationUrl : rawUrl;
  const shareText =
    hasSongLink && linkType === "station"
      ? buildShareText(stationName)
      : buildShareText(stationName, songTitle, songArtist);
  const encodedText = encodeURIComponent(shareText);
  const encodedUrl = encodeURIComponent(pageUrl);

  const copyToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(pageUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), COPY_RESET_MS);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Failed to copy — please copy manually.");
    }
  }, [pageUrl]);

  const socialLinks: SocialCircleProps[] = [
    {
      label: "X / Twitter",
      href: `https://x.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
      color: "#ffffff",
      iconColor: "#000000",
      icon: (
        <svg viewBox="0 0 24 24" className="size-4 fill-current" aria-hidden="true">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.742l7.732-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
        </svg>
      ),
    },
    {
      label: "WhatsApp",
      href: `https://wa.me/?text=${encodeURIComponent(`${shareText} ${pageUrl}`)}`,
      color: "#25D366",
      icon: (
        <svg viewBox="0 0 24 24" className="size-4 fill-current" aria-hidden="true">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      ),
    },
    {
      label: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      color: "#1877F2",
      icon: (
        <svg viewBox="0 0 24 24" className="size-4 fill-current" aria-hidden="true">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
    },
    {
      label: "Telegram",
      href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
      color: "#2AABEE",
      icon: (
        <svg viewBox="0 0 24 24" className="size-4 fill-current" aria-hidden="true">
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.820 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
        </svg>
      ),
    },
    {
      label: "Email",
      href: `mailto:?subject=${encodeURIComponent(`${stationName ?? "Radio"} – Now Playing`)}&body=${encodeURIComponent(`${shareText}\n\nListen here: ${pageUrl}`)}`,
      color: "#6B7280",
      icon: <Mail className="size-4" aria-hidden="true" />,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Share</DialogTitle>
          <DialogDescription>
            Share Tiru.fm or the current track with others.
          </DialogDescription>
        </DialogHeader>

        {(songArt || songTitle || songArtist) && (
          <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
            {songArt && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={songArt}
                alt={songTitle ?? "Album art"}
                className="h-12 w-12 rounded object-cover"
              />
            )}
            <div className="min-w-0 flex-1">
              {songTitle && (
                <p className="truncate text-sm font-medium">{songTitle}</p>
              )}
              {songArtist && (
                <p className="truncate text-xs text-muted-foreground">
                  {songArtist}
                </p>
              )}
              {stationName && (
                <p className="truncate text-xs text-muted-foreground">
                  {stationName}
                </p>
              )}
            </div>
          </div>
        )}

        {hasSongLink && (
          <div
            role="tablist"
            aria-label="Link type"
            className="flex rounded-lg border border-border bg-muted/40 p-0.5 text-sm"
          >
            {(["song", "station"] as const).map((type) => (
              <button
                key={type}
                role="tab"
                type="button"
                aria-selected={linkType === type}
                onClick={() => { setLinkType(type); setCopied(false); }}
                className={[
                  "flex-1 rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                  linkType === type
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                ].join(" ")}
              >
                {type === "song" ? "Song link" : "Station link"}
              </button>
            ))}
          </div>
        )}

        <div className="space-y-1.5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Link
          </p>
          <div className="flex gap-2">
            <Input
              readOnly
              value={pageUrl}
              className="flex-1 text-xs"
              onFocus={(e) => e.target.select()}
              aria-label="Page URL"
            />
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={() => void copyToClipboard()}
              aria-label="Copy link"
            >
              {copied ? (
                <Check className="size-4 text-green-500" />
              ) : (
                <Copy className="size-4" />
              )}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Share on
          </p>
          <div className="flex justify-between">
            {socialLinks.map((link) => (
              <SocialCircle key={link.label} {...link} />
            ))}
          </div>
        </div>

        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  );
}
