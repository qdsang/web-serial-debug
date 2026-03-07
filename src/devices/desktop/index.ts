import { type IDevice, type DeviceInfo } from '../types'

declare global {
  interface Window {
    initSerial: (portName: string, baudRate: number) => Promise<void>
    writeSerial: (data: string) => Promise<void>
    readSerial: (callback: string) => void
    getSerialPorts: () => Promise<string[]>
    getVersionInfo: () => Promise<{ buildTime: string; version: string }>
  }
}

export class DesktopSerialDevice implements IDevice {
  id: string
  title: string
  type: string = 'desktop-serial'
  port: any = null
  private portName: string = ''
  private baudRate: number = 115200
  private onDataCallback: ((data: Uint8Array) => void) | null = null

  constructor(portName: string, baudRate: number = 115200) {
    this.portName = portName
    this.baudRate = baudRate
    this.id = `desktop-serial-${portName}`
    this.title = `串口 (${portName})`
  }

  static async getAvailablePorts(): Promise<string[]> {
    try {
      return await window.getSerialPorts()
    } catch {
      return []
    }
  }

  async init(): Promise<void> {
    try {
      await window.initSerial(this.portName, this.baudRate)
    } catch (error) {
      throw new Error(`初始化串口失败: ${error}`)
    }
  }

  async request(): Promise<IDevice | null> {
    return this
  }

  async connect(config?: any): Promise<{
    writer: WritableStreamDefaultWriter
    reader: ReadableStreamDefaultReader
  } | null> {
    try {
      if (config?.baudRate) {
        this.baudRate = config.baudRate
      }
      await this.init()

      const writer = {
        write: (chunk: Uint8Array) => {
          const str = new TextDecoder().decode(chunk)
          return window.writeSerial(str)
        },
        close: () => Promise.resolve(),
        abort: () => Promise.resolve(),
        closed: Promise.resolve(),
        ready: Promise.resolve(),
        releaseLock: () => {}
      }

      window.readSerial((data: string) => {
        if (this.onDataCallback) {
          const bytes = new TextEncoder().encode(data)
          this.onDataCallback(bytes)
        }
      })

      const reader = {
        read: () => new Promise<{ done: boolean; value: Uint8Array }>((resolve) => {
          this.onDataCallback = (data: Uint8Array) => {
            resolve({ done: false, value: data })
          }
        }),
        cancel: () => Promise.resolve(),
        closed: Promise.resolve(),
        releaseLock: () => {}
      }

      return { writer, reader }
    } catch (error) {
      console.error('连接桌面串口失败:', error)
      return null
    }
  }

  async disconnect(): Promise<void> {
    this.onDataCallback = null
  }

  getInfo(): DeviceInfo {
    return {
      productName: this.portName
    }
  }
}

export const init = () => {}
export const request = () => Promise.resolve<DesktopSerialDevice | null>(null)
export const connect = (device: any, config?: any) => {
  const desktopDevice = new DesktopSerialDevice('', config?.baudRate || 115200)
  return desktopDevice.connect(config)
}
export const disconnect = async () => {}
export const getInfo = (device: any) => ({})
export const makeDevice = (portName: string) => new DesktopSerialDevice(portName)
export const getDeviceId = (portName: string) => `desktop-serial-${portName}`
export const getDeviceTitle = (portName: string) => `串口 (${portName})`
