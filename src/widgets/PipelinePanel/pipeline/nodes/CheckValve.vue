<template>
  <div class="custom-node check-valve" :class="{ selected: props.selected }">
    <NodeResizer :min-width="30" :min-height="20" />
    <Handle id="target" type="target" :position='"left" as any' class="handle" />
    <Handle id="source" type="source" :position='"right" as any' class="handle" />
    <div class="label">{{ props.data?.label || '单向阀' }}</div>
  </div>
</template>

<script setup lang="ts">
// @ts-ignore
import { NodeResizer } from '@vue-flow/node-resizer'
// @ts-ignore
import { Handle } from '@vue-flow/core'

const props = defineProps<{
  id: string
  selected: boolean
  data: {
    label?: string
  }
}>()
</script>

<style scoped>
.custom-node {
  padding: 10px;
  border-radius: 4px;
  text-align: center;
  background: var(--el-bg-color);
  border: 2px solid var(--el-color-primary);
  position: relative;
  width: 100%;
  height: 100%;
}

.custom-node.selected {
  border-color: var(--el-color-success);
  box-shadow: 0 0 8px var(--el-color-success);
}

.custom-node.check-valve {
  border-radius: 15px;
  transform: rotate(45deg);
}

.custom-node.check-valve .label {
  transform: rotate(-45deg);
}

.label {
  font-weight: bold;
  margin-bottom: 8px;
}

.handle {
  width: 10px;
  height: 10px;
  background: var(--el-color-primary);
  border: 2px solid var(--el-bg-color);
  border-radius: 50%;
  transition: all 0.3s;
}

.handle:hover {
  background: var(--el-color-success);
  transform: scale(1.2);
}
</style>