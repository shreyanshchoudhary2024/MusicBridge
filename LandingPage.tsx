import { Music, ArrowRight, GitFork, Zap, Shield, Heart } from 'lucide-react'
import { initiateSpotifyLogin } from '../lib/spotify'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Music className="w-5 h-5 text-green-400" />
          <span className="font-semibold text-lg">MusicBridge</span>
        </div>
        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
        >
          <GitFork className="w-4 h-4" />
          Open source
        </a>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 text-xs bg-white/10 text-white/70 px-3 py-1 rounded-full mb-8">
          <Heart className="w-3 h-3 text-green-400" />
          Free forever · No account needed · No paywalls
        </div>

        <h1 className="text-5xl font-semibold mb-6 leading-tight">
          Move your music.<br />
          <span className="text-green-400">Keep everything.</span>
        </h1>

        <p className="text-white/60 text-lg mb-12 max-w-2xl mx-auto">
          Transfer playlists, liked songs, and albums from Spotify to Apple Music or YouTube Music.
          ISRC-first matching means fewer misses. Manual conflict resolution means nothing gets silently dropped.
        </p>

        <button
          onClick={initiateSpotifyLogin}
          className="inline-flex items-center gap-3 bg-green-500 hover:bg-green-400 text-black font-semibold px-8 py-4 rounded-full text-base transition-colors cursor-pointer"
        >
          Connect Spotify to get started
          <ArrowRight className="w-4 h-4" />
        </button>

        <p className="text-white/30 text-sm mt-4">
          Only read permissions. We never modify your Spotify account.
        </p>

        <div className="grid grid-cols-3 gap-6 mt-24">
          {[
            { icon: Zap, title: 'ISRC-first matching', desc: 'Songs matched by universal ID before fuzzy search. Fewer wrong tracks.' },
            { icon: Shield, title: 'Nothing silently dropped', desc: 'Every unmatched track is shown. You decide what to do with it.' },
            { icon: Heart, title: 'Free, always', desc: 'No subscription, no limits, no account. Open source on GitHub.' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="text-left p-6 rounded-2xl border border-white/10 bg-white/5">
              <Icon className="w-5 h-5 text-green-400 mb-3" />
              <h3 className="font-medium mb-2">{title}</h3>
              <p className="text-white/50 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
