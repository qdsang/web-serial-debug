import type { Component } from 'vue'

export interface WidgetConfig {
  id: string
  type: string
  title: string
  x: number
  y: number
  w: number
  h: number
  readonly: boolean
  config: Record<string, any>
}

export interface WidgetType {
  name: string
  component: Component
  defaultWidth: number
  defaultHeight: number
  defaultConfig: Record<string, any>
}

export interface Dashboard {
  id: string
  name: string
  widgets: WidgetConfig[]
}

export interface WidgetRegistry {
  [key: string]: WidgetType
}

export const WIDGET_REGISTRY: WidgetRegistry = {
  chart: {
    name: '图表',
    component: null as unknown as Component,
    defaultWidth: 8,
    defaultHeight: 6,
    defaultConfig: {
      charts: []
    }
  },
  table: {
    name: '数据表',
    component: null as unknown as Component,
    defaultWidth: 8,
    defaultHeight: 6,
    defaultConfig: {}
  },
  imu3d: {
    name: '3D姿态',
    component: null as unknown as Component,
    defaultWidth: 8,
    defaultHeight: 6,
    defaultConfig: {
      modelType: 'arrow'
    }
  },
  pipeline: {
    name: '流程图',
    component: null as unknown as Component,
    defaultWidth: 12,
    defaultHeight: 8,
    defaultConfig: {}
  },
  sim: {
    name: '模拟发射',
    component: null as unknown as Component,
    defaultWidth: 12,
    defaultHeight: 8,
    defaultConfig: {}
  },
  rocket: {
    name: '水火箭',
    component: null as unknown as Component,
    defaultWidth: 12,
    defaultHeight: 8,
    defaultConfig: {}
  }
}
