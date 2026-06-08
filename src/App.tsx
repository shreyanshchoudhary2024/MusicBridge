import { useEffect, useState } from 'react'
import { getStoredTokens } from './lib/spotify'
import LandingPage from './pages/LandingPage'
import DashboardPage from './pages/DashboardPage'
import CallbackPage from './pages/CallbackPage'

export default function App() {
  const [page, setPage] = useState<'landing' | 'callback' | 'dashboard'>('landing')
  const [spotifyToken, setSpotifyToken] = useState<string | null>(null)

  useEffect(() => {
    const path = window.location.pathname
    if (path === '/callback') {
      setPage('callback')
      return
    }
    const tokens = getStoredTokens()
    if (tokens) {
      setSpotifyToken(tokens.accessToken)
      setPage('dashboard')
    }
  }, [])

  const handleAuthenticated = (token: string) => {
    setSpotifyToken(token)
    setPage('dashboard')
    window.history.pushState({}, '', '/')
  }

  const handleLogout = () => {
    localStorage.removeItem('spotify_tokens')
    setSpotifyToken(null)
    setPage('landing')
  }

  if (page === 'callback') {
    return <CallbackPage onAuthenticated={handleAuthenticated} />
  }

  if (page === 'dashboard' && spotifyToken) {
    return <DashboardPage token={spotifyToken} onLogout={handleLogout} />
  }

  return <LandingPage />
}