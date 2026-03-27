<script setup lang="ts">
import { computed } from 'vue'
import CanvasChartPanel from '@/widgets/ChartPanel/CanvasChartPanel.vue'
import DataTable from '@/components/DataTable.vue'
import ChartIMU from '@/widgets/ChartIMU/ChartIMU.vue'
import PipelinePanel from '@/widgets/PipelinePanel/PipelinePanel.vue'
import Sim from '@/widgets/Sim/Sim.vue'
import ChartRocket from '@/widgets/ChartRocket/ChartRocket.vue'

interface Props {
  type: string
  config?: Record<string, any>
}

const props = withDefaults(defineProps<Props>(), {
  config: () => ({})
})

const componentMap: Record<string, any> = {
  'chart': CanvasChartPanel,
  'table': DataTable,
  '3d': ChartIMU,
  'pipeline': PipelinePanel,
  'sim': Sim,
  'rocket': ChartRocket
}

const widgetComponent = computed(() => {
  return componentMap[props.type] || null
})
</script>

<template>
  <div class="canvas-widget-wrapper">
    <component
      v-if="widgetComponent"
      :is="widgetComponent"
      :readonly="true"
      v-bind="config"
    />
    <div v-else class="unknown-widget">
      <el-empty description="未知组件类型" />
    </div>
  </div>
</template>

<style scoped lang="less">
.canvas-widget-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--el-bg-color);
  border-radius: 4px;
  overflow: hidden;
}

.unknown-widget {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
