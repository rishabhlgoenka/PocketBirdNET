import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useBLE } from './hooks/useBLE'
import type { Detection } from './types'

import { UnsupportedBrowser } from './components/UnsupportedBrowser'
import { ConnectionBar } from './components/ConnectionBar'
import { ListeningView } from './components/ListeningView'
import { DetectionCard } from './components/DetectionCard'

// ── Bird logo SVG ─────────────────────────────────────────────────────────

function BirdLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 24" fill="currentColor">
      {/* Two wings meeting at center body — classic bird-in-flight silhouette */}
      <path d="M2 12 C6 4 13 3 20 8 C27 3 34 4 38 12 C33 10 28 11 24 14 C22 15 21 16 20 16 C19 16 18 15 16 14 C12 11 7 10 2 12 Z"/>
    </svg>
  )
}

// ── Sub-views ──────────────────────────────────────────────────────────────

function DisconnectedHero({ onConnect }: { onConnect: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex flex-col items-center justify-center py-20 gap-6 text-center"
    >
      <div className="w-20 h-20 rounded-2xl bg-accent-faint border border-accent-border flex items-center justify-center">
        <BirdLogo className="w-12 h-8 text-accent" />
      </div>
      <div>
        <h2 className="text-2xl font-bold text-ink mb-2">Ready when you are</h2>
        <p className="text-muted max-w-xs leading-relaxed text-sm">
          Connect your Arduino Nano 33 BLE Sense and press Listen to start identifying birds nearby.
        </p>
      </div>
      <button
        onClick={onConnect}
        className="flex items-center gap-2 bg-accent hover:bg-accent-dark text-white font-semibold text-sm px-6 py-3 rounded-xl shadow-card-md transition-colors"
      >
        Connect Board
      </button>
      <p className="text-xs text-subtle">
        Chrome or Edge only. The browser will show its own device picker.
      </p>
    </motion.div>
  )
}

function ScanningView() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center py-20 gap-5"
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
      className="flex flex-col items-center justify-center py-20 gap-6 text-center"
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
      className="flex flex-col items-center justify-center py-20 gap-5 text-center"
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

  // Whether the user has pressed "Start Listening" for this round
  const [listeningActive, setListeningActive] = useState(false)

  // The detection we are currently showing (locked until user dismisses)
  const [lockedDetection, setLockedDetection] = useState<Detection | null>(null)

  // When a qualifying detection arrives while we are listening, lock onto it
  useEffect(() => {
    if (listeningActive && ble.detection !== null) {
      setLockedDetection(ble.detection)
      setListeningActive(false)
    }
  }, [ble.detection, listeningActive])

  // Clear UI state whenever the board disconnects
  useEffect(() => {
    if (ble.status !== 'connected') {
      setListeningActive(false)
      setLockedDetection(null)
    }
  }, [ble.status])

  const handleListenAgain = () => {
    setLockedDetection(null)
    setListeningActive(true)
  }

  const handleStopListening = () => {
    setListeningActive(false)
  }

  const unsupported = typeof navigator !== 'undefined' && !navigator.bluetooth
  if (unsupported) return <UnsupportedBrowser />

  const connected = ble.status === 'connected'
  const showCard    = connected && lockedDetection !== null
  const showListen  = connected && listeningActive
  const showIdle    = connected && !listeningActive && !lockedDetection

  return (
    <div className="min-h-screen bg-sheet flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-rule shadow-card">
        <div className="max-w-2xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BirdLogo className="w-8 h-6 text-accent" />
            <span className="font-bold text-sm tracking-wide text-ink">PocketBirdNET</span>
          </div>

          <ConnectionBar
            status={ble.status}
            onConnect={ble.connect}
            onDisconnect={() => { ble.disconnect(); setLockedDetection(null); setListeningActive(false) }}
          />
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-5 py-8">
        <AnimatePresence mode="wait">
          {ble.status === 'disconnected' && (
            <DisconnectedHero key="disconnected" onConnect={ble.connect} />
          )}
          {ble.status === 'scanning' && (
            <ScanningView key="scanning" />
          )}
          {showIdle && (
            <IdleView key="idle" onStartListening={() => setListeningActive(true)} />
          )}
          {showListen && (
            <ListeningView key="listening" onStop={handleStopListening} />
          )}
          {showCard && (
            <DetectionCard
              key={`card-${lockedDetection!.timestamp}`}
              detection={lockedDetection!}
              onListenAgain={handleListenAgain}
            />
          )}
          {ble.status === 'error' && (
            <ErrorView key="error" message={ble.error} onRetry={ble.connect} />
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t border-rule px-5 py-3">
        <p className="text-center text-[11px] font-mono text-subtle">
          Chrome or Edge only &nbsp;·&nbsp; Web Bluetooth &nbsp;·&nbsp; Open at localhost
        </p>
      </footer>
    </div>
  )
}
