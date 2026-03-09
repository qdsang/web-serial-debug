<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { WorkspaceManagerInst, isConnected, connectedDeviceId, type Workspace } from '../utils/ProfileManager'
import { authorizedDevices, type Device } from '../devices'
import { isDesktop } from '../utils/Platform'
import * as DeviceSerialPort from '../devices/serialport'
import * as DeviceWebUSB from '../devices/webusb'
import * as DeviceBluetooth from '../devices/bluetooth'
import * as DeviceWebSocket from '../devices/websocket'
import * as DeviceWebSTLink from '../devices/webstlink'
import * as DeviceDAPLink from '../devices/daplink'
import { DesktopSerialDevice } from '../devices/desktop'

const workspaceManager = WorkspaceManagerInst

const workspaces = computed(() => workspaceManager.workspacesRef.value)
const activeWorkspaceId = computed(() => workspaceManager.activeWorkspaceIdRef.value)
const activeWorkspace = computed(() => workspaceManager.activeWorkspace)

const showWorkspacePopover = ref(false)
const showSettings = ref(false)
const serialConfig = ref({
  baudRate: 115200,
  dataBits: 8,
  stopBits: 1,
  parity: 'none' as 'none' | 'odd' | 'even',
  flowControl: 'none' as 'none' | 'hardware'
})
const wsConfig = ref({
  url: ''
})

const baudRates = [921600, 460800, 230400, 115200, 57600, 38400, 19200, 9600, 4800, 2400, 1200]

const loadWorkspaceSettings = (workspace: Workspace) => {
  if (workspace.config.serial) {
    serialConfig.value = { ...serialConfig.value, ...workspace.config.serial }
  }
  if (workspace.config.websocket) {
    wsConfig.value = { ...wsConfig.value, ...workspace.config.websocket }
  }
}

const openSettings = () => {
  const workspace = activeWorkspace.value
  if (workspace) {
    loadWorkspaceSettings(workspace)
  }
  showSettings.value = true
}

const saveWorkspaceSettings = () => {
  const workspace = activeWorkspace.value
  if (workspace) {
    workspaceManager.updateWorkspace(workspace.id, {
      config: {
        ...workspace.config,
        serial: { ...serialConfig.value },
        websocket: { ...wsConfig.value }
      }
    })
    ElMessage.success('设置已保存')
  }
  showSettings.value = false
}

const handleWorkspaceChange = (workspaceId: string) => {
  workspaceManager.setActiveWorkspace(workspaceId)
}

const handleCreateWorkspace = () => {
  showWorkspacePopover.value = false
  ElMessageBox.prompt('请输入新工作区名称', '新建工作区', {
    confirmButtonText: '创建',
    cancelButtonText: '取消',
    inputPattern: /.+/,
    inputErrorMessage: '名称不能为空'
  }).then(({ value }) => {
    if (value) {
      workspaceManager.createWorkspace(value)
      ElMessage.success('工作区创建成功')
    }
  }).catch(() => {})
}

const handleRenameWorkspace = () => {
  showWorkspacePopover.value = false
  if (!activeWorkspace.value) return
  
  ElMessageBox.prompt('请输入新名称', '重命名工作区', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    inputValue: activeWorkspace.value.name,
    inputPattern: /.+/,
    inputErrorMessage: '名称不能为空'
  }).then(({ value }) => {
    if (value) {
      workspaceManager.renameWorkspace(activeWorkspace.value!.id, value)
      ElMessage.success('重命名成功')
    }
  }).catch(() => {})
}

const handleDeleteWorkspace = () => {
  showWorkspacePopover.value = false
  if (!activeWorkspace.value) return
  
  if (workspaces.value.length <= 1) {
    ElMessage.warning('至少保留一个工作区')
    return
  }
  
  ElMessageBox.confirm(`确定要删除工作区"${activeWorkspace.value.name}"吗？`, '删除工作区', {
    confirmButtonText: '删除',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    workspaceManager.deleteWorkspace(activeWorkspace.value!.id)
    ElMessage.success('删除成功')
  }).catch(() => {})
}

const handleDuplicateWorkspace = () => {
  showWorkspacePopover.value = false
  if (!activeWorkspace.value) return
  
  ElMessageBox.prompt('请输入新工作区名称', '复制工作区', {
    confirmButtonText: '复制',
    cancelButtonText: '取消',
    inputValue: activeWorkspace.value.name + '_copy',
    inputPattern: /.+/,
    inputErrorMessage: '名称不能为空'
  }).then(({ value }) => {
    if (value) {
      workspaceManager.duplicateWorkspace(activeWorkspace.value!.id, value)
      ElMessage.success('复制成功')
    }
  }).catch(() => {})
}

const getDeviceConfig = (device: Device) => {
  return {
    deviceType: device.type,
    deviceId: device.id,
    deviceTitle: device.title
  }
}

