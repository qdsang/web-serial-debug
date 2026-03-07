import { isDesktop } from './Platform'

export interface StorageAdapter {
  get<T>(key: string): T | null
  set<T>(key: string, value: T): void
  remove(key: string): void
  getAllKeys(): string[]
}

class LocalStorageAdapter implements StorageAdapter {
  private prefix = 'wssd.'

  get<T>(key: string): T | null {
    try {
      const value = localStorage.getItem(this.prefix + key)
      return value ? JSON.parse(value) : null
    } catch {
      return null
    }
  }

  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(value))
    } catch (error) {
      console.error('LocalStorage set error:', error)
    }
  }

  remove(key: string): void {
    localStorage.removeItem(this.prefix + key)
  }

  getAllKeys(): string[] {
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(this.prefix)) {
        keys.push(key.slice(this.prefix.length))
      }
    }
    return keys
  }
}

class FileStorageAdapter implements StorageAdapter {
  private basePath = ''

  async init(basePath: string): Promise<void> {
    this.basePath = basePath
  }

  get<T>(key: string): T | null {
    try {
      return (window as any).readConfig?.(this.getFilePath(key)) || null
    } catch {
      return null
    }
  }

  set<T>(key: string, value: T): void {
    try {
      (window as any).writeConfig?.(this.getFilePath(key), JSON.stringify(value, null, 2))
    } catch (error) {
      console.error('FileStorage set error:', error)
    }
  }

  remove(key: string): void {
    try {
      (window as any).removeConfig?.(this.getFilePath(key))
    } catch (error) {
      console.error('FileStorage remove error:', error)
    }
  }

  getAllKeys(): string[] {
    try {
      return (window as any).listConfigs?.(this.basePath) || []
    } catch {
      return []
    }
  }

  private getFilePath(key: string): string {
    return `${this.basePath}/${key}.json`
  }
}

class MemoryStorageAdapter implements StorageAdapter {
  private store = new Map<string, any>()

  get<T>(key: string): T | null {
    return this.store.get(key) ?? null
  }

  set<T>(key: string, value: T): void {
    this.store.set(key, value)
  }

  remove(key: string): void {
    this.store.delete(key)
  }

  getAllKeys(): string[] {
    return Array.from(this.store.keys())
  }
}

let storageAdapter: StorageAdapter

export function initStorage(): StorageAdapter {
  if (isDesktop()) {
    const adapter = new FileStorageAdapter()
    adapter.init('config')
    storageAdapter = adapter
  } else {
    storageAdapter = new LocalStorageAdapter()
  }
  return storageAdapter
}

export function getStorage(): StorageAdapter {
  if (!storageAdapter) {
    return initStorage()
  }
  return storageAdapter
}

export function getMemoryStorage(): StorageAdapter {
  return new MemoryStorageAdapter()
}
