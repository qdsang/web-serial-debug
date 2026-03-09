<script setup lang="ts">
import { SerialHelper } from '../utils/SerialHelper'
import { ElMessage } from 'element-plus'
import { ref, watch, onMounted } from 'vue'
import { useDebounceFn } from '@vueuse/core'

import { EventCenter, EventNames } from '../utils/EventCenter'
import { WorkspaceManagerInst } from '../utils/ProfileManager'
import type { SendConfig } from './types'

const eventCenter = EventCenter.getInstance()
const workspaceManager = WorkspaceManagerInst

const defaultSendConfig: SendConfig = {
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

const sendConfig = ref<SendConfig>({ ...defaultSendConfig })

const loadFromProfile = () => {
  const workspace = workspaceManager.activeWorkspace
  if (workspace?.config?.send) {
    sendConfig.value = { ...workspace.config.send as SendConfig }
  }
}

const saveToProfile = useDebounceFn(() => {
  const workspace = workspaceManager.activeWorkspace
  if (workspace) {
    workspaceManager.updateWorkspace(workspace.id, {
      config: {
        ...workspace.config,
        send: { ...sendConfig.value }
      }
    })
  }
}, 300)

let lastWorkspaceId: string | null = null

onMounted(() => {
  loadFromProfile()
  lastWorkspaceId = workspaceManager.activeWorkspaceIdRef.value || null
  
  workspaceManager.onWorkspaceChange(() => {
    if (workspaceManager.activeWorkspaceIdRef.value !== lastWorkspaceId) {
      lastWorkspaceId = workspaceManager.activeWorkspaceIdRef.value
      loadFromProfile()
    }
  })
})

watch(sendConfig, () => {
  saveToProfile()
}, { deep: true })

let autoSendTimer: number | null = null
const serialHelper = SerialHelper.getInstance()

const sendData = () => {
  try {
    let content = sendConfig.value.content
    if (sendConfig.value.addCRLF) {
      content += sendConfig.value.addCRLFType
    }

    let data = serialHelper.stringToUint8Array(content, sendConfig.value.isHexSend)
    if (sendConfig.value.addChecksum) {
      data = serialHelper.appendChecksum(data)
    }
    eventCenter.emit(EventNames.SERIAL_SEND, data)
    
    if (content && !sendConfig.value.history.includes(sendConfig.value.content)) {
      sendConfig.value.history.unshift(sendConfig.value.content)
      if (sendConfig.value.history.length > sendConfig.value.historyMaxLength) {
        sendConfig.value.history.pop()
      }
    }
  } catch (error) {
    console.error('发送数据时出错:', error)
    ElMessage.error('发送数据时出错' + error)
    eventCenter.emit(EventNames.SERIAL_ERROR, { message: error instanceof Error ? error.message : '发送数据时出错' })
    return false
  }
  return true
}

const toggleAutoSend = () => {
  if (sendConfig.value.autoSend) {
    autoSendTimer = window.setInterval(() => {
      if (!sendData()) {
        if (autoSendTimer) {
          clearInterval(autoSendTimer)
          autoSendTimer = null
        }
        sendConfig.value.autoSend = false
      }
    }, sendConfig.value.autoSendInterval)
  } else if (autoSendTimer) {
    clearInterval(autoSendTimer)
    autoSendTimer = null
  }
}

const handleIntervalChange = (value: number) => {
  sendConfig.value.autoSendInterval = value
  if (sendConfig.value.autoSend && autoSendTimer) {
    clearInterval(autoSendTimer)
    autoSendTimer = window.setInterval(sendData, value)
  }
}

let historyIndex = -1

const handleKeyDown = (e: KeyboardEvent) => {
  if (!e.metaKey && !e.ctrlKey && !e.shiftKey && e.key === 'Enter') {
    sendData()
    historyIndex = -1
    e.preventDefault()
    return false
  }

  const target = e.target as HTMLTextAreaElement
  if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
    const cursorPosition = target.selectionStart
    const contentBeforeCursor = sendConfig.value.content.slice(0, cursorPosition)
    const isFirstLine = !contentBeforeCursor.includes('\n')
    if (historyIndex == -1 && !isFirstLine) {
      return
    }
  } else {
    historyIndex = -1
  }

  if (e.key === 'ArrowUp') {
    e.preventDefault()
    if (historyIndex === -1 && sendConfig.value.content.trim() && 
        !sendConfig.value.history.includes(sendConfig.value.content)) {
      sendConfig.value.history.unshift(sendConfig.value.content)
      if (sendConfig.value.history.length > sendConfig.value.historyMaxLength) {
        sendConfig.value.history.pop()
      }
    }
    if (sendConfig.value.history.length > 0) {
      historyIndex = Math.min(historyIndex + 1, sendConfig.value.history.length - 1)
      sendConfig.value.content = sendConfig.value.history[historyIndex]
      target.selectionStart = target.selectionEnd = 0
    }
  } else if (e.key === 'ArrowDown') {
    e.preventDefault()
    if (historyIndex > -1) {
      historyIndex--
      sendConfig.value.content = historyIndex === -1 ? '' : sendConfig.value.history[historyIndex]
      target.selectionStart = target.selectionEnd = 0
    }
  }
}
</script>

<template>
  <div class="serial-send">
    <div class="controls">
      <el-switch v-model="sendConfig.isHexSend" active-text="HEX" inactive-text="TEXT" class="me-2" />
      <div class="me-2" style="display: inline-block;">
        <el-checkbox v-model="sendConfig.addCRLF" label="" class="" style="vertical-align: middle;" />
        <el-select v-model="sendConfig.addCRLFType" size="small" style="width: 80px;" @change="sendConfig.addCRLF = true">
          <el-option :value="'\r\n'" label="CRLF(\r\n)" />
          <el-option :value="'\r'" label="CR(\r)" />
          <el-option :value="'\n'" label="LF(\n)" />
          <el-option :value="'\n\n'" label="LF2(\n\n)" />
        </el-select>
      </div>
      <el-checkbox v-model="sendConfig.addChecksum" label="校验和" class="me-2" />
      <el-checkbox v-model="sendConfig.autoSend" @change="toggleAutoSend" label="自动发送" class="me-2" />
      <el-input-number v-model="sendConfig.autoSendInterval" :step="100" @change="handleIntervalChange" size="small" class="me-2" title="自动发送时间间隔">
        <template #suffix>
          <span>ms</span>
        </template>
      </el-input-number>
      <el-button type="primary" @click="sendData" class="me-2">发送</el-button>
    </div>
    <div class="send-content">
      <el-input
        v-model="sendConfig.content"
        type="textarea"
        :rows="5"
        :placeholder="sendConfig.isHexSend ? '请输入HEX格式数据，如：AA BB CC 11 22' : '请输入要发送的文本'"
        @keydown="handleKeyDown"
      />
    </div>
  </div>
</template>

<style scoped>
.serial-send {
}

.controls {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  border-top: 1px solid var(--el-border-color-light);
}

.send-content {
}

.me-2 {
  margin-right: 0;
}
</style>
