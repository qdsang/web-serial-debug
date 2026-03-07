<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { ConfigManager } from '../utils/ConfigManager'
import { ScriptManager } from '../utils/ScriptManager'
import { EventCenter, EventNames } from '../utils/EventCenter'
import { isDesktop } from '../utils/Platform'

import { authorizedDevices, type Device, type IDevice } from '../devices'
import * as DeviceSerialPort from '../devices/serialport'
import * as DeviceMockIMU from '../devices/mock-imu'
import * as DeviceWebUSB from '../devices/webusb'
import * as DeviceBluetooth from '../devices/bluetooth'
import { DesktopSerialDevice } from '../devices/desktop'

const configManager = ConfigManager.getInstance()
const serialConfig = configManager.useConfig('serial')

const scriptManager = ScriptManager.getInstance()

const eventCenter = EventCenter.getInstance()

const serialWriter = ref<WritableStreamDefaultWriter | null>(null)
const serialReader = ref<ReadableStreamDefaultReader | null>(null)
const isConnected = ref(false)
const selectedDeviceId = ref('')
const baudRates = [921600, 460800, 230400, 115200, 57600, 38400, 19200, 9600, 4800, 2400, 1200]

const handleConfigChange = async () => {
  if (isConnected.value) {
    try {
      await disconnectSerial()
      // DeviceSerialPort.disconnect()
    }catch(error) {

    }
    try {
      const device = authorizedDevices.value.find(d => d.id === selectedDeviceId.value)
      if (device) {
        await connectDevice(device)
      }
      // ElMessage.success('设备参数已更新')
    } catch (error) {
      ElMessage.error('更新设备参数失败：' + error)
    }
  }
}
watch(serialConfig, handleConfigChange, { deep: true })

const DataEmit = async (data: Uint8Array) => {
  const runtimer = await scriptManager.getRuntimer()
  if (runtimer.DataReceiverInterface) {
    data = await runtimer.DataReceiverInterface(data);
  }
  eventCenter.emit(EventNames.SERIAL_DATA, data)
}


const handleDeviceAuthorize = async () => {
  if (isDesktop()) {
    const ports = await DesktopSerialDevice.getAvailablePorts()
    if (ports.length === 0) {
      ElMessage.error('未找到可用的串口')
      return
    }
    const selectedPort = selectedDeviceId.value || ports[0]
    const desktopDevice = new DesktopSerialDevice(selectedPort, serialConfig.value.baudRate)
    const existingIndex = authorizedDevices.value.findIndex(d => d.id === desktopDevice.id)
    if (existingIndex >= 0) {
      authorizedDevices.value.splice(existingIndex, 1)
    }
    authorizedDevices.value.push(desktopDevice as unknown as Device)
    connectDevice(desktopDevice as unknown as Device)
    return
  }

  let device: Device | null = null
  switch (selectedDeviceId.value) {
    case 'authorizedSerial':
      device = await DeviceSerialPort.request()
      break
    case 'authorizedUSB':
      device = await DeviceWebUSB.request()
      break
    case 'authorizedBluetooth':
      device = await DeviceBluetooth.request()
      break
    case 'mock':
      device = await DeviceMockIMU.request()
      break
    case 'websocket':
      break
    case 'webstlink':
    case 'script':
    case 'dap':
    case 'adb':
      ElMessage.warning('该设备类型开发中')
      selectedDeviceId.value = ''
      break
    default:
      device = authorizedDevices.value.find(p => p.id === selectedDeviceId.value) as Device | null
  }

  if (device) {
    connectDevice(device)
  } else {
    selectedDeviceId.value = ''
  }
}

const connectDevice = async (device: Device) => {
  const device2 = authorizedDevices.value.find(p => p.id === device.id)
  if (!device2) {
    authorizedDevices.value.push(device)
  }
  let port
  try {
    // 使用新的标准接口方法
    port = await device.connect(serialConfig.value)
  } catch (error) {
    ElMessage.error('设备连接失败：' + error)
    console.log(error)
  }

  if (port) {
    serialWriter.value = port.writer
    serialReader.value = port.reader
    isConnected.value = true
    ElMessage.success('设备连接成功')
    startReading()
    selectedDeviceId.value = device.id
  } else {
    selectedDeviceId.value = ''
  }
}

