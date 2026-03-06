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
  port: SerialPort | USBDevice | BluetoothDevice
}

export const authorizedDevices = ref<Device[]>([])
