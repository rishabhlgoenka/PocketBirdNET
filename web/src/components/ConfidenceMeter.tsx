import { motion } from 'framer-motion'

interface Props {
  value: number
  className?: string
}

export function ConfidenceMeter({ value, className = '' }: Props) {
  const color = value >= 85 ? 'from-green-500 to-emerald-400'
              : value >= 70 ? 'from-accent to-blue-400'
              : 'from-amber-500 to-yellow-400'

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-semibold text-muted uppercase tracking-widest">
          Confidence
        </span>
        <motion.span
          key={value}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-mono text-2xl font-bold text-accent"
        >
          {value}<span className="text-sm font-normal text-muted ml-0.5">%</span>
        </motion.span>
      </div>

      {/* Track */}
      <div className="relative h-2.5 rounded-full bg-accent-light overflow-hidden">
        <motion.div
          className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${color}`}
          initial={{ width: '0%' }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
        />
      </div>

      {/* Threshold label */}
      <div className="flex justify-between text-[10px] font-mono text-subtle">
        <span>0%</span>
        <span className="text-accent/70">▲ 70% threshold</span>
        <span>100%</span>
      </div>
    </div>
  )
}
