export interface SpeciesData {
  /** Integer class index 0–9, matching the Arduino / Python SPECIES array order. */
  classIndex: number;
  commonName: string;
  /** Absolute path from public root, e.g. /birds/american-robin.jpg */
  imagePath: string;
  /** Verified Cornell Lab All About Birds URL */
  learnMoreUrl: string;
  /** Exactly three short, original facts. Do not copy site text. */
  facts: [string, string, string];
}

export interface Detection {
  classIndex: number;
  /** 0–100 integer from the BLE payload */
  confidence: number;
  species: SpeciesData;
  timestamp: number;
}

/**
 * BLE connection status — discriminated union drives every UI state.
 *
 * unsupported  Browser has no Web Bluetooth API (Safari, Firefox).
 * disconnected Default idle state; board not connected.
 * scanning     navigator.bluetooth.requestDevice() in progress.
 * connected    GATT connected, notifications running; detection may be null.
 * error        Connection or GATT failure; message field set.
 */
export type BLEStatus =
  | 'unsupported'
  | 'disconnected'
  | 'scanning'
  | 'connected'
  | 'error';
