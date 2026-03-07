export interface Profile {
  id: string
  name: string
  deviceId: string | null
  deviceType: string | null
  config: Record<string, any>
  createdAt: number
  updatedAt: number
}

export interface SavedDevice {
  id: string
  title: string
  type: string
  profileIds: string[]
  lastProfileId: string | null
}

export interface DeviceStore {
  savedDevices: SavedDevice[]
  activeDeviceId: string | null
  activeProfileId: string | null
}
