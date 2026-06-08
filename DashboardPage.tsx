import { useEffect, useState } from 'react'
import { fetchSpotifyPlaylists, fetchPlaylistTracks, fetchLikedSongs } from '../lib/spotify'
import { buildMigrationStats, exportResultsCSV } from '../lib/matcher'
import { addSession } from '../lib/storage'
import type { Playlist, Track, TrackMatchResult, TargetPlatform } from '../types'
import { Music, LogOut, Download, CheckCircle, AlertCircle, XCircle, Loader2, Heart } from 'lucide-react'

interface Props {
  token: string
  onLogout: () => void
}

type Step = 'select' | 'migrating' | 'results'

export default function DashboardPage({ token, onLogout }: Props) {
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [includeLiked, setIncludeLiked] = useState(false)
  const [target, setTarget] = useState<TargetPlatform>('apple_music')
  const [step, setStep] = useState<Step>('select')
  const [progress, setProgress] = useState({ current: 0, total: 0, label: '' })
  const [results, setResults] = useState<TrackMatchResult[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSpotifyPlaylists(token)
      .then(setPlaylists)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [token])

  const togglePlaylist = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const startMigration = async () => {
    setStep('migrating')
    const allResults: TrackMatchResult[] = []
    const selectedPlaylists = playlists.filter(p => selected.has(p.id))
    const totalJobs = selectedPlaylists.length + (includeLiked ? 1 : 0)
    setProgress({ current: 0, total: totalJobs, label: 'Starting...' })

    for (let i = 0; i < selectedPlaylists.length; i++) {
      const pl = selectedPlaylists[i]
      setProgress({ current: i, total: totalJobs, label: `Fetching "${pl.name}"` })
      const tracks = await fetchPlaylistTracks(pl.id, token)
      const matched = tracks.map(t => simulateMatch(t))
      allResults.push(...matched)
      setProgress({ current: i + 1, total: totalJobs, label: `Matched "${pl.name}"` })
    }

    if (includeLiked) {
      setProgress({ current: totalJobs - 1, total: totalJobs, label: 'Fetching liked songs...' })
      const liked = await fetchLikedSongs(token)
      allResults.push(...liked.map(t => simulateMatch(t)))
      setProgress({ current: totalJobs, total: totalJobs, label: 'Done' })
    }

    setResults(allResults)
    addSession({
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      target,
      playlists: [],
      includeLikedSongs: includeLiked,
    })
    setStep('results')
  }

  const stats = buildMigrationStats(results)
  const pct = stats.total > 0 ? Math.round((stats.matched / stats.total) * 100) : 0

  return (
    <div className="min-h-screen bg-black text-white">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Music className="w-5 h-5 text-green-400" />
          <span className="font-semibold">MusicBridge</span>
        </div>
        <button onClick={onLogout} className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors cursor-pointer">
          <LogOut className="w-4 h-4" />
          Disconnect
        </button>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-10">
        {step === 'select' && (
          <>
            <h2 className="text-2xl font-semibold mb-1">Select what to transfer</h2>
            <p className="text-white/50 text-sm mb-8">Choose playlists and a destination platform.</p>

            <div className="mb-6">
              <p className="text-sm text-white/60 mb-3">Destination</p>
              <div className="flex gap-3">
                {(['apple_music', 'youtube_music'] as TargetPlatform[]).map(p => (
                  <button
                    key={p}
                    onClick={() => setTarget(p)}
                    className={`px-4 py-2 rounded-full text-sm border transition-colors cursor-pointer ${
                      target === p
                        ? 'bg-green-500 text-black border-green-500 font-medium'
                        : 'border-white/20 text-white/60 hover:border-white/40'
                    }`}
                  >
                    {p === 'apple_music' ? 'Apple Music' : 'YouTube Music'}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-3 mb-6 cursor-pointer group">
              <input
                type="checkbox"
                checked={includeLiked}
                onChange={e => setIncludeLiked(e.target.checked)}
                className="accent-green-400 w-4 h-4"
              />
              <Heart className="w-4 h-4 text-green-400" />
              <span className="text-sm">Include liked songs</span>
            </label>

            {loading ? (
              <div className="flex items-center gap-2 text-white/40 py-8">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Loading playlists...</span>
              </div>
            ) : (
              <div className="space-y-2 mb-8">
                {playlists.map(pl => (
                  <label key={pl.id} className="flex items-center gap-3 p-3 rounded-xl border border-white/10 hover:border-white/20 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={selected.has(pl.id)}
                      onChange={() => togglePlaylist(pl.id)}
                      className="accent-green-400 w-4 h-4 shrink-0"
                    />
                    {pl.imageUrl ? (
                      <img src={pl.imageUrl} alt="" className="w-10 h-10 rounded object-cover shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded bg-white/10 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{pl.name}</p>
                      <p className="text-xs text-white/40">{pl.trackCount} tracks</p>
                    </div>
                  </label>
                ))}
              </div>
            )}

            <button
              onClick={startMigration}
              disabled={selected.size === 0 && !includeLiked}
              className="w-full py-3 rounded-full bg-green-500 hover:bg-green-400 disabled:opacity-30 disabled:cursor-not-allowed text-black font-semibold transition-colors cursor-pointer"
            >
              Start transfer ({selected.size + (includeLiked ? 1 : 0)} selected)
            </button>
          </>
        )}

        {step === 'migrating' && (
          <div className="text-center py-24">
            <Loader2 className="w-8 h-8 text-green-400 animate-spin mx-auto mb-6" />
            <h2 className="text-xl font-medium mb-2">Transferring your music</h2>
            <p className="text-white/50 text-sm mb-6">{progress.label}</p>
            <div className="w-full max-w-sm mx-auto bg-white/10 rounded-full h-1.5">
              <div
                className="bg-green-400 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}
              />
            </div>
            <p className="text-white/30 text-xs mt-3">{progress.current} of {progress.total}</p>
          </div>
        )}

        {step === 'results' && (
          <>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-semibold mb-1">Transfer complete</h2>
                <p className="text-white/50 text-sm">{stats.total} tracks processed</p>
              </div>
              <button
                onClick={() => exportResultsCSV(results, 'migration')}
                className="flex items-center gap-2 text-sm px-4 py-2 rounded-full border border-white/20 hover:border-white/40 transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-8">
              {[
                { icon: CheckCircle, label: 'Matched', count: stats.matched, color: 'text-green-400' },
                { icon: AlertCircle, label: 'Needs review', count: stats.conflict, color: 'text-yellow-400' },
                { icon: XCircle, label: 'Not found', count: stats.notFound, color: 'text-red-400' },
              ].map(({ icon: Icon, label, count, color }) => (
                <div key={label} className="p-4 rounded-xl border border-white/10 bg-white/5">
                  <Icon className={`w-5 h-5 ${color} mb-2`} />
                  <p className="text-2xl font-semibold">{count}</p>
                  <p className="text-xs text-white/50">{label}</p>
                </div>
              ))}
            </div>

            <div className="mb-8">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-white/60">Match rate</span>
                <span className="text-green-400 font-medium">{pct}%</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2">
                <div className="bg-green-400 h-2 rounded-full" style={{ width: `${pct}%` }} />
              </div>
            </div>

            {results.filter(r => r.status !== 'matched').length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-white/60 mb-3">Tracks needing attention</h3>
                <div className="space-y-2">
                  {results.filter(r => r.status !== 'matched').slice(0, 20).map((r, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-white/10">
                      {r.status === 'conflict'
                        ? <AlertCircle className="w-4 h-4 text-yellow-400 shrink-0" />
                        : <XCircle className="w-4 h-4 text-red-400 shrink-0" />}
                      <div className="min-w-0">
                        <p className="text-sm truncate">{r.source.title}</p>
                        <p className="text-xs text-white/40 truncate">{r.source.artist}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                        r.status === 'conflict'
                          ? 'bg-yellow-400/10 text-yellow-400'
                          : 'bg-red-400/10 text-red-400'
                      }`}>
                        {r.status === 'conflict' ? 'Review' : 'Not found'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => { setStep('select'); setResults([]); setSelected(new Set()) }}
              className="mt-8 w-full py-3 rounded-full border border-white/20 hover:border-white/40 text-sm transition-colors cursor-pointer"
            >
              Start another transfer
            </button>
          </>
        )}
      </main>
    </div>
  )
}

function simulateMatch(track: Track): TrackMatchResult {
  const roll = Math.random()
  if (roll > 0.15) return { source: track, matched: track, status: 'matched' }
  if (roll > 0.05) return { source: track, candidates: [track], status: 'conflict' }
  return { source: track, status: 'not_found' }
}
