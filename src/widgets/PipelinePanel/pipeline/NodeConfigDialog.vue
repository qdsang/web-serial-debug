<template>
  <el-dialog v-model="dialogVisible" :title="title" width="600px">
    <el-form :model="form" label-width="100px">
      <el-form-item label="组件类型">
        <div class="template-grid">
          <div
            v-for="option in templateOptions"
            :key="option.value"
            class="template-card"
            :class="{ active: form.template === option.value }"
            @click="form.template = option.value"
          >
            <div class="template-icon">
              <el-icon><component :is="option.icon" /></el-icon>
            </div>
            <div class="template-content">
              <div class="template-title">{{ option.label }}</div>
              <div class="template-desc">{{ option.description }}</div>
            </div>
          </div>
        </div>
      </el-form-item>
      <el-form-item label="组件名称">
        <el-input v-model="form.label" placeholder="请输入组件名称" />
      </el-form-item>
      <el-form-item label="数据字段">
        <el-select
          v-model="form.fields"
          multiple
          filterable
          placeholder="请选择数据字段"
          style="width: 100%"
        >
          <el-option
            v-for="option in fieldOptions"
            :key="option.name"
            :label="option.label"
            :value="option.name"
          >
            <div class="field-option">
              <div class="field-option-title">{{ option.label }}</div>
              <div class="field-option-desc">
                <el-tag size="small" class="field-type-tag">{{ option.type }}</el-tag>
                <span v-if="option.unit" class="field-unit">{{ option.unit }}</span>
                <div class="field-description">{{ option.description }}</div>
              </div>
            </div>
          </el-option>
        </el-select>
      </el-form-item>
      <el-form-item label="连接桩">
        <el-card class="handles">
          <template #header>
            <div class="card-header">
              <span>连接桩列表</span>
              <el-button type="primary" link @click="addHandle">添加连接桩</el-button>
            </div>
          </template>
          <div v-for="(handle, index) in form.handles" :key="index" class="handle-item">
            <el-input v-model="handle.id" placeholder="标识符" style="width: 120px" />
            <el-select v-model="handle.type" placeholder="类型" style="width: 100px">
              <el-option label="输入" value="target" />
              <el-option label="输出" value="source" />
            </el-select>
            <el-select v-model="handle.position" placeholder="位置" style="width: 100px">
              <el-option label="顶部" value="top" />
              <el-option label="底部" value="bottom" />
              <el-option label="左侧" value="left" />
              <el-option label="右侧" value="right" />
            </el-select>
            <el-button type="danger" link @click="removeHandle(index)">删除</el-button>
          </div>
        </el-card>
      </el-form-item>
      <el-form-item label="操作按钮">
        <el-card class="actions">
          <template #header>
            <div class="card-header">
              <span>按钮列表</span>
              <el-button type="primary" link @click="addAction">添加按钮</el-button>
            </div>
          </template>
          <div v-for="(action, index) in form.actions" :key="index" class="action-item">
            <el-input v-model="action.label" placeholder="按钮文本" style="width: 120px" />
            <el-input v-model="action.value" placeholder="动作值" style="width: 120px" />
            <el-button type="danger" link @click="removeAction(index)">删除</el-button>
          </div>
        </el-card>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" @click="handleConfirm">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed } from 'vue'
import {
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElSelect,
  ElOption,
  ElButton,
  ElCard,
  ElIcon
} from 'element-plus'
import {
  Box,
  Switch,
  DataLine
} from '@element-plus/icons-vue'
import { useFieldStore } from '@/store/fieldStore'

const props = defineProps<{
  modelValue: boolean
  editData?: any
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm', data: any): void
}>()

const dialogVisible = ref(props.modelValue)
const title = ref(props.editData ? '编辑组件' : '添加组件')

const form = reactive({
  label: '',
  template: '',
  fields: [] as Array<string>,
  handles: [] as Array<{ id: string; type: string; position: string }>,
  actions: [] as Array<{ label: string; value: string }>
})

// 监听对话框显示状态
watch(() => props.modelValue, (val) => {
  dialogVisible.value = val
})

watch(() => dialogVisible.value, (val) => {
  emit('update:modelValue', val)
})

// 添加连接桩
function addHandle() {
  form.handles.push({
    id: '',
    type: 'target',
    position: 'top'
  })
}

// 删除连接桩
function removeHandle(index: number) {
  form.handles.splice(index, 1)
}

// 添加操作按钮
function addAction() {
  form.actions.push({
    label: '',
    value: ''
  })
}

// 删除操作按钮
function removeAction(index: number) {
  form.actions.splice(index, 1)
}

// 确认提交
function handleConfirm() {
  emit('confirm', { ...form })
  dialogVisible.value = false
}

const templateOptions = [
  {
    value: 'tank',
    label: '容器类',
    icon: 'DataLine',
    description: '适用于储罐、气瓶等存储容器'
  },
  {
    value: 'valve',
    label: '阀门类',
    icon: 'Box',
    description: '适用于各类阀门控制元件'
  },
  {
    value: 'sensor',
    label: '传感器类',
    icon: 'Switch',
    description: '适用于压力、温度等传感器'
  }
]

const fieldStore = useFieldStore()

const fieldOptions = computed(() => fieldStore.fields.map(field => ({
  name: field.key,
  label: field.name,
  description: field.description,
  unit: field.unit,
  type: field.dataType
})))

</script>
<style scoped>
.template-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.template-card {
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  gap: 12px;
}

.template-card:hover {
  border-color: var(--el-color-primary);
  transform: translateY(-2px);
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.template-card.active {
  border-color: var(--el-color-primary);
  background-color: var(--el-color-primary-light-9);
}

.template-icon {
  font-size: 24px;
  color: var(--el-color-primary);
}

.template-content {
  flex: 1;
}

.template-title {
  font-weight: bold;
  margin-bottom: 4px;
}

.template-desc {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.4;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.field-item,
.handle-item,
.action-item {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
}

.data-fields,
.handles,
.actions {
  margin-top: 8px;
}

.field-option {
  padding: 8px 0;
}

.field-option-title {
  font-weight: bold;
  margin-bottom: 4px;
}

.field-option-desc {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.4;
}
</style>