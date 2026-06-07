import type { Track, TrackMatchResult } from '../types'

function normalize(str: string): string {
  return str
    .toLowerCase()
    .replace(/\(.*?\)/g, '')
    .replace(/\[.*?\]/g, '')
    .replace(/feat\.?.*/i, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function similarity(a: string, b: string): number {
  const na = normalize(a)
  const nb = normalize(b)
  if (na === nb) return 1
  const longer = Math.max(na.length, nb.length)
  if (longer === 0) return 1
  let matches = 0
  const shorter = na.length < nb.length ? na : nb
  const longer_ = na.length < nb.length ? nb : na
  for (let i = 0; i < shorter.length; i++) {
    if (longer_.includes(shorter[i])) matches++
  }
  return matches / longer
}

export function scoreMatch(source: Track, candidate: Track): number {
  const titleScore = similarity(source.title, candidate.title)
  const artistScore = similarity(source.artist, candidate.artist)
  return titleScore * 0.6 + artistScore * 0.4
}

export function matchTrack(source: Track, candidates: Track[]): TrackMatchResult {
  if (!candidates.length) {
    return { source, status: 'not_found' }
  }

  const isrcMatch = source.isrc
    ? candidates.find(c => c.isrc && c.isrc === source.isrc)
    : null

  if (isrcMatch) {
    return { source, matched: isrcMatch, status: 'matched' }
  }

  const scored = candidates
    .map(c => ({ track: c, score: scoreMatch(source, c) }))
    .sort((a, b) => b.score - a.score)

  const top = scored[0]

  if (top.score >= 0.85) {
    return { source, matched: top.track, status: 'matched' }
  }

  if (top.score >= 0.55) {
    return {
      source,
      candidates: scored.slice(0, 3).map(s => s.track),
      status: 'conflict',
    }
  }

  return { source, status: 'not_found' }
}

export function buildMigrationStats(results: TrackMatchResult[]) {
  return {
    total: results.length,
    matched: results.filter(r => r.status === 'matched').length,
    conflict: results.filter(r => r.status === 'conflict').length,
    notFound: results.filter(r => r.status === 'not_found').length,
  }
}

export function exportResultsCSV(results: TrackMatchResult[], playlistName: string): void {
  const rows = [
    ['Status', 'Source Title', 'Source Artist', 'Source ISRC', 'Matched Title', 'Matched Artist'],
    ...results.map(r => [
      r.status,
      r.source.title,
      r.source.artist,
      r.source.isrc || '',
      r.matched?.title || '',
      r.matched?.artist || '',
    ]),
  ]
  const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `musicbridge-${playlistName.replace(/[^a-z0-9]/gi, '_')}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
