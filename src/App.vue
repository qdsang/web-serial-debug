<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import SerialLog from './components/SerialLog.vue'
import PipelinePanel from './widgets/PipelinePanel/PipelinePanel.vue'
import ChartIMU from './widgets/ChartIMU/ChartIMU.vue'
import ChartRocket from './widgets/ChartRocket/ChartRocket.vue'
import Sim from './widgets/Sim/Sim.vue'
import ChartPanel from './widgets/ChartPanel/ChartPanel.vue'
import DataTable from './components/DataTable.vue'
import SerialQuickSend from './components/SerialQuickSend.vue'
import SerialScripts from './components/SerialScript.vue'
import CanvasPanel from './components/canvasPanel/CanvasPanel.vue'
import WorkspaceSelector from './components/WorkspaceSelector.vue'
import { useDark, useToggle } from '@vueuse/core'
import { useWorkspaceConfig } from './utils/useWorkspaceConfig'
// @ts-ignore
import { Splitpanes, Pane } from 'splitpanes'
import 'splitpanes/dist/splitpanes.css'
import { WorkspaceManagerInst } from './utils/ProfileManager'
import type { LayoutConfig } from './components/types'

const workspaceManager = WorkspaceManagerInst

onMounted(() => {
  const urlParams = new URLSearchParams(window.location.search)
  const workspaceId = urlParams.get('workspace')
  if (workspaceId) {
    const exists = workspaceManager.workspacesRef.value.some(w => w.id === workspaceId)
    if (exists) {
      workspaceManager.setActiveWorkspace(workspaceId)
    }
  }
})

const defaultLayoutConfig: LayoutConfig = {
  splitPaneSize: 75,
  leftActiveTab: '0',
  rightActiveTab: '0'
}

const { config: localLayoutConfig } = useWorkspaceConfig<LayoutConfig>('layout', defaultLayoutConfig)

const isDark = useDark({
  initialValue: 'dark',
  storage: localStorage
})
const toggleDark = useToggle(isDark)

const isFullscreen = ref(false)

const toggleFullscreen = () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen()
    isFullscreen.value = true
  } else {
    document.exitFullscreen()
    isFullscreen.value = false
  }
}

const handleSplitResize = (options: { size: number}[]) => {
  localLayoutConfig.value.splitPaneSize = options[0].size
  handleResize()
}

const handleTabChange = () => {
  handleResize()
}

let resizeTimer: ReturnType<typeof setTimeout>
const handleResize = () => {
  clearTimeout(resizeTimer)
  resizeTimer = setTimeout(() => {
    window.dispatchEvent(new CustomEvent('resize', { }))
  }, 100)
}
handleResize()

</script>

<template>
  <el-container class="app-container">
    <el-header class="app-header">
      <div class="header-content">
        <div class="header-left">
          <h1><a href="https://github.com/qdsang/web-serial-debug" target="_blank">Web Serial</a></h1>
          <WorkspaceSelector class="header-workspace-selector" />
        </div>
        <div class="header-links">
          <el-button
            class="theme-toggle"
            :icon="isDark ? 'Sunny' : 'Moon'"
            circle
            @click="toggleDark()"
          />
          <el-button
            class="fullscreen-toggle"
            :icon="'FullScreen'"
            circle
            @click="toggleFullscreen()"
          />
        </div>
      </div>
    </el-header>
    <el-container class="main-container">
      <Splitpanes class="default-theme" @resize="handleSplitResize">
        <Pane :size="localLayoutConfig.splitPaneSize" class="w75">
          <el-tabs type="card" class="lv-card lv-tabs" addable v-model="localLayoutConfig.leftActiveTab" @tab-click="handleTabChange">
            <el-tab-pane label="控制台">
              <SerialLog />
            </el-tab-pane>
            <el-tab-pane label="数据表" lazy>
              <DataTable />
            </el-tab-pane>
            <el-tab-pane label="姿态" lazy>
              <ChartIMU />
            </el-tab-pane>
            <el-tab-pane label="可视化" lazy>
              <ChartPanel />
            </el-tab-pane>
            <el-tab-pane label="流程图">
              <PipelinePanel />
            </el-tab-pane>
            <el-tab-pane label="模拟发射" lazy>
              <Sim />
            </el-tab-pane>
            <el-tab-pane label="水火箭" lazy>
              <ChartRocket />
            </el-tab-pane>
            <el-tab-pane label="画板" lazy>
              <CanvasPanel />
            </el-tab-pane>
          </el-tabs>
        </Pane>
        <Pane class="w25">
          <el-tabs type="card" class="lv-card lv-tabs" v-model="localLayoutConfig.rightActiveTab">
            <el-tab-pane label="快捷发送">
              <SerialQuickSend />
            </el-tab-pane>
            <el-tab-pane label="脚本">
              <SerialScripts />
            </el-tab-pane>
            <el-tab-pane label="设置">
            </el-tab-pane>
          </el-tabs>
        </Pane>
      </Splitpanes>
    </el-container>
  </el-container>
