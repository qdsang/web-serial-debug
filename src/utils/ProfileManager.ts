import { ref, computed } from 'vue'
import { getStorage } from './StorageAdapter'
import {
  type Profile,
  type SavedDevice,
  type DeviceStore
} from './ProfileTypes'
import { defaultSerialConfig, defaultWebSocketConfig } from '../devices/types'
import { defaultDisplayConfig, defaultSendConfig } from '../components/types'

const PROFILES_KEY = 'profiles'
const DEVICES_KEY = 'devices'

const defaultConfig = {
  serial: defaultSerialConfig,
  websocket: defaultWebSocketConfig,
  display: defaultDisplayConfig,
  send: defaultSendConfig
}

class ProfileManager {
  private static instance: ProfileManager
  private profiles = ref<Profile[]>([])
  private deviceStore = ref<DeviceStore>({
    savedDevices: [],
    activeDeviceId: null,
    activeProfileId: null
  })

  private constructor() {
    this.loadAll()
  }

  public static getInstance(): ProfileManager {
    if (!ProfileManager.instance) {
      ProfileManager.instance = new ProfileManager()
    }
    return ProfileManager.instance
  }

  private loadAll(): void {
    const storage = getStorage()
    const profiles = storage.get<Profile[]>(PROFILES_KEY)
    if (profiles) {
      this.profiles.value = profiles
    }
    const devices = storage.get<DeviceStore>(DEVICES_KEY)
    if (devices) {
      this.deviceStore.value = devices
    }
  }

  private saveProfiles(): void {
    const storage = getStorage()
    storage.set(PROFILES_KEY, this.profiles.value)
  }

  private saveDevices(): void {
    const storage = getStorage()
    storage.set(DEVICES_KEY, this.deviceStore.value)
  }

  get profilesRef() {
    return this.profiles
  }

  get deviceStoreRef() {
    return this.deviceStore
  }

  get activeProfileId() {
    return computed(() => this.deviceStore.value.activeProfileId)
  }

  get activeDeviceId() {
    return computed(() => this.deviceStore.value.activeDeviceId)
  }

  get activeProfile(): Profile | null {
    if (!this.deviceStore.value.activeProfileId) {
      return null
    }
    return this.profiles.value.find(p => p.id === this.deviceStore.value.activeProfileId) || null
  }

  get activeProfileRef() {
    return computed(() => this.activeProfile)
  }

  getProfilesByDevice(deviceId: string | null): Profile[] {
    if (!deviceId) {
      return this.profiles.value.filter(p => !p.deviceId)
    }
    return this.profiles.value.filter(p => p.deviceId === deviceId || !p.deviceId)
  }

  createProfile(options: {
    name: string
    deviceId?: string | null
    deviceType?: string | null
    config?: Record<string, any>
  }): Profile {
    const now = Date.now()
    const id = `${options.deviceType || 'profile'}_${options.name.toLowerCase().replace(/\s+/g, '_')}_${now}`
    
    const config = { ...defaultConfig, ...options.config }
    
    const profile: Profile = {
      id,
      name: options.name,
      deviceId: options.deviceId || null,
      deviceType: options.deviceType || null,
      config,
      createdAt: now,
      updatedAt: now
    }

    this.profiles.value.push(profile)
    this.saveProfiles()
    return profile
  }

  updateProfile(profileId: string, updates: Partial<Profile>): void {
    const index = this.profiles.value.findIndex(p => p.id === profileId)
    if (index >= 0) {
      this.profiles.value[index] = {
        ...this.profiles.value[index],
        ...updates,
        updatedAt: Date.now()
      }
      this.saveProfiles()
    }
  }

  deleteProfile(profileId: string): void {
    const index = this.profiles.value.findIndex(p => p.id === profileId)
    if (index >= 0) {
      this.profiles.value.splice(index, 1)
      this.saveProfiles()
      
      if (this.deviceStore.value.activeProfileId === profileId) {
        this.deviceStore.value.activeProfileId = null
        this.saveDevices()
      }
    }
  }

  duplicateProfile(profileId: string, newName: string): Profile | null {
    const original = this.profiles.value.find(p => p.id === profileId)
    if (!original) return null

    return this.createProfile({
      name: newName,
      deviceId: original.deviceId,
      deviceType: original.deviceType,
      config: original.config
    })
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

  setActiveDevice(deviceId: string | null, profileId?: string | null): void {
    this.deviceStore.value.activeDeviceId = deviceId
    
    if (profileId !== undefined) {
      this.deviceStore.value.activeProfileId = profileId
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

  setActiveProfile(profileId: string | null): void {
    this.deviceStore.value.activeProfileId = profileId
    
    if (this.deviceStore.value.activeDeviceId && profileId) {
      const device = this.getSavedDevice(this.deviceStore.value.activeDeviceId)
      if (device) {
        device.lastProfileId = profileId
        this.saveDevices()
      }
    }
  }

  getOrCreateDefaultProfile(deviceId?: string, deviceType?: string): Profile {
    let profile = this.activeProfile
    
    if (!profile && deviceId) {
      const deviceProfiles = this.getProfilesByDevice(deviceId)
      profile = deviceProfiles[0]
    }
    
    if (!profile) {
      profile = this.createProfile({
        name: '默认配置',
        deviceId: deviceId || null,
        deviceType: deviceType || null
      })
    }
    
    return profile
  }

  getDefaultConfig() {
    return defaultConfig
  }
}

export const ProfileManagerInst = ProfileManager.getInstance()
export { ProfileManager }
