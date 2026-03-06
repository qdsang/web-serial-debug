<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  title?: string
  readonly?: boolean
  showHeader?: boolean
  showActions?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  readonly: false,
  showHeader: true,
  showActions: true
})

const emit = defineEmits<{
  config: [config: Record<string, any>]
}>()

const hasActions = computed(() => props.showActions && !props.readonly)

defineExpose({
  getConfig: () => ({}),
  setConfig: (_config: Record<string, any>) => {}
})
</script>

<template>
  <div class="widget-wrapper" :class="{ 'readonly': readonly }">
    <div class="widget-header" v-if="showHeader">
      <span class="widget-title">{{ title }}</span>
      <div class="widget-actions" v-if="hasActions">
        <slot name="actions" />
      </div>
    </div>
    <div class="widget-content">
      <slot />
    </div>
  </div>
</template>

<style scoped lang="less">
.widget-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--el-bg-color);
  border-radius: 4px;
  overflow: hidden;

  &.readonly {
    .widget-header {
      cursor: default;
      &:hover {
        background-color: transparent;
      }
    }
  }
}

.widget-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 8px;
  border-bottom: 1px solid var(--el-border-color);
  background: var(--el-bg-color-overlay);
  border-radius: 4px 4px 0 0;
  cursor: move;
  height: 28px;
  flex-shrink: 0;
}

.widget-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--el-text-color-primary);
  flex: 1;
  text-align: center;
  margin-right: 24px;
}

.widget-actions {
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  gap: 4px;
}

.widget-content {
  flex: 1;
  overflow: hidden;
  position: relative;
}
</style>
