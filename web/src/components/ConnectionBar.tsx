import { motion, AnimatePresence } from 'framer-motion'
import type { BLEStatus } from '../types'

interface Props {
  status: BLEStatus
  onConnect: () => void
  onDisconnect: () => void
}

const STATUS_CONFIG: Record<BLEStatus, { label: string; dot: string; pulse: boolean }> = {
  unsupported:  { label: 'UNSUPPORTED',  dot: 'bg-red-400',   pulse: false },
  disconnected: { label: 'DISCONNECTED', dot: 'bg-gray-400',  pulse: false },
  scanning:     { label: 'SCANNING',     dot: 'bg-blue-400',  pulse: true  },
  connected:    { label: 'CONNECTED',    dot: 'bg-green-500', pulse: false },
  error:        { label: 'ERROR',        dot: 'bg-orange-400',pulse: false },
}

export function ConnectionBar({ status, onConnect, onDisconnect }: Props) {
  const cfg = STATUS_CONFIG[status]
  const isConnected = status === 'connected'
  const isScanning  = status === 'scanning'

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2 bg-white border border-rule px-3 py-1.5 rounded-full shadow-card">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot} ${cfg.pulse ? 'animate-pulse' : ''}`} />
        <span className="font-mono text-xs font-medium tracking-widest text-muted">{cfg.label}</span>
      </div>

      <AnimatePresence mode="wait">
        {isScanning ? (
          <motion.div
            key="spin"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-8 h-8 rounded-full border-2 border-accent/30 border-t-accent animate-spin"
          />
        ) : isConnected ? (
          <motion.button
            key="disc"
            initial={{ opacity: 0, x: 6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 6 }}
            onClick={onDisconnect}
            className="text-xs font-medium text-muted hover:text-red-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50"
          >
            Disconnect
          </motion.button>
        ) : (
          <motion.button
            key="conn"
            initial={{ opacity: 0, x: 6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 6 }}
            onClick={onConnect}
            disabled={status === 'unsupported'}
            className="text-xs font-semibold text-white bg-accent hover:bg-accent-dark disabled:opacity-40 disabled:cursor-not-allowed transition-colors px-3 py-1.5 rounded-lg shadow-card"
          >
            Connect Board
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
