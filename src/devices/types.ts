import { ref } from 'vue'

export interface IDevice {
  id: string
  title: string
  type: string
  port: any
  init?(): Promise<void>
  request(): Promise<IDevice | null>
  connect(config?: any): Promise<{ writer: WritableStreamDefaultWriter, reader: ReadableStreamDefaultReader } | null>
  disconnect(): Promise<void>
  getInfo(): DeviceInfo
}

export interface DeviceInfo {
  manufacturer?: string
  productName?: string
  serialNumber?: string
  vendorId?: number
  productId?: number
}

export interface Device extends IDevice {
  id: string
  title: string
  type: string
  port: SerialPort | USBDevice | BluetoothDevice | WebSocket
}

export const authorizedDevices = ref<Device[]>([])

export interface SerialConfig {
  baudRate: number
  dataBits: number
  stopBits: number
  parity: string
  flowControl: string
}

export interface WebSocketConfig {
  url: string
  reconnect: boolean
  reconnectInterval: number
}

export const defaultSerialConfig: SerialConfig = {
  baudRate: 115200,
  dataBits: 8,
  stopBits: 1,
  parity: 'none',
  flowControl: 'none'
}

export const defaultWebSocketConfig: WebSocketConfig = {
  url: 'ws://localhost:8080',
  reconnect: false,
  reconnectInterval: 3000
}
