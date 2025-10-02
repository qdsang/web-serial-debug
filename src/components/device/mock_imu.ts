import { ref } from 'vue'
import { authorizedDevices, type Device } from './device'
import { TimerManager } from '../../utils/TimerManager'
import type { IDevice, DeviceInfo } from './IDevice'

export class MockIMUDevice implements IDevice {
  id: string = 'mock_imu'
  title: string = '模拟IMU设备'
  type: string = 'mock'
  port: any = null

  private static instance: MockIMUDevice | null = null
  private isSimulating = ref(false)
  private timerManager = TimerManager.getInstance()
  private SIMULATION_TIMER_ID = 'mock_imu_simulation'

  private constructor() {
    this.port = this.createMockPort()
  }

  static getInstance(): MockIMUDevice {
    if (!MockIMUDevice.instance) {
      MockIMUDevice.instance = new MockIMUDevice()
    }
    return MockIMUDevice.instance
  }

  private createMockPort(): any {
    return {
      type: 'mock',
      name: '模拟IMU设备'
    }
  }

  private sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private startSimulation = async () => {
    this.stopSimulation()
    this.isSimulating.value = true
    let dataBuffer: Uint8Array[] = []

    const { writable, readable } = new TransformStream({
      transform(chunk, controller) {
        dataBuffer.push(chunk)
        controller.enqueue(chunk)
      }
    })
    let writer = writable.getWriter()
    let reader = readable.getReader()

    let pitch = 0.0, roll = 0.0, yaw = 0.0
    await this.sleep(1000 - (Date.now() % 1000))
    this.timerManager.startTimer(this.SIMULATION_TIMER_ID, () => {
      // 模拟数据
      pitch += Math.random() * 0.4 - 0.2
      roll += Math.random() * 0.4 - 0.1
      yaw += Math.random() * 0.4 - 0

      let text = `pitch:${pitch.toFixed(2)},roll:${roll.toFixed(2)},yaw:${yaw.toFixed(2)}\n`
      const data = new TextEncoder().encode(text)

      writer.write(data)
    }, 50)

    return { writer, reader }
  }

  private stopSimulation = () => {
    this.timerManager.stopTimer(this.SIMULATION_TIMER_ID)
    this.isSimulating.value = false
  }

  async request(): Promise<Device | null> {
    return this as unknown as Device
  }

  async connect(): Promise<{ 
    writer: WritableStreamDefaultWriter, 
    reader: ReadableStreamDefaultReader 
  } | null> {
    return this.startSimulation()
  }

  async disconnect(): Promise<void> {
    this.stopSimulation()
  }

  getInfo(): DeviceInfo {
    return {
      productName: '模拟IMU设备',
      manufacturer: 'Web Serial Tool'
    }
  }
}

// 添加设备到已授权设备列表
const mockDeviceInstance = MockIMUDevice.getInstance()
authorizedDevices.value.push(mockDeviceInstance as unknown as Device)

// 为了保持向后兼容性，导出旧的函数名
export const request = () => mockDeviceInstance.request()
export const connect = () => mockDeviceInstance.connect()
export const disconnect = () => mockDeviceInstance.disconnect()
export const getInfo = () => mockDeviceInstance.getInfo()
export const makeDevice = () => mockDeviceInstance