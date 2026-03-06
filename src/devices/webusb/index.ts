import { ElMessage } from 'element-plus'
import { authorizedDevices, type Device } from '../types'
import type { IDevice, DeviceInfo } from '../types'

export class WebUSBDevice implements IDevice {
  id: string
  title: string
  type: string = 'usb'
  port: USBDevice

  constructor(port: USBDevice) {
    this.port = port
    this.id = WebUSBDevice.getDeviceId(port)
    this.title = WebUSBDevice.getDeviceTitle(port)
  }

  static getDeviceTitle(port: USBDevice): string {
    const productName = port.productName || '未知设备'
    const manufacturer = port.manufacturerName ? `(${port.manufacturerName})` : ''
    return `${productName} ${manufacturer}`
  }

  static getDeviceId(port: USBDevice): string {
    return `usb_${port.manufacturerName || 'unknown'}_${port.productName || 'unknown'}_${port.serialNumber || 'noserial'}`
  }

  static async init(): Promise<void> {
    if (navigator.usb) {
      const ports = await navigator.usb.getDevices()
      ports.forEach((port) => {
        const id = WebUSBDevice.getDeviceId(port)
        const device = authorizedDevices.value.find(d => d.id === id)
        if (!device) {
          authorizedDevices.value.push(new WebUSBDevice(port) as unknown as Device)
        }
      })
    }
  }

  static async request(): Promise<Device | null> {
    try {
      if (!navigator.usb) {
        ElMessage.error('浏览器不支持WebUSB API')
        return null
      }
      
      const port = await navigator.usb.requestDevice({
        filters: []
      })
      const device = new WebUSBDevice(port)
      return device as unknown as Device
    } catch (error: any) {
      if (error.message !== "Failed to execute 'requestDevice' on 'USB': No device selected.") {
        ElMessage.error('WebUSB设备请求失败：' + error)
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
      ElMessage.warning('WebUSB连接功能正在开发中')
      console.log('Connecting to WebUSB device:', this)
      return null
    } catch (error) {
      ElMessage.error('WebUSB连接失败：' + error)
      console.error(error)
    }
    return null
  }

  async disconnect(): Promise<void> {
    console.log('Disconnecting WebUSB device', this)
  }

  getInfo(): DeviceInfo {
    return {
      manufacturer: this.port.manufacturerName,
      productName: this.port.productName,
      serialNumber: this.port.serialNumber
    }
  }
  
  async request(): Promise<IDevice | null> {
    return WebUSBDevice.request()
  }
}

export const init = () => WebUSBDevice.init()
export const request = () => WebUSBDevice.request()
export const connect = (device: Device) => {
  const usbDevice = new WebUSBDevice(device.port as USBDevice)
  return usbDevice.connect()
}
export const disconnect = async () => {
  console.log("Disconnecting WebUSB device")
}
export const getInfo = (device: Device) => {
  const usbDevice = new WebUSBDevice(device.port as USBDevice)
  return usbDevice.getInfo()
}
export const makeDevice = (port: USBDevice) => new WebUSBDevice(port)
export const getDeviceId = (port: USBDevice) => WebUSBDevice.getDeviceId(port)
export const getDeviceTitle = (port: USBDevice) => WebUSBDevice.getDeviceTitle(port)
