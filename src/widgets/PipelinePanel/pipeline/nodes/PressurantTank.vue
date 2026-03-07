<template>
  <div class="custom-node tank pressurant" :class="{ selected: props.selected }">
    <NodeResizer :min-width="70" :min-height="90" />
    <Handle id="output" type="source" :position='"bottom" as any' class="handle" />
    <NodeToolbar>
      <el-button size="small" @click="updateValue('FILL')">充气</el-button>
      <el-button size="small" @click="updateValue('VENT')">排气</el-button>
    </NodeToolbar>
    <div class="label">{{ props.data?.label || '增压气罐' }}</div>
    <div class="status">
      <div>压力: {{ props.data?.pressure || 'N/A' }} MPa</div>
      <div>温度: {{ props.data?.temperature || 'N/A' }} ℃</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { NodeResizer } from '@vue-flow/node-resizer'
import { NodeToolbar } from '@vue-flow/node-toolbar'
import { Handle } from '@vue-flow/core'
import { ElButton } from 'element-plus'
import './style.css'

const props = defineProps<{
  id: string
  selected: boolean
  data: {
    label?: string
    pressure?: string
    temperature?: string
  }
}>()

const emit = defineEmits<{
  (e: 'update', id: string, value: string): void
}>()

function updateValue(value: string) {
  emit('update', props.id, value)
}
</script>

<style scoped></style>