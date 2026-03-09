export interface QuickSendItem {
  id: number
  name: string
  content: string
  type: 'text' | 'hex'
  addCRLFType: string
}

export interface QuickSendGroup {
  id: number
  name: string
  items: QuickSendItem[]
}

export interface DisplayConfig {
  showTime: boolean
  showMs: boolean
  showHex: boolean
  showText: boolean
  showNewline: boolean
  autoScroll: boolean
  timeOut: number
}

export interface SendConfig {
  isHexSend: boolean
  addCRLF: boolean
  addCRLFType: string
  autoSend: boolean
  autoSendInterval: number
  addChecksum: boolean
  content: string
  history: string[]
  historyMaxLength: number
}

export interface Script {
  id: string
  name: string
  content: string
  language?: string
}

export interface LayoutConfig {
  splitPaneSize: number
  leftActiveTab: string
  rightActiveTab: string
}

export interface ChartConfig {
  id: number
  name: string
  fields: string[]
}

export interface CanvasConfig {
  items: {
    id: number
    type: string
    x: number
    y: number
    width: number
    height: number
  }[]
}

export const defaultChartConfig: { list: ChartConfig[] } = {
  list: []
}

export const defaultCanvasConfig: CanvasConfig = {
  items: []
}

export const defaultDisplayConfig: DisplayConfig = {
  showTime: true,
  showMs: false,
  showHex: true,
  showText: true,
  showNewline: true,
  autoScroll: false,
  timeOut: 5
}

export const defaultSendConfig: SendConfig = {
  isHexSend: false,
  addCRLF: false,
  addCRLFType: '\n',
  autoSend: false,
  autoSendInterval: 1000,
  addChecksum: false,
  content: '',
  history: [],
  historyMaxLength: 100
}

export const defaultLayoutConfig: LayoutConfig = {
  splitPaneSize: 75,
  leftActiveTab: '0',
  rightActiveTab: '0'
}
