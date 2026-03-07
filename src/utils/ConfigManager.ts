import { ref, watch } from 'vue'
import { getStorage, type StorageAdapter } from './StorageAdapter'
import { defaultSerialConfig, defaultWebSocketConfig } from '../devices/types'
import { defaultDisplayConfig, defaultSendConfig, defaultLayoutConfig } from '../components/types'

type ConfigKey = string

const defaultConfigs: Record<string, any> = {
  serial: defaultSerialConfig,
  websocket: defaultWebSocketConfig,
  display: defaultDisplayConfig,
  send: defaultSendConfig,
  layout: defaultLayoutConfig,
  charts: { list: [] },
  canvas: { items: [] }
}

export class ConfigManager {
  private static instance: ConfigManager
  private configs: Record<string, any> = {}
  private initialized = false

  private constructor() {}

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager()
    }
    return ConfigManager.instance
  }

  public init(): void {
    if (this.initialized) return
    
    const storage = getStorage()
    this.migrateLegacyConfigs(storage)
    
    for (const [key, defaultValue] of Object.entries(defaultConfigs)) {
      const savedValue = storage.get(`config.${key}`)
      this.configs[key] = savedValue ? { ...defaultValue, ...savedValue } : { ...defaultValue }
    }
    
    this.initialized = true
  }

  private migrateLegacyConfigs(storage: StorageAdapter): void {
    const legacyKeys = [
      'config.serial',
      'config.display',
      'config.send',
      'config.layout',
      'config.charts',
      'config.canvas',
      'config.websocket'
    ]

    for (const key of legacyKeys) {
      const newKey = key.replace('config.', '')
      const value = storage.get(newKey)
      if (!value) {
        try {
          const legacyValue = localStorage.getItem(key)
          if (legacyValue) {
            storage.set(newKey, JSON.parse(legacyValue))
            localStorage.removeItem(key)
          }
        } catch { /* ignore */ }
      }
    }
  }

  public getConfig<T = any>(key: string): T {
    if (!this.initialized) {
      this.init()
    }
    return this.configs[key] || defaultConfigs[key]
  }

  public setConfig<T = any>(key: string, value: Partial<T>): void {
    if (!this.initialized) {
      this.init()
    }
    
    this.configs[key] = { ...this.configs[key], ...value }
    const storage = getStorage()
    storage.set(`config.${key}`, this.configs[key])
  }

  public useConfig<T = any>(key: string) {
    if (!this.initialized) {
      this.init()
    }
    
    const config = ref(this.getConfig<T>(key))

    watch(config, (newValue) => {
      this.setConfig(key, newValue)
    }, { deep: true })

    return config
  }

  public resetConfig(key: string) {
    if (!this.initialized) {
      this.init()
    }
    this.configs[key] = { ...defaultConfigs[key] }
    const storage = getStorage()
    storage.set(`config.${key}`, this.configs[key])
  }

  public resetAllConfigs() {
    Object.keys(defaultConfigs).forEach(key => {
      this.resetConfig(key)
    })
  }
}
