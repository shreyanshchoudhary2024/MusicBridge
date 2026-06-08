import type { Playlist, Track, SpotifyTokens } from '../types'

const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID || ''
const REDIRECT_URI = import.meta.env.VITE_REDIRECT_URI || window.location.origin + '/callback'
const SCOPES = [
  'user-library-read',
  'playlist-read-private',
  'playlist-read-collaborative',
  'user-follow-read',
].join(' ')

function generateCodeVerifier(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

export async function initiateSpotifyLogin() {
  const verifier = generateCodeVerifier()
  const challenge = await generateCodeChallenge(verifier)
  sessionStorage.setItem('spotify_verifier', verifier)
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    code_challenge_method: 'S256',
    code_challenge: challenge,
  })
  window.location.href = `https://accounts.spotify.com/authorize?${params}`
}

export async function exchangeSpotifyCode(code: string): Promise<SpotifyTokens> {
  const verifier = sessionStorage.getItem('spotify_verifier') || ''
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      code_verifier: verifier,
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error_description || 'Spotify auth failed')
  const tokens: SpotifyTokens = {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  }
  localStorage.setItem('spotify_tokens', JSON.stringify(tokens))
  return tokens
}

export function getStoredTokens(): SpotifyTokens | null {
  const raw = localStorage.getItem('spotify_tokens')
  if (!raw) return null
  const tokens: SpotifyTokens = JSON.parse(raw)
  if (Date.now() > tokens.expiresAt) {
    localStorage.removeItem('spotify_tokens')
    return null
  }
  return tokens
}

export function clearSpotifyTokens() {
  localStorage.removeItem('spotify_tokens')
}

async function spotifyFetch(path: string, token: string) {
  const res = await fetch(`https://api.spotify.com/v1${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`Spotify API error: ${res.status}`)
  return res.json()
}

function toTrack(item: any): Track {
  const t = item.track || item
  return {
    id: t.id,
    title: t.name,
    artist: t.artists?.map((a: any) => a.name).join(', ') || '',
    album: t.album?.name || '',
    isrc: t.external_ids?.isrc,
    durationMs: t.duration_ms,
    imageUrl: t.album?.images?.[0]?.url,
  }
}

export async function fetchSpotifyPlaylists(token: string): Promise<Playlist[]> {
  const playlists: Playlist[] = []
  let url = '/me/playlists?limit=50'
  while (url) {
    const data = await spotifyFetch(url, token)
    for (const p of data.items) {
      playlists.push({
        id: p.id,
        name: p.name,
        description: p.description,
        trackCount: p.tracks.total,
        imageUrl: p.images?.[0]?.url,
      })
    }
    url = data.next ? data.next.replace('https://api.spotify.com/v1', '') : ''
  }
  return playlists
}

export async function fetchPlaylistTracks(playlistId: string, token: string): Promise<Track[]> {
  const tracks: Track[] = []
  let url = `/playlists/${playlistId}/tracks?limit=100&fields=next,items(track(id,name,artists,album,duration_ms,external_ids))`
  while (url) {
    const data = await spotifyFetch(url, token)
    for (const item of data.items) {
      if (item.track && item.track.id) tracks.push(toTrack(item))
    }
    url = data.next ? data.next.replace('https://api.spotify.com/v1', '') : ''
  }
  return tracks
}

export async function fetchLikedSongs(token: string): Promise<Track[]> {
  const tracks: Track[] = []
  let url = '/me/tracks?limit=50'
  while (url) {
    const data = await spotifyFetch(url, token)
    for (const item of data.items) {
      if (item.track) tracks.push(toTrack(item))
    }
    url = data.next ? data.next.replace('https://api.spotify.com/v1', '') : ''
  }
  return tracks
}
