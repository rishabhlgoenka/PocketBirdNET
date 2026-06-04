/*
 * ble_detection.h — ArduinoBLE module for PocketBirdNET
 *
 * NOTE: BLE is now integrated directly into pocketbirdnet.ino.
 * This header is kept as a standalone reference / documentation file.
 *
 * ── What was wrong (and what was fixed) ─────────────────────────────────────
 *
 * Two bugs prevented the device from appearing in the Web Bluetooth picker:
 *
 * 1. Missing BLE.setDeviceName()
 *    The ArduinoBLE library has two separate name calls:
 *      BLE.setLocalName()  → name broadcast in advertisement packets
 *      BLE.setDeviceName() → name stored in GATT Generic Access profile (0x2A00)
 *    Web Bluetooth reads BOTH.  Omitting setDeviceName() made the device
 *    invisible to the browser's service-filter scan.
 *    Fix: call both, as the reference Arduino BLE Sense sketch does.
 *
 * 2. BLENotify-only characteristic
 *    The characteristic was declared BLENotify.  Web Bluetooth's
 *    startNotifications() also expects BLERead so it can read the CCCD
 *    and the current value on connect.
 *    Fix: use BLERead | BLENotify.
 *
 * ── BLE contract (must match web/src/constants/ble.ts) ───────────────────────
 *
 *   Device name        : PocketBirdNET
 *   Service UUID       : 19b10000-e8f2-537e-4f6c-d104768a1214
 *   Characteristic UUID: 19b10001-e8f2-537e-4f6c-d104768a1214
 *   Characteristic     : BLERead | BLENotify, 2 bytes
 *   Payload            : [uint8 classIndex, uint8 confidencePercent]
 *     classIndex 0–9   → species (matches SPECIES[] order in pocketbirdnet.ino)
 *     classIndex 10    → background / Unknown
 *     confidencePercent 0–100
 *
 * ── Correct BLE setup pattern (from working reference sketch) ───────────────
 *
 *   BLE.begin();
 *   BLE.setLocalName("PocketBirdNET");        // advertisement name
 *   BLE.setDeviceName("PocketBirdNET");       // GATT name — required for browser
 *   BLE.setAdvertisedService(bleService);
 *   bleService.addCharacteristic(detectionChar);
 *   BLE.addService(bleService);
 *   detectionChar.writeValue(initial, 2);     // set a default value before advertising
 *   BLE.advertise();
 *
 * ── Loop pattern ────────────────────────────────────────────────────────────
 *
 * Unlike the blocking reference sketch (which uses while(central.connected())),
 * pocketbirdnet.ino uses BLE.poll() at the top of every loop() pass.
 * This keeps the BLE stack alive without interrupting continuous audio capture.
 *
 *   void loop() {
 *     BLE.poll();                              // keep BLE stack running
 *     // ... PDM / mel / inference ...
 *     uint8_t payload[2] = {classIndex, conf};
 *     detectionChar.writeValue(payload, 2);   // notify subscribed central
 *     mel_frontend_reset();
 *   }
 */

#pragma once

// UUIDs — single source of truth (mirrored in web/src/constants/ble.ts)
#define BLE_DETECTION_DEVICE_NAME  "PocketBirdNET"
#define BLE_DETECTION_SERVICE_UUID "19b10000-e8f2-537e-4f6c-d104768a1214"
#define BLE_DETECTION_CHAR_UUID    "19b10001-e8f2-537e-4f6c-d104768a1214"
