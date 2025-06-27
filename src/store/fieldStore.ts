import { defineStore } from 'pinia'
import { useLocalStorage } from '@vueuse/core'

interface DataField {
  id: number
  key: string
  name: string
  unit: string
  description: string
  keyAddr: number
  keySize: number
  value: any
  dataType: 'number' | 'string' | 'boolean' | 'object'
  avg: number | null
  avgSum: number | null
  min: number | null
  max: number | null
  lastUpdate: number
  updateCount: number
}

interface ColumnVisibility {
  key: boolean
  name: boolean
  unit: boolean
  dataType: boolean
  description: boolean
  keyAddr: boolean
  keySize: boolean
  value: boolean
  avg: boolean
  min: boolean
  max: boolean
  lastUpdate: boolean
  updateCount: boolean
}

const createFieldItem = (id: number, key: string, value: any, dataType?: 'number' | 'string' | 'boolean' | 'object'): DataField => {
  return {
    id: id,
    key,
    name: key,
    unit: '',
    keyAddr: 0,
    keySize: 0,
    dataType: dataType || 'number',
    description: '',
    value,
    avg: typeof value === 'number' ? value : null,
    avgSum: typeof value === 'number' ? value : null,
    min: typeof value === 'number' ? value : null,
    max: typeof value === 'number' ? value : null,
    lastUpdate: Date.now(),
    updateCount: 1
  }
}

const initDefaultFields = [
  createFieldItem(1, 'pitch', 0, 'number'),
  createFieldItem(1, 'roll', 0, 'number'),
  createFieldItem(1, 'yaw', 0, 'number'),
] as DataField[]

export const useFieldStore = defineStore('field', {
  state: () => ({
    fields: useLocalStorage('config.fields', initDefaultFields),
    nextId: useLocalStorage('config.nextId', 1),
    columnVisibility: useLocalStorage('config.columnVisibility', {
      key: true,
      name: false,
      unit: false,
      keyAddr: false,
      keySize: false,
      dataType: true,
      description: false,
      value: true,
      avg: false,
      min: false,
      max: false,
      lastUpdate: true,
      updateCount: true
    } as ColumnVisibility)
  }),
  actions: {
    createField(key: string, value: any, dataType?: 'number' | 'string' | 'boolean' | 'object'): DataField {
      const field = createFieldItem(this.nextId++, key, value, dataType)
      this.fields.push(field)
      return field
    },
    updateField(field: DataField, value: any) {
      field.value = value
      field.lastUpdate = Date.now()
      field.updateCount++

      if (typeof value === 'number') {
        if (field.avgSum == null) {
          field.avgSum = 0
        }
        field.avgSum += value
        field.avg = Math.floor(field.avgSum / field.updateCount * 1000) / 1000
        
        if (field.min === null || value < field.min) field.min = value
        if (field.max === null || value > field.max) field.max = value
      }
    },
    deleteField(fieldId: number) {
      const index = this.fields.findIndex(f => f.id === fieldId)
      if (index !== -1) {
        this.fields.splice(index, 1)
      }
    },
    toggleColumnVisibility() {
    },
    saveToLocalStorage() {
    },
    loadFromLocalStorage() {
    },
    exportData() {
      const data = JSON.stringify(this.fields, null, 2)
      const blob = new Blob([data], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `data-export-${new Date().toISOString()}.json`
      a.click()
      URL.revokeObjectURL(url)
    },
    async importData(file: File) {
      try {
        const text = await file.text()
        const data = JSON.parse(text) as DataField[]
        this.fields = data
        return true
      } catch (error) {
        console.error('导入数据失败:', error)
        return false
      }
    }
  }
})