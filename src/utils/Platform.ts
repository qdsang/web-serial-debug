export type Platform = 'browser' | 'desktop'

export const isDesktop = (): boolean => {
  return typeof window !== 'undefined' && typeof (window as any).initSerial === 'function'
}

export const isBrowser = (): boolean => {
  return typeof navigator !== 'undefined' && typeof navigator.serial !== 'undefined'
}

export const getPlatform = (): Platform => {
  if (isDesktop()) {
    return 'desktop'
  }
  return 'browser'
}

export const platform = getPlatform()
