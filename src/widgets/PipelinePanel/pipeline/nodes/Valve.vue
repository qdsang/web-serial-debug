<template>
  <div class="custom-node valve" :class="{ selected: props.selected, open: props.data?.value === 'OPEN' }">
    <NodeResizer :min-width="30" :min-height="20" />
    <Handle id="input" type="target" :position='"left" as any' class="handle" />
    <Handle id="output" type="source" :position='"right" as any' class="handle" />
    <NodeToolbar>
      <el-button size="small" @click="updateValue('OPEN')">开启</el-button>
      <el-button size="small" @click="updateValue('CLOSE')">关闭</el-button>
    </NodeToolbar>
    <div class="label">{{ props.data?.label || '阀门' }}</div>
    <div class="status">{{ props.data?.value || '关闭' }}</div>
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
    value?: string
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