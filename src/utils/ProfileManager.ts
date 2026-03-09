import { ref, computed } from 'vue'
import { getStorage } from './StorageAdapter'
import { type SavedDevice, type DeviceStore } from './ProfileTypes'
import { defaultSerialConfig, defaultWebSocketConfig } from '../devices/types'
import { defaultDisplayConfig, defaultSendConfig, defaultLayoutConfig, defaultChartConfig, defaultCanvasConfig } from '../components/types'

const WORKSPACES_KEY = 'workspaces'
const DEVICES_KEY = 'devices'
const ACTIVE_WORKSPACE_KEY = 'activeWorkspaceId'

export interface Workspace {
  id: string
  name: string
  deviceId: string | null
  deviceType: string | null
  config: Record<string, any>
  createdAt: number
  updatedAt: number
}

const defaultConfig = {
  serial: defaultSerialConfig,
  websocket: defaultWebSocketConfig,
  display: defaultDisplayConfig,
  send: defaultSendConfig,
  layout: defaultLayoutConfig,
  charts: defaultChartConfig,
  canvas: defaultCanvasConfig,
  fields: [],
  columnVisibility: {},
  quickSendGroups: [],
  script: null,
  savedDevice: null
}

export const isConnected = ref(false)
export const connectedDeviceId = ref<string | null>(null)

class WorkspaceManager {
  private static instance: WorkspaceManager
  private workspaces = ref<Workspace[]>([])
  private deviceStore = ref<DeviceStore>({
    savedDevices: [],
    activeDeviceId: null,
    activeProfileId: null
  })
  private activeWorkspaceId = ref<string | null>(null)
  private workspaceChangeCallbacks: Array<(workspace: Workspace | null) => void> = []

  private constructor() {
    this.loadAll()
  }

  public static getInstance(): WorkspaceManager {
    if (!WorkspaceManager.instance) {
      WorkspaceManager.instance = new WorkspaceManager()
    }
    return WorkspaceManager.instance
  }

  private loadAll(): void {
    const storage = getStorage()
    const workspaces = storage.get<Workspace[]>(WORKSPACES_KEY)
    if (workspaces) {
      this.workspaces.value = workspaces
    }
    const devices = storage.get<DeviceStore>(DEVICES_KEY)
    if (devices) {
      this.deviceStore.value = devices
    }
    const activeWorkspaceId = storage.get<string>(ACTIVE_WORKSPACE_KEY)
    if (activeWorkspaceId) {
      this.activeWorkspaceId.value = activeWorkspaceId
    }
    
    if (this.workspaces.value.length === 0) {
      this.createWorkspace('默认工作区')
    }
    
    if (!this.activeWorkspaceId.value && this.workspaces.value.length > 0) {
      this.setActiveWorkspace(this.workspaces.value[0].id)
    }
  }

  private saveWorkspaces(): void {
    const storage = getStorage()
    storage.set(WORKSPACES_KEY, this.workspaces.value)
  }

  private saveDevices(): void {
    const storage = getStorage()
    storage.set(DEVICES_KEY, this.deviceStore.value)
  }

  private saveActiveWorkspace(): void {
    const storage = getStorage()
    storage.set(ACTIVE_WORKSPACE_KEY, this.activeWorkspaceId.value)
  }

  onWorkspaceChange(callback: (workspace: Workspace | null) => void): void {
    this.workspaceChangeCallbacks.push(callback)
  }

  private notifyWorkspaceChange(): void {
    this.workspaceChangeCallbacks.forEach(cb => cb(this.activeWorkspace))
  }

  get workspacesRef() {
    return this.workspaces
  }

  get deviceStoreRef() {
    return this.deviceStore
  }

  get activeWorkspaceIdRef() {
    return this.activeWorkspaceId
  }

  get activeWorkspaceIdComputed() {
    return computed(() => this.activeWorkspaceId.value)
  }

  get activeDeviceId() {
    return computed(() => this.deviceStore.value.activeDeviceId)
  }

  get activeWorkspace(): Workspace | null {
    if (!this.activeWorkspaceId.value) {
      return null
    }
    return this.workspaces.value.find(p => p.id === this.activeWorkspaceId.value) || null
  }

  get activeWorkspaceRef() {
    return computed(() => this.activeWorkspace)
  }

  getWorkspacesByDevice(deviceId: string | null): Workspace[] {
    if (!deviceId) {
      return this.workspaces.value.filter(p => !p.deviceId)
    }
    return this.workspaces.value.filter(p => p.deviceId === deviceId || !p.deviceId)
  }

  createWorkspace(name: string, options?: {
    deviceId?: string | null
    deviceType?: string | null
  }): Workspace {
    const now = Date.now()
    const id = `workspace_${name.toLowerCase().replace(/\s+/g, '_')}_${now}`
    
    const config = JSON.parse(JSON.stringify(defaultConfig))
    
    const workspace: Workspace = {
      id,
      name,
      deviceId: options?.deviceId || null,
      deviceType: options?.deviceType || null,
      config,
      createdAt: now,
      updatedAt: now
    }

    this.workspaces.value.push(workspace)
    this.saveWorkspaces()
    return workspace
  }

