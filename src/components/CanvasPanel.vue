<script setup lang="ts">
import { ref } from 'vue'
import { ConfigManager } from '../utils/ConfigManager'
import ChartPanel from './ChartPanel.vue'
import DataTable from './DataTable.vue'
import ChartIMU from './ChartIMU.vue'
import TimeRangeControl from './TimeRangeControl.vue'
import { useDark } from '@vueuse/core'
import { GridLayout, GridItem } from 'grid-layout-plus'
import { useDataStore } from '../store/dataStore'
import { EventCenter, EventNames } from '../utils/EventCenter'

const configManager = ConfigManager.getInstance()
const canvasConfig = configManager.useConfig('canvas')
const dataStore = useDataStore()
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

const items = ref<CanvasItem[]>(canvasConfig.value?.items?.map(item => ({
  id: item.id,
  type: item.type,
  x: Math.floor(item.x / 50),
  y: Math.floor(item.y / 50),
  w: Math.ceil(item.width / 50),
  h: Math.ceil(item.height / 50),
  i: item.id.toString(),
  title: getDefaultTitle(item.type),
  resizable: componentConfigs[item.type]?.resizable
})) || [])

const isDark = useDark()

const componentMap = {
  'chart': ChartPanel,
  'table': DataTable,
  '3d': ChartIMU
} as Record<string, any>

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
    resizable: config.resizable
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
  const savedItems = items.value.map(item => ({
    id: item.id,
    type: item.type,
    x: item.x * 50,
    y: item.y * 50,
    width: item.w * 50,
    height: item.h * 50,
    title: item.title
  }))
  configManager.setConfig('canvas', { items: savedItems })
}

const handleResize = () => {
  window.dispatchEvent(new CustomEvent('resize'))
}

// @ts-ignore
const editItem = (item: CanvasItem) => {
  // TODO: 实现编辑功能
}

// @ts-ignore
const viewItem = (item: CanvasItem) => {
  // TODO: 实现查看功能
}
</script>

<template>
  <div class="canvas-panel">
    <div class="toolbar">
      <el-button-group class="tool-group">
        <el-button type="primary" size="small" @click="addComponent('row')">添加行</el-button>
        <el-button type="primary" size="small" @click="addComponent('chart')">添加图表</el-button>
        <el-button type="primary" size="small" @click="addComponent('table')">添加数据表</el-button>
        <el-button type="primary" size="small" @click="addComponent('3d')">添加3D视图</el-button>
      </el-button-group>
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
                  <el-dropdown-item @click="editItem(item)">
                    <el-icon><edit /></el-icon>编辑
                  </el-dropdown-item>
                  <el-dropdown-item @click="viewItem(item)">
                    <el-icon><view /></el-icon>查看
                  </el-dropdown-item>
                  <el-dropdown-item @click="removeItem(item.id)" divided>
                    <el-icon><delete /></el-icon>删除
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
          <div class="item-content">
            <component :is="componentMap[item.type]" />
          </div>
        </grid-item>
      </grid-layout>
      <TimeRangeControl class="time-range-control" />
    </div>
  </div>
</template>

<style scoped lang="less">
.canvas-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--el-bg-color);
}

.toolbar {
  padding: 12px;
  border-bottom: 1px solid var(--el-border-color);
  background: var(--el-bg-color-overlay);
}

.tool-group {
  display: flex;
  gap: 8px;
}

.canvas-container {
  flex: 1;
  position: relative;
  overflow: auto;
  padding: 10px;
}

.canvas-item {
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color);
  border-radius: 3px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
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
    background-color: #141619;
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
  position: sticky;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 100;
}
</style>