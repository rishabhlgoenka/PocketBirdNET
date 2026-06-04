import { useState } from 'react'
import { motion } from 'framer-motion'

function BirdLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 24" fill="currentColor">
      <path d="M2 12 C6 4 13 3 20 8 C27 3 34 4 38 12 C33 10 28 11 24 14 C22 15 21 16 20 16 C19 16 18 15 16 14 C12 11 7 10 2 12 Z"/>
    </svg>
  )
}

interface Props {
  onConnect: () => void
}

const STEPS = [
  {
    title: 'Install Arduino IDE 2',
    body: (<>Download it at <a href="https://www.arduino.cc/en/software" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">arduino.cc</a> if you don't have it.</>),
  },
  {
    title: 'Add the board package',
    body: 'In Boards Manager, search for "Arduino Mbed OS Nano Boards" and install it.',
  },
  {
    title: 'Install two libraries',
    body: (<>In Library Manager, install <strong className="text-ink">Arduino_TensorFlowLite</strong> and <strong className="text-ink">ArduinoBLE</strong>. Everything else comes pre-installed.</>),
  },
  {
    title: 'Open the sketch',
    body: (<>Unzip the download. In Arduino IDE, File → Open → <strong className="text-ink">pocketbirdnet.ino</strong>.</>),
  },
  {
    title: 'Select your board and port',
    body: 'Tools → Board → Arduino Nano 33 BLE Sense. Then Tools → Port → pick the one that appeared when you plugged in.',
  },
  {
    title: 'Upload',
    body: 'Hit Upload. Once it finishes, open Serial Monitor at 115200 baud to confirm it\'s running.',
  },
  {
    title: 'Connect here',
    body: (<>Click <strong className="text-ink">Connect Board</strong> at the top, pick <strong className="text-ink">PocketBirdNET</strong> from the Bluetooth list, and you're live.</>),
  },
]

export function LandingPage({ onConnect }: Props) {
  const [downloaded, setDownloaded] = useState(false)

  return (
    <div className="pb-16">

      {/* ── Hero ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="py-14 flex flex-col items-center text-center"
      >
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent-faint border border-accent-border mb-6">
          <BirdLogo className="w-10 h-7 text-accent" />
        </div>
        <h1 className="text-4xl font-extrabold text-ink mb-4 tracking-tight">PocketBirdNET</h1>
        <p className="text-body text-lg max-w-xl leading-relaxed mb-2">
          On-device bird identification running on an Arduino Nano 33 BLE Sense.
          Hold the board near a bird and it names the species in under a second.
        </p>
        <p className="text-subtle text-sm mb-8">
          10 Pacific Northwest species &nbsp;·&nbsp; No internet &nbsp;·&nbsp; No cloud
        </p>
        <div className="flex items-center gap-3 flex-wrap justify-center">
          <button
            onClick={onConnect}
            className="inline-flex items-center gap-2 bg-accent hover:bg-accent-dark text-white font-semibold px-7 py-3 rounded-xl shadow-card-md transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5-3c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
            </svg>
            Connect Board
          </button>
          <a
            href="/pocketbirdnet-arduino-kit.zip"
            download
            onClick={() => { setDownloaded(true); setTimeout(() => setDownloaded(false), 3000) }}
            className="inline-flex items-center gap-2 border border-rule hover:border-accent-border bg-white hover:bg-accent-faint text-ink font-semibold px-6 py-3 rounded-xl shadow-card transition-colors text-sm"
          >
            <svg className="w-4 h-4 text-accent" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
            </svg>
            {downloaded ? 'Downloading…' : 'Download Sketch'}
          </a>
        </div>
        <p className="text-subtle text-xs mt-4">Requires Chrome or Edge (Web Bluetooth)</p>
      </motion.div>

      {/* ── Two-column: Download details + Steps ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12, duration: 0.35 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6"
      >
        {/* Download card */}
        <div className="card-md overflow-hidden flex flex-col">
          <div className="h-1 bg-gradient-to-r from-accent to-blue-400" />
          <div className="p-6 flex-1">
            <h2 className="font-bold text-ink mb-1">What's in the download</h2>
            <p className="text-sm text-muted mb-5 leading-relaxed">
              Flash this to your board once and you're set. The model is baked directly into the sketch — no separate upload step.
            </p>

            <div className="space-y-2 mb-6">
              {[
                { name: 'pocketbirdnet.ino', desc: 'Main Arduino sketch' },
                { name: 'model.h',           desc: 'Trained model, ready to compile' },
                { name: 'mel_frontend.cpp',  desc: 'Audio processing frontend' },
                { name: 'mel_frontend.h',    desc: 'Header for the frontend' },
                { name: 'README.txt',        desc: 'Step-by-step flashing guide' },
              ].map(f => (
                <div key={f.name} className="flex items-center gap-3 bg-sheet border border-rule rounded-lg px-3 py-2.5">
                  <svg className="w-3.5 h-3.5 text-green-500 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
                  </svg>
                  <div className="min-w-0">
                    <p className="font-mono text-[11px] text-ink">{f.name}</p>
                    <p className="text-[10px] text-subtle">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <a
              href="/pocketbirdnet-arduino-kit.zip"
              download
              onClick={() => { setDownloaded(true); setTimeout(() => setDownloaded(false), 3000) }}
              className="inline-flex items-center gap-2 bg-accent hover:bg-accent-dark text-white font-semibold text-sm px-5 py-2.5 rounded-xl shadow-card transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
              </svg>
              {downloaded ? 'Downloading…' : 'Download .zip'}
            </a>
          </div>
        </div>

        {/* Steps */}
        <div className="card p-6">
          <h2 className="font-bold text-ink mb-5">How to flash it</h2>
          <ol className="space-y-4">
            {STEPS.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-accent text-white text-[10px] font-bold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <div className="text-sm text-body leading-relaxed">
                  <span className="font-semibold text-ink">{step.title} — </span>
                  {step.body}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </motion.div>

      {/* ── Bottom links ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.22, duration: 0.35 }}
        className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6"
      >
        <a
          href="https://github.com/rishabhlgoenka/PocketBirdNET"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 card px-5 py-4 hover:border-accent-border hover:shadow-card-md transition-all group"
        >
          <svg className="w-5 h-5 text-ink flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
          </svg>
          <div>
            <p className="font-semibold text-ink text-sm group-hover:text-accent transition-colors">Source code on GitHub</p>
            <p className="text-xs text-muted">Training, evaluation, all model variants</p>
          </div>
        </a>

        <a
          href="https://github.com/kahst/BirdNET-Analyzer"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 card px-5 py-4 hover:border-accent-border hover:shadow-card-md transition-all group"
        >
          <svg className="w-5 h-5 text-accent flex-shrink-0" viewBox="0 0 40 24" fill="currentColor">
            <path d="M2 12 C6 4 13 3 20 8 C27 3 34 4 38 12 C33 10 28 11 24 14 C22 15 21 16 20 16 C19 16 18 15 16 14 C12 11 7 10 2 12 Z"/>
          </svg>
          <div>
            <p className="font-semibold text-ink text-sm group-hover:text-accent transition-colors">Powered by BirdNET</p>
            <p className="text-xs text-muted">Cornell Lab of Ornithology</p>
          </div>
        </a>
      </motion.div>

      <p className="text-center text-xs text-subtle">
        Built by Rishabh Goenka and Aarav Wadhwani
      </p>
    </div>
  )
}
