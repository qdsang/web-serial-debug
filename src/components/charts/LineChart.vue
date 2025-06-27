<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import uPlot from 'uplot'
import 'uplot/dist/uPlot.min.css'
import { useDark } from '@vueuse/core'

interface Props {
  data: number[][]
  fields: string[]
  height?: number
}

const props = withDefaults(defineProps<Props>(), {
  height: 300
})

const emit = defineEmits<{
  (e: 'reset'): void
}>()

const container = ref<HTMLElement | null>(null)
const chart = ref<uPlot | null>(null)
const isDark = useDark()

const darkTheme = {
  background: '#1e1e1e',
  gridColor: '#2c2c2c',
  textColor: '#d4d4d4',
  lineColors: ['#4a9eff', '#ff4a4a', '#4aff4a', '#ffd700', '#ff4aff', '#4affff']
}

const lightTheme = {
  background: '#ffffff',
  gridColor: '#f0f0f0',
  textColor: '#333333',
  lineColors: ['#3366ff', '#ff3333', '#33ff33', '#ffcc00', '#ff33ff', '#33ffff']
}

const currentTheme = computed(() => isDark.value ? darkTheme : lightTheme)

const initUplot = () => {
  if (!container.value) return

  const opts = {
    width: container.value.clientWidth || 200,
    height: props.height,
    cursor: {
      sync: {
        key: 0,
      }
    },
    series: [
      {
        label: 'Time',
        value: (_: number, v: number) => {
          if(!v) return '--';
          let d = new Date(v * 1000);
          return d.toLocaleString() + '.' + d.getMilliseconds()
        }
      },
      ...props.fields.map((field, i) => ({
        label: field,
        stroke: currentTheme.value.lineColors[i % currentTheme.value.lineColors.length]
      }))
    ],
    axes: [
      {
        stroke: currentTheme.value.textColor,
        grid: { stroke: currentTheme.value.gridColor }
      },
      {
        stroke: currentTheme.value.textColor,
        grid: { stroke: currentTheme.value.gridColor }
      }
    ],
    scales: {
      x: { time: true }
    }
  }

  chart.value = new uPlot(opts, props.data, container.value)
}

const handleResize = () => {
  if (chart.value && container.value) {
    let w = container.value.clientWidth
    w && chart.value.setSize({
      width: w,
      height: chart.value.height
    })
  }
}

watch(() => props.data, (newData) => {
  if (chart.value) {
    chart.value.setData(newData)
  }
}, { deep: true })

watch(() => props.fields, () => {
  if (chart.value) {
    chart.value.destroy()
    initUplot()
  }
})

onMounted(() => {
  initUplot()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (chart.value) {
    chart.value.destroy()
  }
})
</script>

<template>
  <div class="line-chart">
    <div ref="container" class="chart-container"></div>
  </div>
</template>

<style scoped>
.line-chart {
  width: 100%;
  height: 100%;
}

.chart-container {
  width: 100%;
  height: 100%;
}
</style>