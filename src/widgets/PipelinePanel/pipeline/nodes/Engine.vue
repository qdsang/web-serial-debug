<template>
  <div class="custom-node engine" :class="{ selected: props.selected }">
    <NodeResizer :min-width="100" :min-height="120" />
    <Handle id="fuel" type="target" :position='"left" as any' class="handle" />
    <Handle id="oxidizer" type="source" :position='"right" as any' class="handle" />

    <NodeToolbar>
      <el-button size="small" @click="updateValue('START')">点火</el-button>
      <el-button size="small" @click="updateValue('SHUTDOWN')">关机</el-button>
      <el-button size="small" @click="updateValue('PURGE')">吹洗</el-button>
    </NodeToolbar>
    <div class="label">{{ props.data?.label || '推进器' }}</div>
    <div class="status">
      <div>推力: {{ props.data?.thrust || 'N/A' }} kN</div>
      <div>室压: {{ props.data?.chamber_pressure || 'N/A' }} MPa</div>
      <div>混比: {{ props.data?.mixture_ratio || 'N/A' }}</div>
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
    thrust?: string
    chamber_pressure?: string
    mixture_ratio?: string
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