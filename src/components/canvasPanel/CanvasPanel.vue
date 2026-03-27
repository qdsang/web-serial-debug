<script setup lang="ts">
import { ref, watch, computed, nextTick } from 'vue'
import TimeRangeControl from './TimeRangeControl.vue'
import DashboardManager from './DashboardManager.vue'
import CanvasWidgetWrapper from './CanvasWidgetWrapper.vue'
import CanvasItemConfigDialog from './CanvasItemConfigDialog.vue'
import { useDark } from '@vueuse/core'
import { GridLayout, GridItem } from 'grid-layout-plus'
import { useDataStore } from '@/store/dataStore'
import { useDashboardStore } from '@/store/dashboardStore'
import { EventCenter, EventNames } from '@/utils/EventCenter'
import { ProfileManagerInst } from '@/utils/ProfileManager'
import type { CanvasConfig } from '../types'

const profileManager = ProfileManagerInst

const canvasConfig = computed(() => {
  const profile = profileManager.activeProfile
  return profile?.config?.canvas as CanvasConfig | undefined
})

const defaultCanvasConfig: CanvasConfig = { items: [] }

const localCanvasConfig = computed({
  get: () => canvasConfig.value || defaultCanvasConfig,
  set: (val: CanvasConfig) => {
    const profile = profileManager.activeProfile
    if (profile) {
      profileManager.updateProfile(profile.id, {
        config: {
          ...profile.config,
          canvas: { ...val }
        }
      })
    }
  }
})
const dataStore = useDataStore()
const dashboardStore = useDashboardStore()
const eventCenter = EventCenter.getInstance()

// 监听数据更新事件
eventCenter.on(EventNames.DATA_UPDATE, (data: any) => {
  const timestamp = Date.now()
  const values: Record<string, number> = {}
  Object.entries(data).forEach(([key, value]) => {
    if (typeof value === 'number') {
      values[key] = value
    }
  })
  dataStore.addDataPoint(timestamp, values)
})

interface CanvasItem {
  id: number
  type: string
  x: number
  y: number
  w: number
  h: number
  i: string
  title?: string
  resizable?: boolean
  config?: Record<string, any>
}

interface ComponentConfig {
  width: number
  height: number
  resizable: boolean
  title: string
}

const componentConfigs = {
  'chart': {
    width: 8,
    height: 6,
    resizable: true,
    title: '图表'
  },
  'table': {
    width: 8,
    height: 6,
    resizable: true,
    title: '数据表'
  },
  '3d': {
    width: 8,
    height: 6,
    resizable: true,
    title: '3D视图'
  },
  'pipeline': {
    width: 12,
    height: 8,
    resizable: true,
    title: '流程图'
  },
  'sim': {
    width: 12,
    height: 8,
    resizable: true,
    title: '模拟发射'
  },
  'rocket': {
    width: 12,
    height: 8,
    resizable: true,
    title: '水火箭'
  },
  'row': {
    width: 24,
    height: 1,
    resizable: false,
    title: '行'
  }
} as Record<string, ComponentConfig>

const getDefaultTitle = (type: string) => {
  return componentConfigs[type]?.title || '未命名'
}

const loadItemsFromConfig = () => {
  const configItems = localCanvasConfig.value?.items
  if (!configItems || !Array.isArray(configItems)) {
    return []
  }
  
  setTimeout(() => {
    handleResize()
  }, 100)

  return configItems.map((item: any) => {
    const x = typeof item.x === 'number' ? Math.floor(item.x / 50) : 0
    const y = typeof item.y === 'number' ? Math.floor(item.y / 50) : 0
    const w = typeof item.width === 'number' ? Math.ceil(item.width / 50) : 4
    const h = typeof item.height === 'number' ? Math.ceil(item.height / 50) : 4
    
    return {
      id: item.id,
      type: item.type,
      x,
      y,
      w,
      h,
      i: item.id?.toString() || Math.random().toString(),
      title: item.title || getDefaultTitle(item.type),
      resizable: componentConfigs[item.type]?.resizable,
      config: item.config || {}
    }
  })
}

const items = ref<CanvasItem[]>(loadItemsFromConfig())

let ignoreWatch = false

watch(() => profileManager.activeProfile, () => {
  if (ignoreWatch) return
  ignoreWatch = true
  items.value = loadItemsFromConfig()
  nextTick(() => { ignoreWatch = false })
})

const isDark = useDark()

const addComponent = (type: string) => {
  const id = Date.now()
  const config = componentConfigs[type]
  const newItem: CanvasItem = {
    id,
    type,
    x: 0,
    y: 0,
    w: config.width,
    h: config.height,
    i: id.toString(),
    title: config.title,
    resizable: config.resizable,
    config: {}
  }
  items.value.push(newItem)
  saveLayout()
}

// @ts-ignore
const onLayoutChange = (layout: any[]) => {
  saveLayout()
}

const removeItem = (id: number) => {
  const index = items.value.findIndex(item => item.id === id)
  if (index !== -1) {
    items.value.splice(index, 1)
    saveLayout()
  }
}

const saveLayout = () => {
  ignoreWatch = true
  const savedItems = items.value.map(item => ({
    id: item.id,
    type: item.type,
    x: item.x * 50,
    y: item.y * 50,
    width: item.w * 50,
    height: item.h * 50,
    title: item.title,
    config: item.config
  }))
  localCanvasConfig.value = { items: savedItems }
  nextTick(() => { ignoreWatch = false })
}