  setActiveWorkspace(workspaceId: string): void {
    this.activeWorkspaceId.value = workspaceId
    this.saveActiveWorkspace()
    this.notifyWorkspaceChange()
  }

  renameWorkspace(workspaceId: string, newName: string): void {
    this.updateWorkspace(workspaceId, { name: newName })
  }

  deleteWorkspace(workspaceId: string): void {
    this.deleteWorkspaceById(workspaceId)
  }

  duplicateWorkspace(workspaceId: string, newName: string): Workspace | null {
    const original = this.workspaces.value.find(p => p.id === workspaceId)
    if (!original) return null

    return this.createWorkspace(newName, {
      deviceId: original.deviceId,
      deviceType: original.deviceType
    })
  }

  updateWorkspace(workspaceId: string, updates: Partial<Workspace>): void {
    const index = this.workspaces.value.findIndex(p => p.id === workspaceId)
    if (index >= 0) {
      this.workspaces.value[index] = {
        ...this.workspaces.value[index],
        ...updates,
        updatedAt: Date.now()
      }
      this.saveWorkspaces()
    }
  }

  deleteWorkspaceById(workspaceId: string): void {
    const index = this.workspaces.value.findIndex(p => p.id === workspaceId)
    if (index >= 0) {
      this.workspaces.value.splice(index, 1)
      this.saveWorkspaces()
      
      if (this.deviceStore.value.activeProfileId === workspaceId) {
        this.deviceStore.value.activeProfileId = null
        this.saveDevices()
      }
      
      if (this.activeWorkspaceId.value === workspaceId) {
        if (this.workspaces.value.length > 0) {
          this.setActiveWorkspace(this.workspaces.value[0].id)
        } else {
          this.createWorkspace('默认工作区')
        }
      }
    }
  }

  saveDevice(device: SavedDevice): void {
    const index = this.deviceStore.value.savedDevices.findIndex(d => d.id === device.id)
    if (index >= 0) {
      this.deviceStore.value.savedDevices[index] = device
    } else {
      this.deviceStore.value.savedDevices.push(device)
    }
    this.saveDevices()
  }

  removeDevice(deviceId: string): void {
    const index = this.deviceStore.value.savedDevices.findIndex(d => d.id === deviceId)
    if (index >= 0) {
      this.deviceStore.value.savedDevices.splice(index, 1)
      this.deviceStore.value.savedDevices.forEach(d => {
        d.profileIds = d.profileIds.filter(pid => pid !== deviceId)
      })
      if (this.deviceStore.value.activeDeviceId === deviceId) {
        this.deviceStore.value.activeDeviceId = null
      }
      this.saveDevices()
    }
  }

  getSavedDevice(deviceId: string): SavedDevice | null {
    return this.deviceStore.value.savedDevices.find(d => d.id === deviceId) || null
  }

  setActiveDevice(deviceId: string | null, workspaceId?: string | null): void {
    this.deviceStore.value.activeDeviceId = deviceId
    
    if (workspaceId !== undefined) {
      this.deviceStore.value.activeProfileId = workspaceId
    } else if (deviceId) {
      const device = this.getSavedDevice(deviceId)
      if (device?.lastProfileId) {
        this.deviceStore.value.activeProfileId = device.lastProfileId
      } else if (device?.profileIds.length) {
        this.deviceStore.value.activeProfileId = device.profileIds[0]
      }
    }
    
    this.saveDevices()
  }

  setActiveWorkspaceProfile(workspaceId: string | null): void {
    this.deviceStore.value.activeProfileId = workspaceId
    
    if (this.deviceStore.value.activeDeviceId && workspaceId) {
      const device = this.getSavedDevice(this.deviceStore.value.activeDeviceId)
      if (device) {
        device.lastProfileId = workspaceId
        this.saveDevices()
      }
    }
  }

  getOrCreateDefaultWorkspace(deviceId?: string, deviceType?: string): Workspace {
    let workspace = this.activeWorkspace
    
    if (!workspace && deviceId) {
      const deviceWorkspaces = this.getWorkspacesByDevice(deviceId)
      workspace = deviceWorkspaces[0]
    }
    
    if (!workspace) {
      workspace = this.createWorkspace('默认配置', {
        deviceId: deviceId || null,
        deviceType: deviceType || null
      })
    }
    
    return workspace
  }

  getDefaultConfig() {
    return defaultConfig
  }

  get activeProfile() {
    return this.activeWorkspace
  }

  get activeProfileRef() {
    return computed(() => this.activeWorkspace)
  }

  updateProfile(workspaceId: string, updates: Partial<Workspace>): void {
    this.updateWorkspace(workspaceId, updates)
  }

  createProfile(name: string, options?: {
    deviceId?: string | null
    deviceType?: string | null
  }): Workspace {
    return this.createWorkspace(name, options)
  }

  setActiveProfile(workspaceId: string): void {
    this.setActiveWorkspace(workspaceId)
  }

  onProfileChange(callback: (workspace: Workspace | null) => void): void {
    this.onWorkspaceChange(callback)
  }
}

export const WorkspaceManagerInst = WorkspaceManager.getInstance()
export const ProfileManagerInst = WorkspaceManagerInst
export { WorkspaceManager }
