import { motion } from 'framer-motion'

export function UnsupportedBrowser() {
  return (
    <div className="min-h-screen bg-sheet flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-10 max-w-md w-full text-center"
      >
        <div className="mx-auto mb-6 w-14 h-14 rounded-full bg-accent-faint border border-accent-border flex items-center justify-center">
          <svg className="w-7 h-7 text-accent" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.71 7.71 12 2h-1v7.59L6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 11 14.41V22h1l5.71-5.71-4.3-4.29 4.3-4.29zM13 5.83l1.88 1.88L13 9.59V5.83zm1.88 10.46L13 18.17v-3.76l1.88 1.88z"/>
          </svg>
        </div>

        <h1 className="text-xl font-bold text-ink mb-2">Web Bluetooth not supported</h1>
        <p className="text-muted text-sm leading-relaxed mb-6">
          This dashboard uses the <strong className="text-ink">Web Bluetooth API</strong> to communicate directly with the Arduino. Your browser doesn't support it.
        </p>

        <div className="bg-accent-faint border border-accent-border rounded-xl p-4 mb-6 text-left space-y-2">
          <p className="text-xs font-semibold text-accent uppercase tracking-widest mb-3">Supported browsers</p>
          <div className="flex items-center gap-3 text-sm text-body"><span className="text-green-500">✓</span> Google Chrome 70+ (desktop or Android)</div>
          <div className="flex items-center gap-3 text-sm text-body"><span className="text-green-500">✓</span> Microsoft Edge 79+ (desktop)</div>
          <div className="flex items-center gap-3 text-sm text-muted"><span className="text-red-400">✗</span> Safari — no Web Bluetooth</div>
          <div className="flex items-center gap-3 text-sm text-muted"><span className="text-red-400">✗</span> Firefox — no Web Bluetooth</div>
        </div>

        <p className="text-xs text-muted">
          Open at <code className="font-mono text-accent bg-accent-faint px-1.5 py-0.5 rounded">http://localhost:5173</code> in Chrome or Edge.
        </p>
      </motion.div>
    </div>
  )
}