const disconnectSerial = async () => {
  try {
    if (serialReader.value) {
      await serialReader.value.cancel()
      serialReader.value.releaseLock()
    }
    if (serialWriter.value) {
      await serialWriter.value.close()
      serialWriter.value.releaseLock()
    }
  } catch (error) {
    console.log(error)
  }
  isConnected.value = false
  // selectedDeviceId.value = ''

  try {
    await DeviceSerialPort.disconnect()
    await DeviceMockIMU.disconnect()
    ElMessage.success('设备已断开')
  } catch (error) {
    ElMessage.error('断开设备失败：' + error)
    console.log(error)
  }
}

const startReading = async () => {
  while (isConnected.value && serialReader.value) {
    try {
      const { value, done } = await serialReader.value.read()
      // console.log('startReading', value.length, done, Date.now())
      if (done) {
        break
      }
      DataEmit(value)
    } catch (error) {
      ElMessage.error('读取设备数据失败：' + error)
      break
    }
  }
}

const handleSerialSend = async (data: Uint8Array) => {
  if (!isConnected.value || !serialWriter.value) {
    if (data.length == 1 && data[0] == 13) {
      eventCenter.emit(EventNames.TERM_WRITE, data)
    } else {
      ElMessage.error('设备未连接')
    }
    return
  }

  const runtimer = await scriptManager.getRuntimer()
  if (runtimer.DataSenderInterface) {
    data = await runtimer.DataSenderInterface(data);
  }

  try {
    await serialWriter.value.write(data)
    ElMessage.success({ message: '发送成功', grouping: true, duration: 1800, showClose: true })
  } catch (error) {
    console.log(error)
    ElMessage.error('发送数据失败：' + error)
  }
}

const wsConfig = ref({
  url: '',
  history: [] as string[]
})

const handleWsConfigChange = (value: string) => {
  if (!value) return
  wsConfig.value.url = value
  if (!wsConfig.value.history.includes(value)) {
    wsConfig.value.history.push(value)
    localStorage.setItem('config.wsConfig', JSON.stringify(wsConfig.value))
  }
}

onMounted(() => {
  eventCenter.on(EventNames.SERIAL_SEND, handleSerialSend)
  DeviceSerialPort.init()
  DeviceWebUSB.init()
})

onUnmounted(() => {
  eventCenter.off(EventNames.SERIAL_SEND, handleSerialSend)
})

const handleConenctClick = async () => {
  if (isConnected.value) {
    await disconnectSerial()
  } else {
    if (isDesktop()) {
      const ports = await DesktopSerialDevice.getAvailablePorts()
      if (ports.length > 0) {
        const selectedPort = selectedDeviceId.value || ports[0]
        const desktopDevice = new DesktopSerialDevice(selectedPort, serialConfig.value.baudRate)
        authorizedDevices.value.push(desktopDevice as unknown as Device)
        await connectDevice(desktopDevice as unknown as Device)
      } else {
        ElMessage.error('未找到可用的串口')
      }
    } else {
      const device = authorizedDevices.value.find(d => d.id === selectedDeviceId.value)
      if (device) {
        connectDevice(device)
      }
    }
  }
}

// defineExpose({scriptManager})

</script>

