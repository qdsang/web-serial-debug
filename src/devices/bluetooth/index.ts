import { ElMessage } from 'element-plus'
import { authorizedDevices, type Device } from '../types'
import type { IDevice, DeviceInfo } from '../types'

export class BluetoothDeviceImpl implements IDevice {
  id: string
  title: string
  type: string = 'bluetooth'
  port: BluetoothDevice

  constructor(port: BluetoothDevice) {
    this.port = port
    this.id = BluetoothDeviceImpl.getDeviceId(port)
    this.title = BluetoothDeviceImpl.getDeviceTitle(port)
  }

  static getDeviceTitle(port: BluetoothDevice): string {
    return port.name || '未知蓝牙设备'
  }

  static getDeviceId(port: BluetoothDevice): string {
    return `bluetooth_${port.id}`
  }

  static async init(): Promise<void> {
  }

  static async request(): Promise<Device | null> {
    try {
      if (!navigator.bluetooth) {
        ElMessage.error('浏览器不支持Web Bluetooth API')
        return null
      }
      
      const port = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true
      })
      const device = new BluetoothDeviceImpl(port)
      return device as unknown as Device
    } catch (error: any) {
      if (error.message !== "User cancelled the requestDevice() chooser.") {
        ElMessage.error('蓝牙设备连接失败：' + error)
      }
      console.error(error)
    }
    return null
  }

  async connect(): Promise<{ 
    writer: WritableStreamDefaultWriter, 
    reader: ReadableStreamDefaultReader 
  } | null> {
    try {
      ElMessage.warning('蓝牙连接功能正在开发中')
      console.log('Connecting to Bluetooth device:', this)
      return null
    } catch (error) {
      ElMessage.error('蓝牙连接失败：' + error)
      console.error(error)
    }
    return null
  }

  async disconnect(): Promise<void> {
    console.log('Disconnecting Bluetooth device', this)
  }

  getInfo(): DeviceInfo {
    return {
      productName: this.port.name
    }
  }
  
  async request(): Promise<IDevice | null> {
    return BluetoothDeviceImpl.request()
  }
}

export const init = () => BluetoothDeviceImpl.init()
export const request = () => BluetoothDeviceImpl.request()
