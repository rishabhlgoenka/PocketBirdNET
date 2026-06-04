# PocketBirdNET Web Dashboard — Architecture Plan

## Stack
Vite 5 · React 18 · TypeScript 5 · Tailwind CSS 3 · Framer Motion 11  
No backend. Client-only. Web Bluetooth for board communication.

---

## Directory layout
```
web/
├── public/birds/          # downloaded CC bird photos
├── scripts/
│   └── download-bird-images.sh
├── src/
│   ├── constants/ble.ts   # single source of truth for UUIDs + device name
│   ├── types/index.ts     # Detection, Species, AppStatus discriminated unions
│   ├── data/species.ts    # typed array of 10 species + Unknown
│   ├── hooks/
│   │   ├── useBLE.ts      # Web Bluetooth state machine
│   │   └── useSimulation.ts
│   └── components/
│       ├── UnsupportedBrowser.tsx
│       ├── ConnectionBar.tsx
│       ├── WaveformCanvas.tsx   # canvas-based, 0 React re-renders per frame
│       ├── ListeningView.tsx
│       ├── DetectionCard.tsx
│       ├── ConfidenceMeter.tsx
│       └── SimModeToggle.tsx
└── App.tsx
```

---

## BLE Data Contract

**Single source of truth: `src/constants/ble.ts` (web) and `arduino/ble_detection.h` (board).**  
Both sides import from their respective copy — do not hardcode UUIDs elsewhere.

| Field | Value |
|---|---|
| Device name | `PocketBirdNET` |
| Service UUID | `19b10000-e8f2-537e-4f6c-d104768a1214` |
| Characteristic UUID | `19b10001-e8f2-537e-4f6c-d104768a1214` |
| Characteristic property | `Notify` |
| Payload | 2 bytes: `[uint8 classIndex, uint8 confidencePercent]` |
| classIndex 0–9 | species (matches SPECIES array order) |
| classIndex 10 | background / Unknown |
| confidencePercent | 0–100 |

Web decodes with `new DataView(event.target.value.buffer)`.

---

## Connection State Machine

```
          ┌──────────────────────────────────────────┐
          │                                          │
   ┌──────▼──────┐    connect()    ┌─────────────┐  │
   │ disconnected├────────────────►│  scanning   │  │
   └─────────────┘                 └──────┬──────┘  │
          ▲                               │ GATT OK  │
          │ disconnect() / board          ▼          │
          │ out of range           ┌─────────────┐  │
          └────────────────────────┤  connected  │  │
                                   └──────┬──────┘  │
                                          │ notify   │
                                   ┌──────▼──────┐  │
                                   │  detected   │  │
                                   └─────────────┘  │
                                                     │
          ┌─────────────┐                            │
          │    error    │◄───────────────────────────┘
          └─────────────┘   requestDevice throws /
                             GATT fails
```

**Transitions emitted by `useBLE`:**
- `connect()` called → `scanning`
- GATT connected + notifications started → `connected`
- Notification with confidence ≥ 70 & classIndex < 10 → `detected`
- Notification with confidence < 70 or classIndex = 10 → back to `connected`
- `gattserverdisconnected` event → `disconnected`
- Any throw → `error`
- `disconnect()` called → `disconnected`

---

## Component Tree

```
App
├── <UnsupportedBrowser>          if !navigator.bluetooth
│
├── <header>
│   ├── Logo + tagline
│   └── <ConnectionBar>           status dot · connect/disconnect button
│
├── <main>
│   ├── <WaveformCanvas>          canvas RAF animation, active when connected
│   │
│   └── <AnimatePresence mode="wait">
│       ├── <DisconnectedHero>    status === disconnected && !simMode
│       ├── <ScanningView>        status === scanning
│       ├── <ListeningView>       connected, no qualifying detection
│       ├── <DetectionCard>       connected, confidence ≥ 70, classIndex < 10
│       └── <ErrorView>           status === error
│
└── <footer>
    └── <SimModeToggle>           disabled while BLE-connected
```

---

## Content Model (species.ts)

```ts
interface SpeciesData {
  classIndex: number;        // 0–9; 10 reserved for Unknown
  commonName: string;
  imagePath: string;         // /birds/<slug>.jpg
  learnMoreUrl: string;      // https://www.allaboutbirds.org/guide/<slug>
  facts: [string, string, string];
}
```

Unknown/background is represented as `null` species — the UI shows "Unknown / Listening…".

---

## Simulation Mode

- A `useSimulation(active, onDetection)` hook cycles through a scripted sequence of `{classIndex, confidence}` pairs every 4 s.
- Only activates when the real BLE device is **not** connected.
- Feeds the same `onDetection` callback as real BLE, so the UI is identical.
- A prominent `DEMO` badge appears in the header and the toggle in the footer.

---

## Design Tokens

| Token | Value |
|---|---|
| Background | `#050a14` |
| Surface | `#0a1628` |
| Accent | `#00e5c8` (electric cyan) |
| Glass | `rgba(10,22,40,0.7)` + `backdrop-blur(20px)` |
| Border | `rgba(0,229,200,0.12)` |
| Text primary | `#f0f4ff` |
| Text muted | `#8892a4` |
| Font sans | Inter |
| Font mono | JetBrains Mono |

Motion: Framer Motion spring `{ type:'spring', stiffness:300, damping:30 }` for card entrance; `easeOut` for status transitions. No `delay()` calls anywhere.
