import { useState, useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useBLE } from './hooks/useBLE'
import type { Detection } from './types'

import { UnsupportedBrowser } from './components/UnsupportedBrowser'
import { ConnectionBar } from './components/ConnectionBar'
import { ListeningView } from './components/ListeningView'
import { DetectionCard } from './components/DetectionCard'
import { LandingPage } from './components/LandingPage'
import { ResearchPage } from './components/ResearchPage'

type Page = 'home' | 'research'

// ── Logo ──────────────────────────────────────────────────────────────────

function BirdLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 24" fill="currentColor">
      <path d="M2 12 C6 4 13 3 20 8 C27 3 34 4 38 12 C33 10 28 11 24 14 C22 15 21 16 20 16 C19 16 18 15 16 14 C12 11 7 10 2 12 Z"/>
    </svg>
  )
}

// ── Detection sub-views ───────────────────────────────────────────────────

function ScanningView() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center py-24 gap-5"
    >
      <div className="relative w-14 h-14">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          className="w-14 h-14 rounded-full border-2 border-accent-border border-t-accent"
        />
      </div>
      <div className="text-center">
        <p className="font-semibold text-ink text-sm">Looking for the board...</p>
        <p className="text-xs text-muted mt-1">Make sure it is powered on and close by</p>
      </div>
    </motion.div>
  )
}

function IdleView({ onStartListening }: { onStartListening: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center py-24 gap-6 text-center"
    >
      <div className="w-20 h-20 rounded-2xl bg-green-50 border border-green-200 flex items-center justify-center">
        <svg className="w-8 h-8 text-green-600" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
        </svg>
      </div>
      <div>
        <p className="text-xs font-mono font-semibold text-green-600 tracking-widest uppercase mb-2">Board Connected</p>
        <h2 className="text-2xl font-bold text-ink mb-2">Ready to listen</h2>
        <p className="text-muted max-w-xs leading-relaxed text-sm">
          Point your board toward a bird and press the button below.
        </p>
      </div>
      <button
        onClick={onStartListening}
        className="flex items-center gap-2 bg-accent hover:bg-accent-dark text-white font-semibold px-8 py-3 rounded-xl shadow-card-md transition-colors"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5-3c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
        </svg>
        Start Listening
      </button>
    </motion.div>
  )
}

function ErrorView({ message, onRetry }: { message: string | null; onRetry: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center py-24 gap-5 text-center"
    >
      <div className="w-14 h-14 rounded-full bg-red-50 border border-red-200 flex items-center justify-center">
        <svg className="w-6 h-6 text-red-500" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
        </svg>
      </div>
      <div>
        <p className="font-semibold text-ink mb-1">Could not connect</p>
        <p className="text-sm text-muted max-w-xs leading-relaxed">{message ?? 'Something went wrong.'}</p>
      </div>
      <button
        onClick={onRetry}
        className="text-sm font-semibold text-white bg-accent hover:bg-accent-dark px-5 py-2.5 rounded-xl shadow-card transition-colors"
      >
        Try again
      </button>
    </motion.div>
  )
}

// ── Root ──────────────────────────────────────────────────────────────────

export default function App() {
  const ble = useBLE()
  const [page, setPage] = useState<Page>('home')
  const [listeningActive, setListeningActive] = useState(false)
  const [lockedDetection, setLockedDetection] = useState<Detection | null>(null)
  // Track when the current listen session started so we never re-lock
  // onto a detection that arrived before the user pressed "Listen for another".
  const listenSinceRef = useRef<number>(0)

  useEffect(() => {
    if (
      listeningActive &&
      ble.detection !== null &&
      ble.detection.timestamp > listenSinceRef.current
    ) {
      setLockedDetection(ble.detection)
      setListeningActive(false)
    }
  }, [ble.detection, listeningActive])

  useEffect(() => {
    if (ble.status !== 'connected') {
      setListeningActive(false)
      setLockedDetection(null)
    }
  }, [ble.status])

  if (typeof navigator !== 'undefined' && !navigator.bluetooth) {
    return <UnsupportedBrowser />
  }

  const isLanding = ble.status === 'disconnected'
  const connected  = ble.status === 'connected'
  const showCard   = connected && lockedDetection !== null
  const showListen = connected && listeningActive
  const showIdle   = connected && !listeningActive && !lockedDetection

  return (
    <div className="min-h-screen bg-sheet flex flex-col">

      {/* ── Header ── */}
      <header className="sticky top-0 z-50 bg-white border-b border-rule shadow-card">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between gap-6">

          {/* Logo */}
          <button
            onClick={() => setPage('home')}
            className="flex items-center gap-2.5 flex-shrink-0 hover:opacity-80 transition-opacity"
          >
            <BirdLogo className="w-8 h-6 text-accent" />
            <span className="font-bold text-sm tracking-wide text-ink">PocketBirdNET</span>
          </button>

          {/* Nav links */}
          <nav className="flex items-center gap-1">
            <button
              onClick={() => setPage('research')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                page === 'research'
                  ? 'bg-accent-faint text-accent'
                  : 'text-muted hover:text-ink hover:bg-sheet'
              }`}
            >
              About
            </button>
            <a
              href="https://github.com/rishabhlgoenka/PocketBirdNET"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-muted hover:text-ink hover:bg-sheet transition-colors"
            >
              Source Code
              <svg className="w-2.5 h-2.5 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"/>
              </svg>
            </a>
            <a
              href="https://github.com/kahst/BirdNET-Analyzer"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-muted hover:text-ink hover:bg-sheet transition-colors"
            >
              BirdNET
              <svg className="w-2.5 h-2.5 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"/>
              </svg>
            </a>
          </nav>

          {/* Connection bar (only when not on landing) */}
          {!isLanding && (
            <div className="flex-shrink-0">
              <ConnectionBar
                status={ble.status}
                onConnect={ble.connect}
                onDisconnect={() => {
                  ble.disconnect()
                  setLockedDetection(null)
                  setListeningActive(false)
                }}
              />
            </div>
          )}
        </div>
      </header>

      {/* ── Main ── */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-6">
        <AnimatePresence mode="wait">

          {/* Research page — accessible from anywhere */}
          {page === 'research' && (
            <motion.div key="research" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ResearchPage />
            </motion.div>
          )}

          {/* Home / detection flow */}
          {page === 'home' && (
            <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <AnimatePresence mode="wait">
                {isLanding && (
                  <LandingPage key="landing" onConnect={ble.connect} />
                )}
                {ble.status === 'scanning' && (
                  <ScanningView key="scanning" />
                )}
                {showIdle && (
                  <IdleView key="idle" onStartListening={() => {
                    listenSinceRef.current = Date.now()
                    setListeningActive(true)
                  }} />
                )}
                {showListen && (
                  <ListeningView key="listening" onStop={() => setListeningActive(false)} />
                )}
                {showCard && (
                  <DetectionCard
                    key={`card-${lockedDetection!.timestamp}`}
                    detection={lockedDetection!}
                    onListenAgain={() => {
                    setLockedDetection(null)
                    listenSinceRef.current = Date.now()
                    setListeningActive(true)
                  }}
                  />
                )}
                {ble.status === 'error' && (
                  <ErrorView key="error" message={ble.error} onRetry={ble.connect} />
                )}
              </AnimatePresence>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-rule px-6 py-3">
        <p className="text-center text-[11px] font-mono text-subtle">
          Chrome or Edge only &nbsp;·&nbsp; Web Bluetooth API &nbsp;·&nbsp; Requires physical board
        </p>
      </footer>
    </div>
  )
}
