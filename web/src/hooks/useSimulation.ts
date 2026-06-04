import { useEffect, useRef } from 'react'

/**
 * Scripted demo sequence that cycles through realistic detections.
 * Mirrors the real BLE payload: classIndex (0–10) + confidence (0–100).
 * Mix of high-confidence species detections and background/low-conf events
 * so every part of the UI gets exercised in a demo.
 */
const SIM_SEQUENCE: Array<{ classIndex: number; confidence: number }> = [
  { classIndex: 5, confidence: 91 },  // Anna's Hummingbird — high confidence
  { classIndex: 10, confidence: 22 }, // background — card should disappear
  { classIndex: 8, confidence: 84 },  // Pacific Wren
  { classIndex: 2, confidence: 88 },  // Steller's Jay
  { classIndex: 10, confidence: 15 }, // background
  { classIndex: 0, confidence: 76 },  // American Robin — near-threshold
  { classIndex: 1, confidence: 95 },  // Black-capped Chickadee — very confident
  { classIndex: 10, confidence: 30 }, // background
  { classIndex: 6, confidence: 79 },  // Dark-eyed Junco
  { classIndex: 9, confidence: 83 },  // House Finch
  { classIndex: 4, confidence: 71 },  // Song Sparrow — just above threshold
  { classIndex: 10, confidence: 18 }, // background
  { classIndex: 3, confidence: 87 },  // Northern Flicker
  { classIndex: 7, confidence: 93 },  // American Crow
]

const SIM_INTERVAL_MS = 4_000

type DetectionCallback = (classIndex: number, confidence: number) => void

/**
 * useSimulation
 *
 * When `active` is true, emits a new detection every SIM_INTERVAL_MS by calling
 * `onDetection(classIndex, confidence)`.  The callback ref pattern ensures we
 * always call the latest version without restarting the interval.
 *
 * Only call when the real BLE device is NOT connected — App.tsx enforces this.
 */
export function useSimulation(active: boolean, onDetection: DetectionCallback): void {
  const indexRef = useRef(0)
  const cbRef    = useRef<DetectionCallback>(onDetection)
  cbRef.current  = onDetection // always up-to-date, no stale closure

  useEffect(() => {
    if (!active) return

    // Fire the first detection immediately so the UI isn't blank for 4 s.
    const fire = () => {
      const entry = SIM_SEQUENCE[indexRef.current % SIM_SEQUENCE.length]
      indexRef.current++
      cbRef.current(entry.classIndex, entry.confidence)
    }

    fire()
    const id = setInterval(fire, SIM_INTERVAL_MS)
    return () => clearInterval(id)
  }, [active])
}
