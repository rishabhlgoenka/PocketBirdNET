import { motion } from 'framer-motion'

interface Props {
  onStop?: () => void
}

export function ListeningView({ onStop }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col items-center justify-center py-20 gap-6 text-center"
    >
      {/* Pulsing mic */}
      <div className="relative w-24 h-24 flex items-center justify-center">
        <motion.div
          animate={{ scale: [1, 1.7], opacity: [0.2, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut' }}
          className="absolute inset-0 rounded-full bg-accent/20"
        />
        <motion.div
          animate={{ scale: [1, 1.4], opacity: [0.15, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut', delay: 0.7 }}
          className="absolute inset-0 rounded-full bg-accent/15"
        />
        <div className="w-16 h-16 rounded-full bg-accent-faint border-2 border-accent-border flex items-center justify-center">
          <svg className="w-8 h-8 text-accent" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
          </svg>
        </div>
      </div>

      <div>
        <div className="flex items-baseline gap-1 justify-center mb-2">
          <span className="font-mono text-xl font-bold tracking-widest text-ink uppercase">
            Listening
          </span>
          <span className="font-mono text-xl font-bold text-accent animate-blink">_</span>
        </div>
        <p className="text-muted text-sm max-w-xs leading-relaxed">
          Hold the board near a bird and wait. The first confident match will appear here.
        </p>
      </div>

      {onStop && (
        <button
          onClick={onStop}
          className="text-sm text-muted hover:text-ink transition-colors px-4 py-2 rounded-lg hover:bg-gray-100"
        >
          Cancel
        </button>
      )}
    </motion.div>
  )
}
