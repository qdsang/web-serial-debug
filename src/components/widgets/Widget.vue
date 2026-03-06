<script setup lang="ts">
import { ref, computed, provide, onMounted } from 'vue'
import WidgetWrapper from './WidgetWrapper.vue'
import type { WidgetConfig } from './types'

interface Props {
  config: WidgetConfig
}

const props = defineProps<Props>()

const widgetRef = ref<any>(null)

const internalConfig = ref<Record<string, any>>({ ...props.config.config })

const emit = defineEmits<{
  'update:config': [config: Record<string, any>]
  'ready': [ref: any]
}>()

const mergedConfig = computed(() => ({
  ...props.config,
  config: internalConfig.value
}))

provide('widgetConfig', mergedConfig)
provide('readonly', props.config.readonly)

const getConfig = () => {
  return {
    ...props.config,
    config: widgetRef.value?.getConfig ? widgetRef.value.getConfig() : internalConfig.value
  }
}

const setConfig = (config: Record<string, any>) => {
  internalConfig.value = { ...internalConfig.value, ...config }
  if (widgetRef.value?.setConfig) {
    widgetRef.value.setConfig(config)
  }
  emit('update:config', internalConfig.value)
}

defineExpose({
  getConfig,
  setConfig
})

onMounted(() => {
  emit('ready', {
    getConfig,
    setConfig
  })
})
</script>

<template>
  <WidgetWrapper
    :title="config.title"
    :readonly="config.readonly"
  >
    <component
      :is="$attrs.component"
      ref="widgetRef"
      v-bind="internalConfig"
      :readonly="config.readonly"
    />
  </WidgetWrapper>
</template>
