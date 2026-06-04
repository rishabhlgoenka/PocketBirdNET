import { useState, useRef, useCallback } from 'react'
import {
  BLE_SERVICE_UUID,
  BLE_CHAR_UUID,
  DETECTION_THRESHOLD,
  BACKGROUND_CLASS,
} from '../constants/ble'
import { getSpecies } from '../data/species'
import type { Detection, BLEStatus } from '../types'

// Web Bluetooth is not in the standard TypeScript DOM lib.
// Declare the minimal surface we use here to keep the build self-contained.
declare global {
  interface Navigator {
    readonly bluetooth?: {
      requestDevice(options: RequestDeviceOptions): Promise<BluetoothDevice>
    }
  }
  interface RequestDeviceOptions {
    filters?: Array<{ services?: string[] }>
    optionalServices?: string[]
  }
  interface BluetoothDevice extends EventTarget {
    readonly gatt?: BluetoothRemoteGATTServer
    readonly name?: string
  }
  interface BluetoothRemoteGATTServer {
    readonly connected: boolean
    connect(): Promise<BluetoothRemoteGATTServer>
    disconnect(): void
    getPrimaryService(uuid: string): Promise<BluetoothRemoteGATTService>
  }
  interface BluetoothRemoteGATTService {
    getCharacteristic(uuid: string): Promise<BluetoothRemoteGATTCharacteristic>
  }
  interface BluetoothRemoteGATTCharacteristic extends EventTarget {
    readonly value?: DataView
    startNotifications(): Promise<BluetoothRemoteGATTCharacteristic>
    stopNotifications(): Promise<BluetoothRemoteGATTCharacteristic>
  }
}

export interface BLEState {
  status: BLEStatus
  detection: Detection | null
  error: string | null
}

export interface BLEHook extends BLEState {
  connect: () => Promise<void>
  disconnect: () => void
}

function isBLESupported(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.bluetooth
}

export function useBLE(): BLEHook {
  const [state, setState] = useState<BLEState>({
    status: isBLESupported() ? 'disconnected' : 'unsupported',
    detection: null,
    error: null,
  })

  const deviceRef = useRef<BluetoothDevice | null>(null)
  const charRef   = useRef<BluetoothRemoteGATTCharacteristic | null>(null)

  // ------------------------------------------------------------------
  // Notification handler — called on every BLE packet from the board.
  // Packet: 2 bytes [uint8 classIndex, uint8 confidencePercent]
  // ------------------------------------------------------------------
  const handleNotification = useCallback((event: Event) => {
    const char = event.target as BluetoothRemoteGATTCharacteristic
    if (!char.value) return

    const classIndex       = char.value.getUint8(0)
    const confidencePercent = char.value.getUint8(1)
    const species          = getSpecies(classIndex)

    // Show a card only when confidence meets threshold AND it's a real species.
    const qualifying =
      confidencePercent >= DETECTION_THRESHOLD &&
      classIndex !== BACKGROUND_CLASS &&
      species !== undefined

    setState(prev => ({
      ...prev,
      status: 'connected',
      detection: qualifying
        ? { classIndex, confidence: confidencePercent, species: species!, timestamp: Date.now() }
        : null,
    }))
  }, [])

  // ------------------------------------------------------------------
  // connect — must be called from a user gesture (button click).
  // Web Bluetooth requires it; the browser will reject otherwise.
  // ------------------------------------------------------------------
  const connect = useCallback(async () => {
    if (!navigator.bluetooth) return

    setState({ status: 'scanning', detection: null, error: null })

    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [BLE_SERVICE_UUID] }],
        optionalServices: [BLE_SERVICE_UUID],
      })

      deviceRef.current = device

      // When the board goes out of range or powers off, drop to disconnected.
      device.addEventListener('gattserverdisconnected', () => {
        setState({ status: 'disconnected', detection: null, error: null })
      })

      const server = await device.gatt!.connect()
      const service = await server.getPrimaryService(BLE_SERVICE_UUID)
      const char = await service.getCharacteristic(BLE_CHAR_UUID)

      charRef.current = char
      char.addEventListener('characteristicvaluechanged', handleNotification)
      await char.startNotifications()

      setState(prev => ({ ...prev, status: 'connected' }))
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)

      // User-initiated cancel from the browser picker is not an error.
      if (/cancel|user cancelled|chooser/i.test(msg)) {
        setState({ status: 'disconnected', detection: null, error: null })
        return
      }

      setState({ status: 'error', detection: null, error: msg })
    }
  }, [handleNotification])

  // ------------------------------------------------------------------
  // disconnect — explicit teardown.
  // ------------------------------------------------------------------
  const disconnect = useCallback(() => {
    if (charRef.current) {
      charRef.current.removeEventListener('characteristicvaluechanged', handleNotification)
      charRef.current.stopNotifications().catch(() => {/* board may already be gone */})
      charRef.current = null
    }
    if (deviceRef.current?.gatt?.connected) {
      deviceRef.current.gatt.disconnect()
    }
    deviceRef.current = null
    setState({ status: 'disconnected', detection: null, error: null })
  }, [handleNotification])

  return { ...state, connect, disconnect }
}
