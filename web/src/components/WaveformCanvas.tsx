import { useEffect, useRef } from 'react'

interface Props {
  active: boolean
  confidence?: number
}

const N_BARS = 48

const BARS = Array.from({ length: N_BARS }, () => ({
  freq:  0.6 + Math.random() * 2.2,
  phase: Math.random() * Math.PI * 2,
  amp:   0.35 + Math.random() * 0.65,
}))

export function WaveformCanvas({ active, confidence = 0 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef    = useRef<number | null>(null)
  const startRef  = useRef(performance.now())
  const activeRef = useRef(active)
  const confRef   = useRef(confidence)

  activeRef.current = active
  confRef.current   = confidence

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    const draw = (now: number) => {
      const t = (now - startRef.current) / 1000
      const { width: W, height: H } = canvas
      ctx.clearRect(0, 0, W, H)

      const barW  = W / N_BARS
      const gap   = Math.max(1, barW * 0.3)
      const fillW = barW - gap
      const isOn  = activeRef.current
      const boost = 1 + (confRef.current / 100) * 0.4

      for (let i = 0; i < N_BARS; i++) {
        const b    = BARS[i]
        const raw  = (Math.sin(t * b.freq + b.phase) + 1) / 2
        const frac = isOn
          ? (0.05 + raw * b.amp * 0.85 * boost)
          : 0.06
        const barH = Math.min(frac * H, H * 0.92)
        const x    = i * barW + gap / 2
        const y    = H - barH

        // Blue bars on white — use accent blue with opacity
        const alpha = isOn ? 0.70 : 0.15
        const grad  = ctx.createLinearGradient(0, y, 0, H)
        grad.addColorStop(0,   `rgba(37, 99, 235, ${alpha})`)
        grad.addColorStop(0.5, `rgba(37, 99, 235, ${alpha * 0.6})`)
        grad.addColorStop(1,   `rgba(37, 99, 235, 0)`)
        ctx.fillStyle = grad

        ctx.beginPath()
        const r = Math.min(2, fillW / 2)
        ctx.moveTo(x + r, y)
        ctx.lineTo(x + fillW - r, y)
        ctx.arcTo(x + fillW, y, x + fillW, y + r, r)
        ctx.lineTo(x + fillW, H)
        ctx.lineTo(x, H)
        ctx.lineTo(x, y + r)
        ctx.arcTo(x, y, x + r, y, r)
        ctx.closePath()
        ctx.fill()
      }

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current) }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      width={960}
      height={72}
      className="w-full h-18"
      style={{ display: 'block', height: '72px' }}
    />
  )
}
