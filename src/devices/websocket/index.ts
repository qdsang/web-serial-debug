import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { authorizedDevices, type Device, type IDevice, type DeviceInfo } from '../types'
import { ConfigManager } from '../../utils/ConfigManager'

const configManager = ConfigManager.getInstance()
const wsConfig = configManager.useConfig('websocket')

export interface WebSocketConfig {
  url: string
  protocols?: string | string[]
  reconnect: boolean
  reconnectInterval: number
}

export class WebSocketDevice implements IDevice {
  id: string
  title: string
  type: string = 'websocket'
  port: WebSocket

  private ws: WebSocket | null = null
  private messageHandler: ((data: string | ArrayBuffer) => void) | null = null
  private closeHandler: (() => void) | null = null

  constructor(port: WebSocket, url: string = 'WebSocket') {
    this.port = port
    this.id = WebSocketDevice.getDeviceId(port, url)
    this.title = WebSocketDevice.getDeviceTitle(port, url)
  }

  static getDeviceTitle(port: WebSocket, url: string): string {
    try {
      const urlObj = new URL(url)
      return `WebSocket: ${urlObj.host}`
    } catch {
      return `WebSocket: ${url}`
    }
  }

  static getDeviceId(port: WebSocket, url: string): string {
    try {
      const urlObj = new URL(url)
      return `websocket_${urlObj.host}`
    } catch {
      return `websocket_${url}`
    }
  }

  static async init(): Promise<void> {
    const savedUrls = localStorage.getItem('websocket.connected')
    if (savedUrls) {
      try {
        const urls = JSON.parse(savedUrls) as string[]
        for (const url of urls) {
          try {
            const ws = new WebSocket(url)
            await new Promise<void>((resolve, reject) => {
              ws.onopen = () => resolve()
              ws.onerror = () => reject(new Error('Connection failed'))
              setTimeout(() => reject(new Error('Connection timeout')), 5000)
            })
            const device = new WebSocketDevice(ws, url)
            const existing = authorizedDevices.value.find(d => d.id === device.id)
            if (!existing) {
              authorizedDevices.value.push(device as unknown as Device)
            }
          } catch (error) {
            console.warn(`Failed to restore WebSocket connection: ${url}`, error)
          }
        }
      } catch (error) {
        console.error('Failed to parse saved WebSocket connections:', error)
      }
    }
  }

  static async request(url: string): Promise<Device | null> {
    try {
      if (!url) {
        ElMessage.error('请输入 WebSocket 服务器地址')
        return null
      }

      let wsUrl = url
      if (!url.startsWith('ws://') && !url.startsWith('wss://')) {
        wsUrl = 'ws://' + url
      }

      const ws = new WebSocket(wsUrl)

      await new Promise<void>((resolve, reject) => {
        ws.onopen = () => resolve()
        ws.onerror = () => reject(new Error('Connection failed'))
        setTimeout(() => reject(new Error('Connection timeout')), 10000)
      })

      const device = new WebSocketDevice(ws, wsUrl)
      return device as unknown as Device
    } catch (error: any) {
      if (error.message !== 'Connection timeout' && error.message !== 'Connection failed') {
        ElMessage.error('WebSocket 连接失败：' + error.message)
      }
      console.error(error)
      return null
    }
  }

