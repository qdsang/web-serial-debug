<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useDataStore } from '@/store/dataStore'

interface Props {
  visible: boolean
  item: {
    id: number
    type: string
    title: string
    config?: Record<string, any>
  } | null
}

interface Emit {
  'update:visible': [val: boolean]
  'save': [item: any]
}

const props = defineProps<Props>()
const emit = defineEmits<Emit>()

const dataStore = useDataStore()

const localItem = ref<any>(null)

const availableFields = computed(() => {
  const fieldSet = new Set<string>()
  dataStore.dataPoints.forEach(point => {
    Object.keys(point.values).forEach(key => fieldSet.add(key))
  })
  return Array.from(fieldSet).map(key => ({ label: key, value: key }))
})

watch(() => props.item, (newItem) => {
  if (newItem) {
    localItem.value = {
      ...newItem,
      config: newItem.config || getDefaultConfig(newItem.type)
    }
  }
}, { immediate: true })

const getDefaultConfig = (type: string) => {
  const defaults: Record<string, any> = {
    chart: {
      selectedChartId: null,
      fields: [],
      refreshRate: 100
    },
    table: {
      columns: [],
      pageSize: 20
    },
    '3d': {
      viewMode: 'perspective',
      showGrid: true,
      autoRotate: false
    },
    pipeline: {
      selectedNode: null,
      showMinimap: false
    },
    sim: {
      timeScale: 1,
      showTrail: true
    },
    rocket: {
      showTrajectory: true,
      cameraMode: 'follow'
    }
  }
  return defaults[type] || {}
}

const configSchema = computed(() => {
  if (!localItem.value) return []
  
  const type = localItem.value.type
  const schemas: Record<string, any[]> = {
    chart: [
      {
        key: 'selectedChartId',
        label: '选择图表',
        type: 'select',
        options: []
      },
      {
        key: 'fields',
        label: '绑定字段',
        type: 'multiSelect',
        options: availableFields.value
      }
    ],
    table: [
      {
        key: 'columns',
        label: '显示列',
        type: 'multiSelect',
        options: availableFields.value
      },
      {
        key: 'pageSize',
        label: '每页条数',
        type: 'number',
        min: 5,
        max: 100
      }
    ],
    '3d': [
      {
        key: 'viewMode',
        label: '视图模式',
        type: 'select',
        options: [
          { label: '透视', value: 'perspective' },
          { label: '正交', value: 'orthographic' }
        ]
      },
      {
        key: 'showGrid',
        label: '显示网格',
        type: 'switch'
      },
      {
        key: 'autoRotate',
        label: '自动旋转',
        type: 'switch'
      }
    ],
    pipeline: [
      {
        key: 'showMinimap',
        label: '显示小地图',
        type: 'switch'
      }
    ],
    sim: [
      {
        key: 'timeScale',
        label: '时间缩放',
        type: 'number',
        min: 0.1,
        max: 10,
        step: 0.1
      },
      {
        key: 'showTrail',
        label: '显示轨迹',
        type: 'switch'
      }
    ],
    rocket: [
      {
        key: 'showTrajectory',
        label: '显示轨迹',
        type: 'switch'
      },
      {
        key: 'cameraMode',
        label: '相机模式',
        type: 'select',
        options: [
          { label: '跟随', value: 'follow' },
          { label: '固定', value: 'fixed' },
          { label: '自由', value: 'free' }
        ]
      }
    ]
  }
  
  return schemas[type] || []
})

const handleClose = () => {
  emit('update:visible', false)
}

const handleSave = () => {
  if (localItem.value) {
    emit('save', {
      ...localItem.value,
      config: localItem.value.config
    })
  }
  handleClose()
}
</script>

<template>
  <el-dialog
    :model-value="visible"
    :title="`配置 ${localItem?.title || ''}`"
    width="500px"
    @update:model-value="emit('update:visible', $event)"
    @close="handleClose"
  >
    <el-form v-if="localItem" label-width="100px">
      <el-form-item label="组件类型">
        <el-tag>{{ localItem.type }}</el-tag>
      </el-form-item>

      <el-form-item label="标题">
        <el-input v-model="localItem.title" placeholder="请输入标题" />
      </el-form-item>

      <el-divider>组件配置</el-divider>

      <template v-for="schema in configSchema" :key="schema.key">
        <el-form-item v-if="schema.type === 'select'" :label="schema.label">
          <el-select v-model="localItem.config[schema.key]" placeholder="请选择">
            <el-option
              v-for="opt in schema.options"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item v-else-if="schema.type === 'multiSelect'" :label="schema.label">
          <el-select
            v-model="localItem.config[schema.key]"
            multiple
            filterable
            placeholder="请选择"
          >
            <el-option
              v-for="opt in schema.options"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item v-else-if="schema.type === 'switch'" :label="schema.label">
          <el-switch v-model="localItem.config[schema.key]" />
        </el-form-item>

        <el-form-item v-else-if="schema.type === 'number'" :label="schema.label">
          <el-input-number
            v-model="localItem.config[schema.key]"
            :min="schema.min"
            :max="schema.max"
            :step="schema.step || 1"
          />
        </el-form-item>
      </template>

      <el-alert
        v-if="configSchema.length === 0"
        type="info"
        :closable="false"
        show-icon
      >
        该组件暂无配置选项
      </el-alert>
    </el-form>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" @click="handleSave">确定</el-button>
    </template>
  </el-dialog>
</template>
