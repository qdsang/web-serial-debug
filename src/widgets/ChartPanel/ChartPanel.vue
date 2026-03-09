<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useFieldStore } from '../../store/fieldStore'
import LineChart from './LineChart.vue'
import { EventCenter, EventNames } from '../../utils/EventCenter'
import { ProfileManagerInst } from '../../utils/ProfileManager'

interface Props {
  readonly?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false
})

const emit = defineEmits<{
  'update:charts': [charts: any[]]
}>()

const eventCenter = EventCenter.getInstance()
const fieldStore = useFieldStore()
const profileManager = ProfileManagerInst

interface ChartConfig {
  id: number
  name: string
  fields: string[]
  data: number[][]
  timestamps: number[]
}

const chartConfig = computed(() => {
  const profile = profileManager.activeProfile
  return profile?.config?.charts as { list: any[] } | undefined
})

const defaultChartConfig = { list: [] }

const localChartConfig = computed({
  get: () => chartConfig.value || defaultChartConfig,
  set: (val: { list: any[] }) => {
    const profile = profileManager.activeProfile
    if (profile) {
      profileManager.updateProfile(profile.id, {
        config: {
          ...profile.config,
          charts: { ...val }
        }
      })
    }
  }
})

const charts = ref<ChartConfig[]>([])
let nextChartId = computed(() => {
  const maxId = charts.value.reduce((max, chart) => Math.max(max, chart.id), 0)
  return maxId + 1
})

const createChart = (name: string) => {
  const chart: ChartConfig = {
    id: nextChartId.value,
    name,
    fields: [],
    data: [[]],
    timestamps: []
  }
  charts.value.push(chart)
  saveChartsConfig()
  return chart
}

const resetChartData = (chartId: number) => {
  const chart = charts.value.find(c => c.id === chartId)
  if (!chart) return

  chart.data = [[]]
  chart.timestamps = []
  chart.fields.forEach(() => chart.data.push([]))
}

const saveChartsConfig = () => {
  const config = charts.value.map(chart => ({
    id: chart.id,
    name: chart.name,
    fields: chart.fields
  }))
  localChartConfig.value = { list: config }
}

const loadChartsConfig = () => {
  const config = localChartConfig.value.list || []
  if (!Array.isArray(config)) return

  config.forEach(chartData => {
    const chart = createChart(chartData.name)
    chart.id = chartData.id
    chartData.fields.forEach(field => addField(chart.id, field))
  })
}

const updateChartData = (data: any) => {
  if (typeof data !== 'object' || data === null) return

  const timestamp = Date.now()

  charts.value.forEach(chart => {
    if (chart.fields.length === 0) return

    chart.timestamps.push(timestamp/1000)
    let dataNum = 0
    const newData = [chart.timestamps, ...chart.fields.map((field, index) => {
      const value = data[field]
      let d1: number | undefined = undefined
      if (typeof value === 'number') {
        dataNum++
        d1 = value
      }
      chart.data[index + 1].push(d1 ?? undefined)
      return chart.data[index + 1]
    })]
    if (dataNum == 0) return

    chart.data = newData
  })
}

const handleTitleChange = () => {
  saveChartsConfig()
}

const handleFieldsChange = (chart: ChartConfig) => {
  chart.data = [chart.timestamps]
  chart.fields.forEach(() => chart.data.push([]))
  saveChartsConfig()
}

const addField = (chartId: number, field: string) => {
  const chart = charts.value.find(c => c.id === chartId)
  if (!chart) return

  if (chart.fields.includes(field)) {
    ElMessage.warning('该字段已添加到图表中')
    return
  }

  chart.fields.push(field)
  chart.data.push([])
  saveChartsConfig()
}

const removeChart = (chartId: number) => {
  const index = charts.value.findIndex(c => c.id === chartId)
  if (index === -1) return

  charts.value.splice(index, 1)
  saveChartsConfig()
}

const getConfig = () => {
  return {
    charts: charts.value.map(chart => ({
      id: chart.id,
      name: chart.name,
      fields: chart.fields
    }))
  }
}

const setConfig = (config: Record<string, any>) => {
  if (config.charts) {
    charts.value = []
    config.charts.forEach((chartData: any) => {
      const chart = createChart(chartData.name)
      chart.id = chartData.id
      chartData.fields?.forEach((field: string) => addField(chart.id, field))
    })
  }
}

defineExpose({
  getConfig,
  setConfig
})

onMounted(() => {
  loadChartsConfig()
  eventCenter.on(EventNames.DATA_UPDATE, updateChartData)
})

onUnmounted(() => {
  eventCenter.off(EventNames.DATA_UPDATE, updateChartData)
})
</script>

<template>
  <div class="chart-panel">
    <div class="chart-controls" v-if="!readonly">
      <el-button @click="createChart('新图表')" type="primary" size="small">
        添加图表
      </el-button>
    </div>
    <div class="charts-container">
      <div v-for="chart in charts" :key="chart.id" class="chart-item">
        <div class="chart-header">
          <el-input
            v-model="chart.name"
            size="small"
            placeholder="图表名称"
            class="chart-name-input"
            :readonly="readonly"
            @change="handleTitleChange"
          />
          <el-select
            v-model="chart.fields"
            multiple
            filterable
            placeholder="选择字段"
            size="small"
            style="min-width: 200px"
            :disabled="readonly"
            @change="handleFieldsChange(chart)"
          >
            <el-option
              v-for="field in fieldStore.fields.map(f => f.key)"
              :key="field"
              :label="field"
              :value="field"
            />
          </el-select>
          <el-button
            v-if="!readonly"
            @click="removeChart(chart.id)"
            type="danger"
            size="small"
            circle
          >
            <el-icon><Delete /></el-icon>
          </el-button>
          <el-button
            v-if="!readonly"
            @click="resetChartData(chart.id)"
            style="margin-left: 0"
            type="warning"
            size="small"
            circle
          >
            <el-icon><RefreshRight /></el-icon>
          </el-button>
        </div>
        <div class="chart-content">
          <LineChart
            :data="chart.data"
            :fields="chart.fields"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chart-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 12px;
}

.chart-controls {
  margin-bottom: 16px;
}

.charts-container {
  flex: 1;
}

.chart-item {
  background: var(--el-bg-color);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.chart-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.chart-name-input {
  max-width: 200px;
}

.chart-content {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-bottom: 20px;
  height: 300px;
}
</style>