const handleResize = () => {
  window.dispatchEvent(new CustomEvent('resize'))
}

const editDialogVisible = ref(false)
const editingItem = ref<CanvasItem | null>(null)

const editItem = (item: CanvasItem) => {
  editingItem.value = { ...item }
  editDialogVisible.value = true
}

const saveEdit = () => {
  if (editingItem.value) {
    const index = items.value.findIndex(i => i.id === editingItem.value!.id)
    if (index !== -1) {
      items.value[index] = { ...editingItem.value }
      saveLayout()
    }
  }
  editDialogVisible.value = false
}

// @ts-ignore
const viewItem = (item: CanvasItem) => {
  // TODO: 实现查看功能
}

const configDialogVisible = ref(false)
const configItem = ref<{
  id: number
  type: string
  title: string
  config?: Record<string, any>
} | null>(null)

const openConfigDialog = (item: CanvasItem) => {
  configItem.value = {
    id: item.id,
    type: item.type,
    title: item.title || '',
    config: item.config || {}
  }
  configDialogVisible.value = true
}

const saveItemConfig = (updatedItem: any) => {
  const index = items.value.findIndex(i => i.id === updatedItem.id)
  if (index !== -1) {
    items.value[index] = {
      ...items.value[index],
      title: updatedItem.title,
      config: updatedItem.config
    }
    saveLayout()
  }
}
</script>

<template>
  <div class="canvas-panel">
    <div class="toolbar">
      <div class="toolbar-left">
        <el-button-group class="tool-group">
          <el-button type="primary" size="small" @click="addComponent('row')">添加行</el-button>
          <el-button type="primary" size="small" @click="addComponent('chart')">图表</el-button>
          <el-button type="primary" size="small" @click="addComponent('table')">数据表</el-button>
          <el-button type="primary" size="small" @click="addComponent('3d')">3D姿态</el-button>
          <el-button type="primary" size="small" @click="addComponent('pipeline')">流程图</el-button>
          <el-button type="primary" size="small" @click="addComponent('sim')">模拟发射</el-button>
          <el-button type="primary" size="small" @click="addComponent('rocket')">水火箭</el-button>
        </el-button-group>
      </div>
      <div class="toolbar-right">
        <DashboardManager />
      </div>
    </div>
    <div class="canvas-container" :class="{ 'dark': isDark }">
      <grid-layout
        v-model:layout="items"
        :col-num="24"
        :row-height="50"
        :is-draggable="true"
        :is-resizable="true"
        :vertical-compact="true"
        :use-css-transforms="true"
        :margin="[10, 10]"
        @layout-updated="onLayoutChange"
      >
        <grid-item
          v-for="item in items"
          :key="item.i"
          :x="item.x"
          :y="item.y"
          :w="item.w"
          :h="item.h"
          :i="item.i"
          class="canvas-item"
          :class="{ 'row-item': item.type === 'row' }"
          :handle="'.item-header'"
          :resizable="item.resizable"
          @resize="handleResize"
        >
          <div class="item-header">
            <span class="item-title">{{ item.title }}</span>
            <el-dropdown trigger="click">
              <el-button class="menu-btn" text>
                <el-icon><more /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="openConfigDialog(item)">
                    <el-icon><setting /></el-icon>配置
                  </el-dropdown-item>
                  <el-dropdown-item @click="removeItem(item.id)" divided>
                    <el-icon><delete /></el-icon>删除
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
          <div class="item-content">
            <CanvasWidgetWrapper :type="item.type" :config="item.config" />
          </div>
        </grid-item>
      </grid-layout>
      <TimeRangeControl class="time-range-control" />
    </div>

    <CanvasItemConfigDialog
      v-model:visible="configDialogVisible"
      :item="configItem"
      @save="saveItemConfig"
    />
  </div>
</template>

<style scoped lang="less">
.canvas-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--el-bg-color);
  padding-bottom: 140px;
}

.toolbar {
  padding: 12px;
  border-bottom: 1px solid var(--el-border-color);
  background: var(--el-bg-color-overlay);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.toolbar-left {
  flex: 1;
}

.toolbar-right {
  flex-shrink: 0;
}

.tool-group {
  display: flex;
  gap: 8px;
}

.canvas-container {
  flex: 1;
  position: relative;
  overflow: auto;
  padding: 0;
}

.canvas-item {
  background: var(--el-bg-color-overlay);
  border: 1px solid var(--el-border-color);
  border-radius: 3px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
}

:deep(.vgl-item) {
  transition: 0s ease;
}
:deep(.vgl-item--placeholder) {
  background-color: #444;
  border: 1px solid black;
}


.item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 8px;
  /* background: var(--el-bg-color-overlay); */
  border-radius: 4px 4px 0 0;
  cursor: move;
  height: 28px;
  transition: background-color .1s ease-in-out;
}

.item-header:hover {
  background-color: #f5f5f5;
}

:deep(.dark) {
  .canvas-item {
    // background-color: #141619;
    border: 1px solid #202226;
  }
  .item-header:hover {
    background-color: #202226;
  }
}

.item-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--el-text-color-primary);
  flex: 1;
  text-align: center;
  margin-right: 24px;
  cursor: pointer;
}

.menu-btn {
  padding: 2px;
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
}

.item-content {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.time-range-control {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 100;
}
</style>