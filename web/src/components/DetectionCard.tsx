import { useState } from 'react'
import { motion } from 'framer-motion'
import type { Detection } from '../types'

interface Props {
  detection: Detection
  onListenAgain: () => void
}

function ConfidenceBadge({ value }: { value: number }) {
  const color =
    value >= 85 ? 'bg-green-100 text-green-700 ring-green-200' :
    value >= 70 ? 'bg-blue-100  text-blue-700  ring-blue-200'  :
                  'bg-amber-100 text-amber-700 ring-amber-200'

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-semibold ring-1 ${color}`}>
      <span className="font-mono">{value}%</span>
      <span className="font-normal opacity-70">confidence</span>
    </span>
  )
}

export function DetectionCard({ detection, onListenAgain }: Props) {
  const { species, confidence } = detection
  const [imgError, setImgError] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 32, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -16, scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="w-full max-w-xl mx-auto"
    >
      <div className="card-md overflow-hidden">
        {/* Photo */}
        <div className="relative overflow-hidden bg-sheet" style={{ height: '240px' }}>
          {!imgError ? (
            <motion.img
              key={species.imagePath}
              src={species.imagePath}
              alt={species.commonName}
              onError={() => setImgError(true)}
              initial={{ scale: 1.04 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              className="w-full h-full object-cover"
              style={{ objectPosition: 'center 30%' }}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-sheet text-subtle gap-2">
              <svg className="w-12 h-12 opacity-20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
              </svg>
              <span className="text-xs">Run scripts/download-bird-images.sh to get photos</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />

          <div className="absolute bottom-0 left-0 right-0 p-4">
            <motion.p
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-[11px] font-mono font-semibold text-white/60 tracking-[0.18em] uppercase mb-1"
            >
              Species detected
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="text-2xl font-extrabold text-white leading-tight"
            >
              {species.commonName}
            </motion.h2>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Confidence */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.22 }}
          >
            <ConfidenceBadge value={confidence} />
          </motion.div>

          <hr className="border-rule" />

          {/* Facts */}
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.30 }}
          >
            <p className="text-xs font-semibold text-muted uppercase tracking-widest mb-3">A few facts</p>
            <ul className="space-y-2.5">
              {species.facts.map((fact, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.34 + i * 0.06 }}
                  className="flex gap-2.5 text-sm text-body leading-relaxed"
                >
                  <span className="mt-2 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-accent/50" />
                  {fact}
                </motion.li>
              ))}
            </ul>
          </motion.div>

          <hr className="border-rule" />

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.50 }}
            className="flex items-center gap-3 flex-wrap"
          >
            <a
              href={species.learnMoreUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-accent hover:bg-accent-dark transition-colors px-4 py-2 rounded-lg shadow-card"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"/>
              </svg>
              Read more
            </a>

            <button
              onClick={onListenAgain}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent border border-accent-border hover:bg-accent-faint transition-colors px-4 py-2 rounded-lg"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5-3c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
              </svg>
              Listen for another
            </button>
          </motion.div>
        </div>
      </div>
    </motion.div>
  )
}