</template>

<style scoped>
.app-container {
  height: 100vh;
}

.app-header {
  background-color: var(--el-bg-color-overlay);
  padding: 0 20px;
  border-bottom: 1px solid var(--el-border-color-light);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  /* backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px); */
}

.header-content {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 24px;
}

.header-workspace-selector {
  margin-left: 8px;
}

.header-content h1 {
  color: var(--el-text-color-primary);
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0;
  background: linear-gradient(120deg, #6366f1 0%, #2dd4bf 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-fill-color: transparent;
  letter-spacing: -0.5px;
}

.header-serial-config {
  margin: 0;
  position: relative;
}

.header-serial-config :deep(.el-card) {
  background: transparent;
  border: none;
  box-shadow: none;
}

.header-serial-config :deep(.el-card .el-form) {
  display: flex;
  gap: 12px;
}

.header-serial-config :deep(.el-form-item__label) {
  color: var(--el-text-color-regular);
  font-weight: 500;
}

.header-serial-config :deep(.el-input__wrapper),
.header-serial-config :deep(.el-select .el-input__wrapper) {
  background-color: var(--el-bg-color);
  border: 1px solid var(--el-border-color);
  box-shadow: none;
  transition: all 0.2s;
}

.header-serial-config :deep(.el-input__wrapper:hover),
.header-serial-config :deep(.el-select .el-input__wrapper:hover) {
  border-color: var(--el-color-primary);
}

.header-links {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-links .el-button {
  border: 1px solid var(--el-border-color);
  transition: all 0.2s;
}

.header-links .el-button:hover {
  background: var(--el-color-primary-light-9);
  border-color: var(--el-color-primary);
  color: var(--el-color-primary);
}

.header-links a {
  color: var(--el-text-color-primary);
  text-decoration: none;
}

.header-links a:hover {
  color: var(--el-color-primary);
}

.main-container {
  width: 100%;
  height: calc(100vh - 60px);
  background-color: var(--el-bg-color-overlay);
}

.fullscreen-toggle {
  margin-left: 0px;
}

.lv-card {
  height: 100%;
}
.lv-card :deep(.el-tab-pane) {
  height: 100%;
}

:deep(.splitpanes__splitter) {
  background-color: var(--el-border-color) !important;
  border: none;
}

:deep(.splitpanes__pane) {
  background-color: transparent;
}
.w75 {
  width: 75%;
}
.w25 {
  width: 25%;
}
</style>
<style lang="less">
html {
  background-color: var(--el-bg-color-overlay);
}

html.dark .el-button {
  --el-button-divide-border-color: rgba(0, 0, 0, 0.5);
}

.lv-tabs {

  .el-tabs__content {
    flex: 1;
    overflow-y: auto;
  }

  &.el-tabs.el-tabs--top.el-tabs--card>.el-tabs__header .el-tabs__nav {
    border: 0 none;
  }
  &.el-tabs.el-tabs--top.el-tabs--card>.el-tabs__header .el-tabs__item {
    font-size: 12px;
    border: 0 none;
    border-radius: 4px;
    margin: 8px 0 0 8px;
    padding: 0px 6px;
    height: 24px;
    transition: all .1s;
    user-select:none;
  }
  &.el-tabs.el-tabs--top.el-tabs--card>.el-tabs__header .el-tabs__item.is-active {
    background-color: #f5f5f5;
    color: #191919;
  }
  .el-tabs__item.is-top {
    border: 0 none;
  }
  .el-tabs__item:hover {
    color: #999;
  }
  .el-tabs__header {
    margin: 0;
    align-items: flex-start;
  }
  .el-tab-pane {
    height: 100%;
  }
  .el-tabs__new-tab {
    margin-right: 10px;
  }
}

.dark {
  .dash-tabs {
    &.el-tabs.el-tabs--top.el-tabs--card>.el-tabs__header .el-tabs__item.is-active {
      background-color: #383838;
      color: #fff;
    }
  }
}

.el-card {
  --el-card-padding: 12px;
}
</style>
<style>
.splitpanes.default-theme .splitpanes__pane {
  background-color: var(--el-bg-color-overlay);
}
.dark .default-theme.splitpanes--vertical>.splitpanes__splitter, 
.dark .default-theme .splitpanes--vertical>.splitpanes__splitter {
  width: 4px;
  background-color: #333 !important;
  border-color: #333;
}
</style>
