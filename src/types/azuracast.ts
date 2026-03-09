export interface AzuraCastSong {
  id: string;
  text: string;
  artist: string;
  title: string;
  art: string | null;
}

export interface AzuraCastListeners {
  total: number;
  unique: number;
  current: number;
}

export interface AzuraCastNowPlayingTrack {
  sh_id?: number;
  cued_at?: number;
  played_at: number;
  duration: number;
  elapsed?: number;
  remaining?: number;
  playlist?: string;
  is_request?: boolean;
  song: AzuraCastSong;
}

export interface AzuraCastStationMount {
  id: number;
  name: string;
  url: string;
  path: string;
  is_default: boolean;
  bitrate?: number;
  format?: string;
  listeners?: AzuraCastListeners;
}

export interface AzuraCastStationRemote {
  id?: number;
  name: string;
  url: string;
  bitrate?: number;
  format?: string;
  listeners?: AzuraCastListeners;
}

export interface AzuraCastStation {
  id: number;
  name: string;
  shortcode: string;
  listen_url: string;
  public_player_url?: string;
  description?: string;
  is_public?: boolean;
  mounts?: AzuraCastStationMount[];
  remotes?: AzuraCastStationRemote[];
  hls_enabled?: boolean;
  hls_is_default?: boolean;
  hls_url?: string | null;
  hls_listeners?: number;
  requests_enabled?: boolean;
}

export interface AzuraCastLive {
  is_live: boolean;
  streamer_name?: string;
  broadcast_start?: number | null;
  art?: string | null;
}

export interface AzuraCastNowPlaying {
  station: AzuraCastStation;
  live?: AzuraCastLive;
  now_playing: AzuraCastNowPlayingTrack;
  playing_next?: AzuraCastNowPlayingTrack | null;
  song_history?: AzuraCastNowPlayingTrack[];
  listeners?: AzuraCastListeners;
}

export interface AzuraCastRequestItem {
  request_id: string;
  request_url: string;
  song: AzuraCastSong & {
    album?: string;
    genre?: string;
    custom_fields?: Record<string, string>;
  };
}

export interface AzuraCastStatusResponse {
  success: boolean;
  message: string;
  formatted_message?: string;
}

export interface AzuraCastOnDemandItem {
  /** Unique file ID — used in the download URL. */
  track_id: string;
  /** Relative URL for the file, e.g. `/api/station/1/ondemand/download/{track_id}`. */
  download_url: string;
  media: AzuraCastSong & {
    album?: string;
    genre?: string;
    custom_fields?: Record<string, string>;
  };
  playlist: string;
}