const saveDeviceConfig = (device: Device) => {
  const workspace = activeWorkspace.value
  if (workspace) {
    workspaceManager.updateWorkspace(workspace.id, {
      config: {
        ...workspace.config,
        savedDevice: getDeviceConfig(device)
      }
    })
  }
}

const connectDevice = async (device: Device, saveToWorkspace = true) => {
  let port
  try {
    const workspace = activeWorkspace.value
    const config = workspace?.config?.serial || serialConfig.value
    port = await device.connect(config)
  } catch (error) {
    ElMessage.error('设备连接失败：' + error)
    console.log(error)
  }

  if (port) {
    isConnected.value = true
    connectedDeviceId.value = device.id
    ElMessage.success('设备连接成功')
    if (saveToWorkspace) {
      saveDeviceConfig(device)
    }
  }
}

const disconnectDevice = async () => {
  try {
    const device = authorizedDevices.value.find(d => d.id === connectedDeviceId.value)
    if (device) {
      await device.disconnect()
    }
    isConnected.value = false
    connectedDeviceId.value = null
    ElMessage.success('设备已断开')
  } catch (error) {
    ElMessage.error('断开设备失败：' + error)
    console.log(error)
  }
}

const handleConnectClick = async () => {
  if (isConnected.value) {
    await disconnectDevice()
  } else {
    const workspace = activeWorkspace.value
    const savedDevice = workspace?.config?.savedDevice as { deviceType: string; deviceId?: string } | undefined
    
    if (savedDevice?.deviceId) {
      const device = authorizedDevices.value.find(d => d.id === savedDevice.deviceId)
      if (device) {
        await connectDevice(device)
        return
      }
    }
    
    ElMessage.warning('请先选择设备')
  }
}

const authorizeSerialDevice = async () => {
  try {
    const device = await DeviceSerialPort.request()
    if (device) {
      authorizedDevices.value.push(device)
      ElMessage.success('授权成功')
    }
  } catch (error) {
    ElMessage.error('授权失败：' + error)
  }
}

const authorizeWebUSBDevice = async () => {
  try {
    const device = await DeviceWebUSB.request()
    if (device) {
      authorizedDevices.value.push(device as unknown as Device)
      ElMessage.success('授权成功')
    }
  } catch (error) {
    ElMessage.error('授权失败：' + error)
  }
}

const authorizeBluetoothDevice = async () => {
  try {
    const device = await DeviceBluetooth.request()
    if (device) {
      authorizedDevices.value.push(device as unknown as Device)
      ElMessage.success('授权成功')
    }
  } catch (error) {
    ElMessage.error('授权失败：' + error)
  }
}

const handleDeviceSelect = async (device: Device) => {
  showWorkspacePopover.value = false
  if (isConnected.value && connectedDeviceId.value !== device.id) {
    await disconnectDevice()
  }
  if (!isConnected.value || connectedDeviceId.value !== device.id) {
    await connectDevice(device)
  }
}

const getDeviceTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    'serialport': '串口设备',
    'usb': 'WebUSB设备',
    'bluetooth': '蓝牙设备',
    'websocket': 'WebSocket',
    'webstlink': 'ST-Link',
    'daplink': 'DAPLink',
    'mock': '模拟数据(IMU)',
    'desktop-serial': '桌面串口'
  }
  return labels[type] || type
}

const getConnectedDeviceName = computed(() => {
  if (!connectedDeviceId.value) return '未连接'
  const device = authorizedDevices.value.find(d => d.id === connectedDeviceId.value)
  return device?.title || '未知设备'
})
</script>