  async connect(config?: WebSocketConfig): Promise<{
    writer: WritableStreamDefaultWriter,
    reader: ReadableStreamDefaultReader
  } | null> {
    try {
      const url = config?.url || wsConfig.value.url
      
      if (!url) {
        ElMessage.error('请配置 WebSocket 服务器地址')
        return null
      }

      let wsUrl = url
      if (!url.startsWith('ws://') && !url.startsWith('wss://')) {
        wsUrl = 'ws://' + url
      }

      this.ws = new WebSocket(wsUrl, config?.protocols)

      await new Promise<void>((resolve, reject) => {
        if (!this.ws) return reject(new Error('WebSocket not initialized'))
        
        this.ws.onopen = () => resolve()
        this.ws.onerror = () => reject(new Error('Connection failed'))
        
        setTimeout(() => reject(new Error('Connection timeout')), 10000)
      })

      this.port = this.ws
      
      this.saveConnectedUrl(wsUrl)

      return {
        writer: new WebSocketWriter(this.ws),
        reader: new WebSocketReader(this.ws)
      }
    } catch (error: any) {
      if (error.message !== 'Connection timeout') {
        ElMessage.error('WebSocket 连接失败：' + error.message)
      }
      console.error(error)
      return null
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.ws) {
        this.ws.close()
        this.ws = null
      }
    } catch (error) {
      ElMessage.error('断开连接失败：' + error)
      console.error(error)
    }
  }

  getInfo(): DeviceInfo {
    try {
      const url = this.port.url
      const urlObj = new URL(url)
      return {
        manufacturer: urlObj.protocol.replace('ws:', '').replace('/', ''),
        productName: urlObj.pathname || '/',
        serialNumber: urlObj.search
      }
    } catch {
      return {}
    }
  }

  async request(): Promise<IDevice | null> {
    return WebSocketDevice.request(wsConfig.value.url)
  }

  setMessageHandler(handler: (data: string | ArrayBuffer) => void) {
    this.messageHandler = handler
    if (this.ws) {
      this.ws.onmessage = (event) => {
        if (this.messageHandler) {
          this.messageHandler(event.data)
        }
      }
    }
  }

  setCloseHandler(handler: () => void) {
    this.closeHandler = handler
    if (this.ws) {
      this.ws.onclose = () => {
        if (this.closeHandler) {
          this.closeHandler()
        }
      }
    }
  }

  private saveConnectedUrl(url: string) {
    const savedUrls = localStorage.getItem('websocket.connected')
    let urls: string[] = []
    if (savedUrls) {
      try {
        urls = JSON.parse(savedUrls)
      } catch {}
    }
    if (!urls.includes(url)) {
      urls.push(url)
      localStorage.setItem('websocket.connected', JSON.stringify(urls))
    }
  }
}

class WebSocketWriter {
  private ws: WebSocket

  constructor(ws: WebSocket) {
    this.ws = ws
  }

  async write(data: any): Promise<void> {
    if (this.ws.readyState === WebSocket.OPEN) {
      if (typeof data === 'string') {
        this.ws.send(data)
      } else if (data instanceof Uint8Array) {
        this.ws.send(data)
      } else if (ArrayBuffer.isView(data)) {
        this.ws.send(new Uint8Array(data.buffer))
      } else {
        this.ws.send(data)
      }
    } else {
      throw new Error('WebSocket is not open')
    }
  }

  async close(): Promise<void> {
    this.ws.close()
  }

  async abort(): Promise<void> {
    this.ws.close()
  }
}

class WebSocketReader {
  private ws: WebSocket

  constructor(ws: WebSocket) {
    this.ws = ws
  }

  async read(): Promise<{ done: boolean; value?: Uint8Array }> {
    return new Promise((resolve) => {
      this.ws.onmessage = (event) => {
        let value: Uint8Array
        if (typeof event.data === 'string') {
          const encoder = new TextEncoder()
          value = encoder.encode(event.data)
        } else if (event.data instanceof Blob) {
          event.data.arrayBuffer().then((buffer) => {
            resolve({ done: false, value: new Uint8Array(buffer) })
          })
          return
        } else if (event.data instanceof ArrayBuffer) {
          value = new Uint8Array(event.data)
        } else {
          value = new Uint8Array(event.data)
        }
        resolve({ done: false, value })
      }

      this.ws.onclose = () => {
        resolve({ done: true })
      }
    })
  }

  cancel(): void {
    this.ws.close()
  }
}

export const init = () => WebSocketDevice.init()
export const request = (url?: string) => WebSocketDevice.request(url || wsConfig.value.url)