<template>
  <div class="serial-config">
    <div class="config-container">
      <div class="port-section">
        <div class="port-list">
          <el-select v-model="selectedDeviceId" @change="handleDeviceAuthorize" placeholder="选择设备" size="small">
            <el-option label="选择设备" value=""></el-option>
            <template v-if="isDesktop()">
              <el-option-group label="桌面串口设备">
                <el-option label="自动选择串口" value="auto"></el-option>
                <el-option
                  v-for="device in authorizedDevices.filter(device => device.type == 'desktop-serial')"
                  :key="device.id"
                  :label="device.title"
                  :value="device.id"
                />
              </el-option-group>
            </template>
            <template v-else>
              <el-option-group label="串口设备">
                <el-option label="授权串口设备" value="authorizedSerial"></el-option>
                <el-option
                  v-for="device in authorizedDevices.filter(device => device.type == 'serialport')"
                  :key="device.id"
                  :label="device.title"
                  :value="device.id"
                />
              </el-option-group>
              <el-option-group label="WebUSB设备">
                <el-option label="授权WebUSB设备" value="authorizedUSB"></el-option>
                <el-option
                  v-for="device in authorizedDevices.filter(device => device.type == 'usb')"
                  :key="device.id"
                  :label="device.title"
                  :value="device.id"
                />
              </el-option-group>
              <el-option-group label="蓝牙设备">
                <el-option label="授权蓝牙设备" value="authorizedBluetooth"></el-option>
                <el-option
                  v-for="device in authorizedDevices.filter(device => device.type == 'bluetooth')"
                  :key="device.id"
                  :label="device.title"
                  :value="device.id"
                />
              </el-option-group>
            </template>
            <el-option-group label="其他">
              <el-option label="WebSocket" value="websocket"></el-option>
              <el-option label="脚本" value="script"></el-option>
              <el-option label="Stlink" value="webstlink"></el-option>
              <el-option label="DAP" value="dap"></el-option>
              <el-option label="adb" value="adb"></el-option>
              <el-option label="模拟数据(IMU)" value="mock"></el-option>
            </el-option-group>
          </el-select>
        </div>
        <el-button-group>
          <el-button :type="isConnected ? 'danger' : 'primary'" @click="handleConenctClick" size="small">
            {{ isConnected ? '断开' : '连接' }}
          </el-button>
        </el-button-group>
      </div>
      <el-form v-if="selectedDeviceId == 'websocket'" :model="wsConfig" :inline="true" size="small" class="config-section">
        <el-form-item label="ws">
          <el-select v-model="wsConfig.url" filterable allow-create @change="handleWsConfigChange" style="width: 300px;">
            <el-option v-for="url in wsConfig.history" :key="url" :label="url" :value="url" />
          </el-select>
        </el-form-item>
      </el-form>
      <el-form v-else :model="serialConfig" :inline="true" size="small" class="config-section">
        <el-form-item label="波特率">
          <el-select v-model="serialConfig.baudRate" style="width: 80px;">
            <el-option v-for="rate in baudRates" :key="rate" :value="rate" />
          </el-select>
        </el-form-item>
        <el-form-item label="数据位">
          <el-select v-model="serialConfig.dataBits" style="width: 50px;">
            <el-option v-for="bits in [8, 7, 6, 5]" :key="bits" :value="bits" />
          </el-select>
        </el-form-item>
        <el-form-item label="停止位">
          <el-select v-model="serialConfig.stopBits" style="width: 50px;">
            <el-option v-for="bits in [1, 2]" :key="bits" :value="bits" />
          </el-select>
        </el-form-item>
        <el-form-item label="校验位">
          <el-select v-model="serialConfig.parity" style="width: 60px;">
            <el-option label="无" value="none" />
            <el-option label="奇校验" value="odd" />
            <el-option label="偶校验" value="even" />
          </el-select>
        </el-form-item>
        <el-form-item label="流控制">
          <el-select v-model="serialConfig.flowControl" style="width: 60px;">
            <el-option label="无" value="none" />
            <el-option label="硬件流控" value="hardware" />
          </el-select>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<style scoped>
.serial-config {
  margin: 0;
}

.config-container {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 15px;
  align-items: center;
}

.port-section {
  display: flex;
  align-items: center;
  gap: 10px;
  white-space: nowrap;
}

.port-list {
  width: 160px;
}

.config-section {
  display: flex;
  flex-wrap: wrap;
  margin: 0;
}

.el-form--inline .el-form-item {
  margin-right: 8px;
  margin-bottom: 0;
}

:deep(.el-form-item__label) {
  padding-right: 4px;
}

:deep(.el-input__wrapper) {
  padding: 0 8px;
}
</style>