<template>
  <div class="workspace-selector">
    <el-popover
      v-model:visible="showWorkspacePopover"
      placement="bottom-start"
      :width="360"
      trigger="click"
    >
      <template #reference>
        <div class="workspace-trigger">
          <span class="workspace-name">{{ activeWorkspace?.name || '选择工作区' }}</span>
          <el-icon class="arrow-icon"><ArrowDown /></el-icon>
        </div>
      </template>
      
      <div class="workspace-menu">
        <div class="menu-section">
          <div class="section-title">已授权设备</div>
          <div v-if="authorizedDevices.length === 0" class="empty-tip">
            暂无授权设备
          </div>
          <div 
            v-for="device in authorizedDevices" 
            :key="device.id"
            class="device-item"
            :class="{ active: connectedDeviceId === device.id }"
            @click="handleDeviceSelect(device)"
          >
            <div class="device-info">
              <span class="device-name">{{ device.title }}</span>
              <span class="device-type">{{ getDeviceTypeLabel(device.type) }}</span>
            </div>
            <el-tag v-if="connectedDeviceId === device.id" type="success" size="small">已连接</el-tag>
          </div>
        </div>
        
        <el-divider />
        
        <div class="menu-section">
          <div class="section-title">授权新设备</div>
          <div class="auth-buttons">
            <el-button v-if="!isDesktop()" size="small" @click="authorizeSerialDevice">串口授权</el-button>
            <el-button v-if="!isDesktop()" size="small" @click="authorizeWebUSBDevice">WebUSB授权</el-button>
            <el-button v-if="!isDesktop()" size="small" @click="authorizeBluetoothDevice">蓝牙授权</el-button>
            <el-button size="small" @click="showWorkspacePopover = false; openSettings()">设备设置</el-button>
          </div>
        </div>
        
        <el-divider />
        
        <div class="menu-section">
          <div class="section-title">工作区</div>
          <div 
            v-for="workspace in workspaces" 
            :key="workspace.id"
            class="workspace-item"
            :class="{ active: activeWorkspaceId === workspace.id }"
            @click="handleWorkspaceChange(workspace.id)"
          >
            <span>{{ workspace.name }}</span>
            <el-icon v-if="activeWorkspaceId === workspace.id" class="check-icon"><Check /></el-icon>
          </div>
        </div>
        
        <div class="menu-actions">
          <el-button size="small" @click="handleCreateWorkspace">
            <el-icon><Plus /></el-icon>新建工作区
          </el-button>
          <el-button size="small" @click="handleRenameWorkspace">
            <el-icon><Edit /></el-icon>重命名
          </el-button>
          <el-button size="small" @click="handleDuplicateWorkspace">
            <el-icon><CopyDocument /></el-icon>复制
          </el-button>
          <el-button size="small" type="danger" @click="handleDeleteWorkspace">
            <el-icon><Delete /></el-icon>删除
          </el-button>
        </div>
      </div>
    </el-popover>
    
    <el-button 
      :type="isConnected ? 'danger' : 'primary'" 
      size="small" 
      @click="handleConnectClick"
    >
      {{ isConnected ? '断开' : '连接' }}
    </el-button>
    
    <el-button size="small" circle @click="openSettings">
      <el-icon><Setting /></el-icon>
    </el-button>
    
    <el-dialog
      v-model="showSettings"
      title="工作区设置"
      width="600px"
    >
      <el-tabs type="card">
        <el-tab-pane label="设备配置">
          <el-form :model="serialConfig" label-width="100px">
            <el-divider>串口参数</el-divider>
            
            <el-form-item label="波特率">
              <el-select v-model="serialConfig.baudRate" style="width: 100%;">
                <el-option v-for="rate in baudRates" :key="rate" :label="rate.toString()" :value="rate" />
              </el-select>
            </el-form-item>
            
            <el-form-item label="数据位">
              <el-select v-model="serialConfig.dataBits" style="width: 100%;">
                <el-option v-for="bits in [8, 7, 6, 5]" :key="bits" :label="bits.toString()" :value="bits" />
              </el-select>
            </el-form-item>
            
            <el-form-item label="停止位">
              <el-select v-model="serialConfig.stopBits" style="width: 100%;">
                <el-option v-for="bits in [1, 2]" :key="bits" :label="bits.toString()" :value="bits" />
              </el-select>
            </el-form-item>
            
            <el-form-item label="校验位">
              <el-select v-model="serialConfig.parity" style="width: 100%;">
                <el-option label="无" value="none" />
                <el-option label="奇校验" value="odd" />
                <el-option label="偶校验" value="even" />
              </el-select>
            </el-form-item>
            
            <el-form-item label="流控制">
              <el-select v-model="serialConfig.flowControl" style="width: 100%;">
                <el-option label="无" value="none" />
                <el-option label="硬件流控" value="hardware" />
              </el-select>
            </el-form-item>
          </el-form>
        </el-tab-pane>
        
        <el-tab-pane label="WebSocket">
          <el-form :model="wsConfig" label-width="100px">
            <el-form-item label="WebSocket URL">
              <el-input v-model="wsConfig.url" placeholder="ws://localhost:8080" />
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>
      
      <template #footer>
        <el-button @click="showSettings = false">取消</el-button>
        <el-button type="primary" @click="saveWorkspaceSettings">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.workspace-selector {
  display: flex;
  align-items: center;
  gap: 8px;
}

.workspace-trigger {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  background: var(--el-fill-color-light);
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
}

.workspace-trigger:hover {
  background: var(--el-fill-color);
}

.workspace-name {
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.arrow-icon {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.workspace-menu {
  max-height: 500px;
  overflow-y: auto;
}

.menu-section {
  padding: 4px 0;
}

.section-title {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  padding: 4px 8px;
  margin-bottom: 4px;
}

.empty-tip {
  text-align: center;
  color: var(--el-text-color-secondary);
  padding: 12px;
  font-size: 13px;
}

.device-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.2s;
}

.device-item:hover {
  background: var(--el-fill-color-light);
}

.device-item.active {
  background: var(--el-color-primary-light-9);
}

.device-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.device-name {
  font-size: 14px;
}

.device-type {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.workspace-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.2s;
}

.workspace-item:hover {
  background: var(--el-fill-color-light);
}

.workspace-item.active {
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
}

.check-icon {
  color: var(--el-color-success);
}

.menu-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 8px 0;
}

.auth-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
</style>
