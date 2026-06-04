import { motion } from 'framer-motion'

export function ResearchPage() {
  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-2xl font-bold text-ink mb-2">About</h1>
        <p className="text-muted text-sm mb-10">
          More about the PocketBirdNET project.
        </p>

        <div className="card p-12 flex flex-col items-center justify-center text-center gap-4 border-dashed">
          <div className="w-12 h-12 rounded-full bg-accent-faint border border-accent-border flex items-center justify-center">
            <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/>
            </svg>
          </div>
          <div>
            <p className="font-semibold text-ink text-sm">Research notes coming soon</p>
            <p className="text-muted text-xs mt-1 max-w-xs leading-relaxed">
              This section will cover our model comparison results, training approach, and findings from running TinyML on constrained hardware.
            </p>
          </div>
          <a
            href="https://github.com/rishabhlgoenka/PocketBirdNET"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-accent hover:underline"
          >
            See the full results on GitHub →
          </a>
        </div>
      </motion.div>
    </div>
  )
}
