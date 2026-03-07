<template>
  <div class="custom-node regulator" :class="{ selected: props.selected }">
    <NodeResizer :min-width="70" :min-height="50" />
    <NodeToolbar>
      <el-button size="small" @click="updateValue('SET')">设定</el-button>
    </NodeToolbar>
    <div class="label">{{ props.data?.label || '调压阀' }}</div>
    <div class="status">设定: {{ props.data?.setpoint || 'N/A' }} MPa</div>
  </div>
</template>

<script setup lang="ts">
import { NodeResizer } from '@vue-flow/node-resizer'
import { NodeToolbar } from '@vue-flow/node-toolbar'
import { ElButton } from 'element-plus'

const props = defineProps<{
  id: string
  selected: boolean
  data: {
    label?: string
    setpoint?: string
  }
}>()

const emit = defineEmits<{
  (e: 'update', id: string, value: string): void
}>()

function updateValue(value: string) {
  emit('update', props.id, value)
}
</script>

<style scoped>
@import './style.css';
</style>