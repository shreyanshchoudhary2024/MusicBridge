import type { MigrationSession } from '../types'

const KEY = 'musicbridge_sessions'

export function saveSessions(sessions: MigrationSession[]) {
  localStorage.setItem(KEY, JSON.stringify(sessions))
}

export function loadSessions(): MigrationSession[] {
  const raw = localStorage.getItem(KEY)
  return raw ? JSON.parse(raw) : []
}

export function addSession(session: MigrationSession) {
  const sessions = loadSessions()
  sessions.unshift(session)
  saveSessions(sessions.slice(0, 10))
}

export function clearSessions() {
  localStorage.removeItem(KEY)
}
