import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface CanvasItem {
  id: number
  type: string
  x: number
  y: number
  w: number
  h: number
  i: string
  title?: string
  resizable?: boolean
}

export interface Dashboard {
  id: string
  name: string
  items: CanvasItem[]
}

export const useDashboardStore = defineStore('dashboard', () => {
  const dashboards = ref<Dashboard[]>([
    {
      id: 'default',
      name: '默认看板',
      items: []
    }
  ])

  const activeDashboardId = ref('default')

  const activeDashboard = computed(() => {
    return dashboards.value.find(d => d.id === activeDashboardId.value) || dashboards.value[0]
  })

  const addDashboard = (name: string) => {
    const id = `dashboard-${Date.now()}`
    dashboards.value.push({
      id,
      name,
      items: []
    })
    activeDashboardId.value = id
    return id
  }

  const removeDashboard = (id: string) => {
    if (dashboards.value.length <= 1) return false
    const index = dashboards.value.findIndex(d => d.id === id)
    if (index !== -1) {
      dashboards.value.splice(index, 1)
      if (activeDashboardId.value === id) {
        activeDashboardId.value = dashboards.value[0].id
      }
      return true
    }
    return false
  }

  const setActiveDashboard = (id: string) => {
    if (dashboards.value.some(d => d.id === id)) {
      activeDashboardId.value = id
    }
  }

  const updateDashboardItems = (id: string, items: CanvasItem[]) => {
    const dashboard = dashboards.value.find(d => d.id === id)
    if (dashboard) {
      dashboard.items = items
    }
  }

  const renameDashboard = (id: string, name: string) => {
    const dashboard = dashboards.value.find(d => d.id === id)
    if (dashboard) {
      dashboard.name = name
    }
  }

  return {
    dashboards,
    activeDashboardId,
    activeDashboard,
    addDashboard,
    removeDashboard,
    setActiveDashboard,
    updateDashboardItems,
    renameDashboard
  }
})
