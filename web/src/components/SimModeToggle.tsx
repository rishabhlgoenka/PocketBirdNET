import { motion } from 'framer-motion'

interface Props { active: boolean; disabled: boolean; onChange: (v: boolean) => void }

export function SimModeToggle({ active, disabled, onChange }: Props) {
  return (
    <div className="flex items-center gap-3">
      <button
        role="switch"
        aria-checked={active}
        disabled={disabled}
        onClick={() => onChange(!active)}
        className={`relative w-10 h-6 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40
          ${active ? 'bg-accent' : 'bg-gray-300'}
          ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <motion.div
          animate={{ x: active ? 18 : 2 }}
          transition={{ type: 'spring', stiffness: 400, damping: 28 }}
          className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm"
        />
      </button>

      <div>
        <p className={`font-mono text-xs font-semibold tracking-widest uppercase ${active ? 'text-accent' : 'text-muted'}`}>
          Demo mode
        </p>
        {disabled && (
          <p className="text-[10px] text-subtle mt-0.5">Unavailable while board is connected</p>
        )}
        {active && !disabled && (
          <p className="text-[10px] text-accent/70 mt-0.5">Simulating detections — board not required</p>
        )}
      </div>
    </div>
  )
}
