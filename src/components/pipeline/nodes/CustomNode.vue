<template>
  <div class="custom-node" :class="{ selected: props.selected }">
    <NodeResizer :min-width="80" :min-height="100" />
    
    <!-- 动态生成连接桩 -->
    <Handle
      v-for="handle in props.data?.handles"
      :key="handle.id"
      :id="handle.id"
      :type="handle.type"
      :position="handle.position as any"
      class="handle"
    />

    <!-- 工具栏 -->
    <NodeToolbar v-if="props.data?.actions?.length">
      <el-button
        v-for="action in props.data.actions"
        :key="action.value"
        size="small"
        @click="updateValue(action.value)"
      >
        {{ action.label }}
      </el-button>
    </NodeToolbar>

    <!-- 标题 -->
    <div class="label">{{ props.data?.label || '自定义组件' }}</div>

    <!-- 数据字段 -->
    <div class="status">
      <div v-for="field in fieldData" :key="field.key">
        {{ field.label }}: {{ field.value || 'N/A' }} {{ field.unit }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { NodeResizer } from '@vue-flow/node-resizer'
import { NodeToolbar } from '@vue-flow/node-toolbar'
import { Handle } from '@vue-flow/core'
import { ElButton } from 'element-plus'
import { computed } from 'vue'
import { useFieldStore } from '../../../store/fieldStore'
import './style.css'

interface Action {
  label: string
  value: string
}

interface Handle {
  id: string
  type: 'source' | 'target'
  position: 'top' | 'right' | 'bottom' | 'left'
}

const props = defineProps<{
  id: string
  selected: boolean
  data: {
    label?: string
    fields?: string[]
    actions?: Action[]
    handles?: Handle[]
  }
}>()

const emit = defineEmits<{
  (e: 'update', id: string, value: string): void
}>()

const fieldStore = useFieldStore()

const fieldData = computed(() => {
  if (!props.data?.fields) return []
  return props.data.fields.map(key => {
    const field = fieldStore.fields.find(f => f.key === key)
    return field ? {
      key: field.key,
      label: field.name,
      value: field.value,
      unit: field.unit
    } : null
  }).filter(Boolean)
})

function updateValue(value: string) {
  emit('update', props.id, value)
}
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

.label {
  font-weight: bold;
  margin-bottom: 8px;
}

.status {
  font-size: 0.9em;
}

.status > div {
  margin: 4px 0;
}
</style>