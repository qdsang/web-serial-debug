<script setup lang="ts">
import { computed, watch, onMounted, onUnmounted, ref } from 'vue'
import LineChart from './LineChart.vue'
import { useDataStore } from '@/store/dataStore'

interface Props {
  fields?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  fields: () => []
})

const dataStore = useDataStore()

const chartFields = computed(() => {
  const points = dataStore.dataPoints
  if (points.length === 0) return []
  if (props.fields.length > 0) return props.fields
  return Object.keys(points[0]?.values || {})
})

const chartData = computed((): number[][] => {
  const points = dataStore.dataPoints
  if (points.length === 0) {
    return [[0], [0]]
  }

  const timestamps = points.map(p => p.timestamp / 1000)
  const fields = chartFields.value

  const seriesData = fields.map(field =>
    points.map(p => p.values[field] ?? 0)
  )

  return [timestamps, ...seriesData]
})

const key = ref(0)

watch(() => props.fields, () => {
  key.value++
})

watch(() => dataStore.dataPoints.length, () => {
  key.value++
})
</script>

<template>
  <div class="canvas-chart-panel">
    <LineChart
      :key="key"
      :data="chartData"
      :fields="chartFields"
    />
  </div>
</template>

<style scoped>
.canvas-chart-panel {
  width: 100%;
  height: 100%;
}
</style>
