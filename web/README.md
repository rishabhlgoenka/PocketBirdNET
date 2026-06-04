# PocketBirdNET Web Dashboard

Real-time bird detection display for the Arduino Nano 33 BLE Sense.  
Connects over **Web Bluetooth** — no server, no backend, pure client-side.

---

## Requirements

| Requirement | Detail |
|---|---|
| **Browser** | Google Chrome 70+ or Microsoft Edge 79+ (desktop). Safari and Firefox do not support Web Bluetooth. |
| **Origin** | Must be served from `localhost` or `https://`. Web Bluetooth is blocked on plain `http://` remote origins and `file://` URLs. |
| **Board** | Arduino Nano 33 BLE Sense flashed with `pocketbirdnet.ino` + `ble_detection.h` integrated (see below). |

---

## Quick start

```bash
# 1. Install dependencies
cd web
npm install

# 2. Download bird photos (Wikimedia Commons, CC-licensed)
bash scripts/download-bird-images.sh

# 3. Start the dev server
npm run dev
```

Open **http://localhost:5173** in Chrome or Edge.

---

## Demo mode (no board needed)

Toggle **DEMO MODE** in the footer.  The dashboard will cycle through scripted
detections on a timer so the full UI — species card, confidence meter, scroll
animation — can be demoed without any Bluetooth hardware.

Demo mode is automatically disabled when a real board connects.

---

## Arduino integration

To add BLE output to the existing inference sketch:

1. Copy `arduino/ble_detection.h` into the `arduino/pocketbirdnet/` sketch folder.

2. Install **ArduinoBLE** from the Arduino Library Manager (v1.3+).

3. In `pocketbirdnet.ino`, add these four lines at the locations shown in the comments
   inside `ble_detection.h`:

   ```cpp
   // Top of file:
   #include "ble_detection.h"

   // In setup(), after Serial.begin():
   ble_detection_init();

   // Top of loop(), before mel_frontend_ready():
   ble_detection_poll();

   // After the argmax (step 6), before mel_frontend_reset() (step 8):
   ble_detection_notify((uint8_t)best, (uint8_t)(best_p * 100.0f));
   ```

4. Flash the sketch.  The board will advertise as `PocketBirdNET`.

---

## Connecting

1. Power on the board.
2. Open http://localhost:5173 in Chrome or Edge.
3. Click **Connect Board** — the browser shows its own Bluetooth device picker.
4. Select **PocketBirdNET** from the list.
5. The waveform appears and detections arrive live.

---

## BLE contract

Defined in `src/constants/ble.ts` (web) and `arduino/ble_detection.h` (board).  
**Do not hardcode UUIDs anywhere else.**

| Field | Value |
|---|---|
| Device name | `PocketBirdNET` |
| Service UUID | `19b10000-e8f2-537e-4f6c-d104768a1214` |
| Characteristic UUID | `19b10001-e8f2-537e-4f6c-d104768a1214` |
| Payload | 2 bytes: `[classIndex uint8, confidencePercent uint8]` |

---

## Build for production

```bash
npm run build   # output in web/dist/
npm run preview # preview the production build locally
```

---

## Photo credits

See `ATTRIBUTION.md`.  All images are CC-licensed from Wikimedia Commons,
stored locally in `public/birds/` (never hotlinked).
