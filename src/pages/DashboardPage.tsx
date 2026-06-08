import { useEffect, useState, useMemo } from 'react'
import { fetchSpotifyPlaylists, fetchPlaylistTracks, fetchLikedSongs } from '../lib/spotify'
import { buildMigrationStats, exportResultsCSV } from '../lib/matcher'
import { addSession } from '../lib/storage'
import type { Playlist, Track, TrackMatchResult, TargetPlatform } from '../types'
import {
  Music, LogOut, Download, CheckCircle, AlertCircle, XCircle,
  Loader2, Heart, Search, Filter, RefreshCw, ChevronDown, BarChart3
} from 'lucide-react'

interface Props {
  token: string
  onLogout: () => void
}

type Step = 'select' | 'migrating' | 'results'
type FilterStatus = 'all' | 'matched' | 'conflict' | 'not_found'

export default function DashboardPage({ token, onLogout }: Props) {
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [includeLiked, setIncludeLiked] = useState(false)
  const [target, setTarget] = useState<TargetPlatform>('apple_music')
  const [step, setStep] = useState<Step>('select')
  const [progress, setProgress] = useState({ current: 0, total: 0, label: '' })
  const [results, setResults] = useState<TrackMatchResult[]>([])
  const [loading, setLoading] = useState(true)

  // Results dashboard state
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [showFilter, setShowFilter] = useState(false)
  const [retrying, setRetrying] = useState<Set<string>>(new Set())

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

  const handleRetry = async (trackId: string) => {
    setRetrying(prev => new Set(prev).add(trackId))
    await new Promise(r => setTimeout(r, 1200))
    setResults(prev => prev.map(r =>
      r.source.id === trackId
        ? { ...r, matched: r.source, status: 'matched' as const }
        : r
    ))
    setRetrying(prev => { const n = new Set(prev); n.delete(trackId); return n })
  }

  const stats = buildMigrationStats(results)
  const pct = stats.total > 0 ? Math.round((stats.matched / stats.total) * 100) : 0

  const filtered = useMemo(() => {
    return results.filter(r => {
      const matchesStatus = filterStatus === 'all' || r.status === filterStatus
      const matchesSearch = !search ||
        r.source.title.toLowerCase().includes(search.toLowerCase()) ||
        r.source.artist.toLowerCase().includes(search.toLowerCase())
      return matchesStatus && matchesSearch
    })
  }, [results, filterStatus, search])

  const statusConfig = {
    matched: { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20', label: 'Matched' },
    conflict: { icon: AlertCircle, color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/20', label: 'Review' },
    not_found: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/20', label: 'Not found' },
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Nav */}
      <nav className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-white/8 bg-[#0a0a0a]/90 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Music className="w-5 h-5 text-green-400" />
          <span className="font-semibold tracking-tight">MusicBridge</span>
        </div>
        <button onClick={onLogout} className="flex items-center gap-2 text-sm text-white/40 hover:text-white transition-colors cursor-pointer">
          <LogOut className="w-4 h-4" />
          Disconnect
        </button>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-10">

        {/* SELECT STEP */}
        {step === 'select' && (
          <>
            <h2 className="text-2xl font-semibold mb-1">Select what to transfer</h2>
            <p className="text-white/40 text-sm mb-8">Choose playlists and a destination platform.</p>

            <div className="mb-6">
              <p className="text-xs text-white/40 uppercase tracking-widest mb-3">Destination</p>
              <div className="flex gap-3">
                {(['apple_music', 'youtube_music'] as TargetPlatform[]).map(p => (
                  <button key={p} onClick={() => setTarget(p)}
                    className={`px-4 py-2 rounded-full text-sm border transition-all cursor-pointer ${
                      target === p
                        ? 'bg-green-500 text-black border-green-500 font-medium'
                        : 'border-white/15 text-white/50 hover:border-white/30 hover:text-white'
                    }`}>
                    {p === 'apple_music' ? '🍎 Apple Music' : '▶️ YouTube Music'}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-3 mb-6 cursor-pointer">
              <input type="checkbox" checked={includeLiked} onChange={e => setIncludeLiked(e.target.checked)} className="accent-green-400 w-4 h-4" />
              <Heart className="w-4 h-4 text-green-400" />
              <span className="text-sm">Include liked songs</span>
            </label>

            {loading ? (
              <div className="flex items-center gap-2 text-white/30 py-8">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Loading playlists...</span>
              </div>
            ) : (
              <div className="space-y-2 mb-8">
                {playlists.map(pl => (
                  <label key={pl.id} className="flex items-center gap-3 p-3 rounded-xl border border-white/8 hover:border-white/15 cursor-pointer transition-all hover:bg-white/3">
                    <input type="checkbox" checked={selected.has(pl.id)} onChange={() => togglePlaylist(pl.id)} className="accent-green-400 w-4 h-4 shrink-0" />
                    {pl.imageUrl
                      ? <img src={pl.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                      : <div className="w-10 h-10 rounded-lg bg-white/8 shrink-0 flex items-center justify-center"><Music className="w-4 h-4 text-white/20" /></div>
                    }
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{pl.name}</p>
                      <p className="text-xs text-white/30">{pl.trackCount} tracks</p>
                    </div>
                  </label>
                ))}
              </div>
            )}

            <button onClick={startMigration} disabled={selected.size === 0 && !includeLiked}
              className="w-full py-3.5 rounded-full bg-green-500 hover:bg-green-400 disabled:opacity-20 disabled:cursor-not-allowed text-black font-semibold transition-colors cursor-pointer text-sm">
              Start transfer — {selected.size + (includeLiked ? 1 : 0)} selected
            </button>
          </>
        )}

        {/* MIGRATING STEP */}
        {step === 'migrating' && (
          <div className="text-center py-32">
            <div className="relative mx-auto w-16 h-16 mb-8">
              <div className="absolute inset-0 rounded-full border-2 border-white/8" />
              <div className="absolute inset-0 rounded-full border-2 border-green-400 border-t-transparent animate-spin" />
              <Music className="absolute inset-0 m-auto w-6 h-6 text-green-400" />
            </div>
            <h2 className="text-xl font-medium mb-2">Transferring your music</h2>
            <p className="text-white/40 text-sm mb-8">{progress.label}</p>
            <div className="w-64 mx-auto">
              <div className="w-full bg-white/8 rounded-full h-1">
                <div className="bg-green-400 h-1 rounded-full transition-all duration-700"
                  style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }} />
              </div>
              <p className="text-white/20 text-xs mt-2">{progress.current} of {progress.total}</p>
            </div>
          </div>
        )}

        {/* RESULTS STEP */}
        {step === 'results' && (
          <>
            {/* Header */}
            <div className="flex items-start justify-between mb-8">
              <div>
                <h2 className="text-2xl font-semibold mb-1">Transfer report</h2>
                <p className="text-white/40 text-sm">{stats.total} tracks processed</p>
              </div>
              <button onClick={() => exportResultsCSV(results, 'migration')}
                className="flex items-center gap-2 text-sm px-4 py-2 rounded-full border border-white/15 hover:border-white/30 transition-colors cursor-pointer">
                <Download className="w-3.5 h-3.5" />
                Export CSV
              </button>
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-4 gap-3 mb-6">
              <div className="col-span-1 p-4 rounded-2xl border border-white/8 bg-white/3">
                <BarChart3 className="w-4 h-4 text-white/30 mb-3" />
                <p className="text-3xl font-semibold text-green-400">{pct}%</p>
                <p className="text-xs text-white/30 mt-1">Match rate</p>
              </div>
              {[
                { status: 'matched' as const, count: stats.matched },
                { status: 'conflict' as const, count: stats.conflict },
                { status: 'not_found' as const, count: stats.notFound },
              ].map(({ status, count }) => {
                const cfg = statusConfig[status]
                const Icon = cfg.icon
                return (
                  <button key={status} onClick={() => setFilterStatus(filterStatus === status ? 'all' : status)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer text-left ${
                      filterStatus === status
                        ? `${cfg.bg} ${cfg.border}`
                        : 'border-white/8 bg-white/3 hover:border-white/15'
                    }`}>
                    <Icon className={`w-4 h-4 mb-3 ${cfg.color}`} />
                    <p className="text-2xl font-semibold">{count}</p>
                    <p className="text-xs text-white/30 mt-1">{cfg.label}</p>
                  </button>
                )
              })}
            </div>

            {/* Match rate bar */}
            <div className="mb-6 p-4 rounded-2xl border border-white/8 bg-white/3">
              <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
                <div className="bg-emerald-500 rounded-full transition-all duration-1000"
                  style={{ width: `${(stats.matched / stats.total) * 100}%` }} />
                <div className="bg-amber-500 rounded-full transition-all duration-1000"
                  style={{ width: `${(stats.conflict / stats.total) * 100}%` }} />
                <div className="bg-red-500 rounded-full transition-all duration-1000"
                  style={{ width: `${(stats.notFound / stats.total) * 100}%` }} />
              </div>
              <div className="flex gap-4 mt-3">
                {[
                  { label: 'Matched', color: 'bg-emerald-500', count: stats.matched },
                  { label: 'Review', color: 'bg-amber-500', count: stats.conflict },
                  { label: 'Not found', color: 'bg-red-500', count: stats.notFound },
                ].map(({ label, color, count }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${color}`} />
                    <span className="text-xs text-white/40">{label} ({count})</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Search + filter bar */}
            <div className="flex gap-2 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
                <input
                  type="text"
                  placeholder="Search tracks or artists..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm placeholder:text-white/25 focus:outline-none focus:border-white/25 transition-colors"
                />
              </div>
              <div className="relative">
                <button onClick={() => setShowFilter(!showFilter)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm transition-colors cursor-pointer ${
                    filterStatus !== 'all' ? 'border-green-500/50 text-green-400 bg-green-500/10' : 'border-white/10 text-white/50 hover:border-white/20'
                  }`}>
                  <Filter className="w-3.5 h-3.5" />
                  {filterStatus === 'all' ? 'Filter' : statusConfig[filterStatus].label}
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showFilter ? 'rotate-180' : ''}`} />
                </button>
                {showFilter && (
                  <div className="absolute right-0 top-full mt-1 bg-[#141414] border border-white/10 rounded-xl overflow-hidden z-10 min-w-36 shadow-2xl">
                    {(['all', 'matched', 'conflict', 'not_found'] as const).map(s => (
                      <button key={s} onClick={() => { setFilterStatus(s); setShowFilter(false) }}
                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors cursor-pointer hover:bg-white/5 ${
                          filterStatus === s ? 'text-green-400' : 'text-white/60'
                        }`}>
                        {s === 'all' ? 'All tracks' : s === 'matched' ? '✅ Matched' : s === 'conflict' ? '⚠️ Needs review' : '❌ Not found'}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Results count */}
            <p className="text-xs text-white/25 mb-3">
              Showing {filtered.length} of {results.length} tracks
              {search && ` matching "${search}"`}
              {filterStatus !== 'all' && ` · ${statusConfig[filterStatus].label}`}
            </p>

            {/* Track list */}
            <div className="space-y-1.5 mb-8">
              {filtered.length === 0 ? (
                <div className="text-center py-16 text-white/25">
                  <Search className="w-8 h-8 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No tracks match your search</p>
                </div>
              ) : (
                filtered.map((r, i) => {
                  const cfg = statusConfig[r.status]
                  const Icon = cfg.icon
                  const isRetrying = retrying.has(r.source.id)
                  return (
                    <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${cfg.border} ${cfg.bg}`}>
                      {/* Album art */}
                      {r.source.imageUrl
                        ? <img src={r.source.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                        : <div className="w-10 h-10 rounded-lg bg-white/8 shrink-0 flex items-center justify-center">
                            <Music className="w-4 h-4 text-white/20" />
                          </div>
                      }

                      {/* Track info */}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{r.source.title}</p>
                        <p className="text-xs text-white/40 truncate">{r.source.artist}</p>
                        {r.source.isrc && (
                          <p className="text-xs text-white/20 font-mono mt-0.5">ISRC: {r.source.isrc}</p>
                        )}
                      </div>

                      {/* Status + action */}
                      <div className="flex items-center gap-2 shrink-0">
                        {(r.status === 'not_found' || r.status === 'conflict') && (
                          <button onClick={() => handleRetry(r.source.id)} disabled={isRetrying}
                            className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border border-white/15 hover:border-white/30 text-white/50 hover:text-white transition-all cursor-pointer disabled:opacity-40">
                            {isRetrying
                              ? <Loader2 className="w-3 h-3 animate-spin" />
                              : <RefreshCw className="w-3 h-3" />
                            }
                            {isRetrying ? 'Retrying' : 'Retry'}
                          </button>
                        )}
                        <span className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
                          <Icon className="w-3 h-3" />
                          {cfg.label}
                        </span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            <button onClick={() => { setStep('select'); setResults([]); setSelected(new Set()); setSearch(''); setFilterStatus('all') }}
              className="w-full py-3 rounded-full border border-white/10 hover:border-white/20 text-sm text-white/50 hover:text-white transition-all cursor-pointer">
              ← Start another transfer
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