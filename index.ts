export interface Track {
  id: string
  title: string
  artist: string
  album: string
  isrc?: string
  durationMs?: number
  imageUrl?: string
}

export interface Playlist {
  id: string
  name: string
  description?: string
  trackCount: number
  imageUrl?: string
  tracks?: Track[]
}

export type MatchStatus = 'matched' | 'conflict' | 'not_found'

export interface TrackMatchResult {
  source: Track
  matched?: Track
  candidates?: Track[]
  status: MatchStatus
}

export interface PlaylistMigrationResult {
  playlist: Playlist
  results: TrackMatchResult[]
  matchedCount: number
  conflictCount: number
  notFoundCount: number
}

export type TargetPlatform = 'apple_music' | 'youtube_music'

export interface MigrationSession {
  id: string
  createdAt: string
  target: TargetPlatform
  playlists: PlaylistMigrationResult[]
  includeLikedSongs: boolean
}

export interface SpotifyTokens {
  accessToken: string
  expiresAt: number
}
