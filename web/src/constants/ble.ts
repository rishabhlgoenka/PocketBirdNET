/**
 * BLE contract — single source of truth for the web side.
 * The Arduino side mirrors these in arduino/ble_detection.h.
 * Never hardcode these UUIDs anywhere else.
 */

export const BLE_DEVICE_NAME       = 'PocketBirdNET';
export const BLE_SERVICE_UUID      = '19b10000-e8f2-537e-4f6c-d104768a1214';
export const BLE_CHAR_UUID         = '19b10001-e8f2-537e-4f6c-d104768a1214';

/** Minimum confidence (0–100) to show a species card rather than "Unknown". */
export const DETECTION_THRESHOLD   = 70;

/** classIndex value that means background / no bird. */
export const BACKGROUND_CLASS      = 10;
