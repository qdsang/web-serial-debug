import { ElMessage } from 'element-plus'
import type { Device } from './device'
import type { IDevice, DeviceInfo } from './IDevice'

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
    // Bluetooth设备通常需要用户主动配对，不需要初始化
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
      // Bluetooth连接需要特定的服务和特征配置，这里只是一个示例框架
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
    // Bluetooth断开连接逻辑
    console.log('Disconnecting Bluetooth device', this)
  }

  getInfo(): DeviceInfo {
    return {
      productName: this.port.name
    }
  }
  
  // 实现实例方法以满足接口要求
  async request(): Promise<IDevice | null> {
    return BluetoothDeviceImpl.request()
  }
}

// 为了保持向后兼容性，导出旧的函数名
export const init = () => BluetoothDeviceImpl.init()
export const request = () => BluetoothDeviceImpl.request()
export const connect = (device: Device) => {
  const bluetoothDevice = new BluetoothDeviceImpl(device.port as BluetoothDevice)
  return bluetoothDevice.connect()
}
export const disconnect = async () => {
  console.log("Disconnecting Bluetooth device")
}
export const getInfo = (device: Device) => {
  const bluetoothDevice = new BluetoothDeviceImpl(device.port as BluetoothDevice)
  return bluetoothDevice.getInfo()
}
export const makeDevice = (port: BluetoothDevice) => new BluetoothDeviceImpl(port)
export const getDeviceId = (port: BluetoothDevice) => BluetoothDeviceImpl.getDeviceId(port)
export const getDeviceTitle = (port: BluetoothDevice) => BluetoothDeviceImpl.getDeviceTitle(port)