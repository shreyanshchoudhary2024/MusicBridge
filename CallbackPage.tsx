import { useEffect, useState } from 'react'
import { exchangeSpotifyCode } from '../lib/spotify'
import { Music } from 'lucide-react'

interface Props {
  onAuthenticated: (token: string) => void
}

export default function CallbackPage({ onAuthenticated }: Props) {
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const err = params.get('error')

    if (err) {
      setError('Spotify login was cancelled or failed.')
      return
    }

    if (!code) {
      setError('No authorization code received.')
      return
    }

    exchangeSpotifyCode(code)
      .then(tokens => onAuthenticated(tokens.accessToken))
      .catch(e => setError(e.message))
  }, [onAuthenticated])

  return (
    <div className="min-h-screen bg-black flex items-center justify-center text-white">
      <div className="text-center">
        <Music className="w-8 h-8 text-green-400 mx-auto mb-4 animate-pulse" />
        {error ? (
          <>
            <p className="text-red-400 mb-2">Authentication error</p>
            <p className="text-white/50 text-sm">{error}</p>
            <a href="/" className="text-green-400 text-sm mt-4 inline-block hover:underline">Go back</a>
          </>
        ) : (
          <p className="text-white/60">Connecting to Spotify...</p>
        )}
      </div>
    </div>
  )
}
