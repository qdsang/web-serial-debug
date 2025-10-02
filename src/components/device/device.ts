import { ref } from 'vue'
import type { IDevice } from './IDevice'

export interface Device extends IDevice {
  id: string
  title: string
  type: string
  port: SerialPort | USBDevice | BluetoothDevice
}

export const authorizedDevices = ref<Device[]>([])