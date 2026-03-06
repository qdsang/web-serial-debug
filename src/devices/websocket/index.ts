import { ElMessage } from 'element-plus'
import type { Device } from '../types'

export interface WebSocketDevice {
  id: string
  title: string
  type: string
  port: WebSocket
}

export const getDeviceTitle = (port: WebSocketDevice) => {
  return '未知设备' + port
}

export const getDeviceId = (_: WebSocketDevice) => {
  return 'websocket'
}

export const makeDevice = (port: WebSocketDevice) => {
  return {
    id: getDeviceId(port),
    title: getDeviceTitle(port),
    type:'websocket',
    port: port
  } as Device
}

export const init = async () => {

}

export const request = async () => {
  return null
}

export const connectDevice = async (_: Device) => {
  try {
  } catch (error) {
    ElMessage.error('设备连接失败：' + error)
    console.log(error)
  }
  return null
}

export const disconnect = async () => {
  
}
