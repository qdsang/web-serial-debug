import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { authorizedDevices, type Device } from './device'
import { ConfigManager } from '../../utils/ConfigManager'
import type { IDevice, DeviceInfo } from './IDevice'

const configManager = ConfigManager.getInstance()
const serialConfig = configManager.useConfig('serial')

export class SerialPortDevice implements IDevice {
  id: string
  title: string
  type: string = 'serialport'
  port: SerialPort

  private static KNOWN_DEVICES = [
    // Arduino 系列
    { name: 'Arduino UNO', vendorId: '2341', productId: '0043' },
    { name: 'Arduino Mega', vendorId: '2341', productId: '0010' },
    { name: 'Arduino Nano', vendorId: '0403', productId: '6001' },
    { name: 'ATmega32U4', vendorId: '2341', productId: '8036' },
    
    // Silicon Labs CP210x 系列
    { name: 'CP2102/CP2102N', vendorId: '10c4', productId: 'ea60' },
    
    // FTDI 系列
    { name: 'FT2232H', vendorId: '0403', productId: '6010' },
    { name: 'FTDI Basic', vendorId: '0403', productId: '6001' },
    
    // WCH CH340 系列
    { name: 'CH340', vendorId: '1a86', productId: '7523' },
    { name: 'CH9102', vendorId: '1a86', productId: '55d4' },
    
    // Prolific 系列
    { name: 'PL2303', vendorId: '067b', productId: '2303' },
    { name: 'PL2303HX', vendorId: '067b', productId: '2303' },
    
    // Espressif 系列
    { name: 'ESP USB_SERIAL_JTAG', vendorId: '303a', productId: '1001' },
    { name: 'ESP USB Bridge', vendorId: '303a', productId: '1002' },
    { name: 'ESP32-S2 USB CDC', vendorId: '303a', productId: '0002' },
    { name: 'ESP32-S3 USB CDC', vendorId: '303a', productId: '0009' },
    
    // QinHeng Electronics
    { name: 'CH9102F', vendorId: '1a86', productId: '55d4' },
    { name: 'CH340G', vendorId: '1a86', productId: '7523' },
    
    // STMicroelectronics
    { name: 'STM32 Virtual COM Port', vendorId: '0483', productId: '5740' },
    { name: 'STM32 USB CDC', vendorId: '0483', productId: '5740' }
  ]

  private serialPort = ref<SerialPort | null>(null)

  constructor(port: SerialPort) {
    this.port = port
    this.id = SerialPortDevice.getDeviceId(port)
    this.title = SerialPortDevice.getDeviceTitle(port)
  }

  static getDeviceTitle(port: SerialPort): string {
    if (!port.getInfo().usbProductId) return '串口设备'
    
    const vendorId = (port.getInfo().usbVendorId || 0).toString(16).padStart(4, '0')
    const productId = (port.getInfo().usbProductId || 0).toString(16).padStart(4, '0')
    
    const device = SerialPortDevice.KNOWN_DEVICES.find(
      d => d.vendorId.toLowerCase() === vendorId.toLowerCase() && 
           d.productId.toLowerCase() === productId.toLowerCase()
    )
    
    return device ? 
      `${device.name} (VID:${vendorId} PID:${productId})` : 
      `未知设备 (VID:${vendorId} PID:${productId})`
  }

  static getDeviceId(port: SerialPort): string {
    return 'serialport_' + (port.getInfo().usbProductId?.toString() || '')
  }

  static async init(): Promise<void> {
    if (navigator.serial) {
      const ports = await navigator.serial.getPorts()
      ports.forEach((port) => {
        const id = SerialPortDevice.getDeviceId(port)
        const device = authorizedDevices.value.find(d => d.id === id)
        if (!device) {
          authorizedDevices.value.push(new SerialPortDevice(port) as unknown as Device)
        }
      })
    }
  }

  static async request(): Promise<Device | null> {
    try {
      if (!navigator.serial) {
        ElMessage.error('浏览器不支持Web Serial API')
        return null
      }
      
      const port = await navigator.serial.requestPort()
      const device = new SerialPortDevice(port)
      return device as unknown as Device
    } catch (error: any) {
      if (error.message !== "Failed to execute 'requestPort' on 'Serial': No port selected by the user.") {
        ElMessage.error('串口连接失败：' + error)
      }
      console.error(error)
    }
    return null
  }

  async connect(config: SerialOptions = serialConfig.value): Promise<{ 
    writer: WritableStreamDefaultWriter, 
    reader: ReadableStreamDefaultReader 
  } | null> {
    try {
      await this.port.open(config)
      this.serialPort.value = this.port
      const writer = this.port.writable.getWriter()
      const reader = this.port.readable.getReader()
      return { writer, reader }
    } catch (error) {
      ElMessage.error('串口连接失败：' + error)
      console.error(error)
    }
    return null
  }

  async disconnect(): Promise<void> {
    try {
      if (this.serialPort.value) {
        await this.serialPort.value.close()
        this.serialPort.value = null
      }
    } catch (error) {
      ElMessage.error('断开设备失败：' + error)
      console.error(error)
    }
  }

  getInfo(): DeviceInfo {
    const info = this.port.getInfo()
    
    return {
      vendorId: info.usbVendorId,
      productId: info.usbProductId
    }
  }
  
  // 实现实例方法以满足接口要求
  async request(): Promise<IDevice | null> {
    return SerialPortDevice.request()
  }
}

// 为了保持向后兼容性，导出旧的函数名
export const init = () => SerialPortDevice.init()
export const request = () => SerialPortDevice.request()
export const connect = (device: Device, config?: SerialOptions) => {
  const serialDevice = new SerialPortDevice(device.port as SerialPort)
  return serialDevice.connect(config)
}
export const disconnect = async () => {
  // 这里需要特殊处理，因为可能有多个串口设备
  console.log("Disconnecting serial port device")
}
export const getInfo = (device: Device) => {
  const serialDevice = new SerialPortDevice(device.port as SerialPort)
  return serialDevice.getInfo()
}
export const makeDevice = (port: SerialPort) => new SerialPortDevice(port)
export const getDeviceId = (port: SerialPort) => SerialPortDevice.getDeviceId(port)
export const getDeviceTitle = (port: SerialPort) => SerialPortDevice.getDeviceTitle(port)