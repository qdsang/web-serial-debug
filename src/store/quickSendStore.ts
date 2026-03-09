import { defineStore } from 'pinia'
import { ref, watch, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { SerialHelper } from '../utils/SerialHelper'
import { EventCenter, EventNames } from '../utils/EventCenter'
import { ProfileManagerInst } from '../utils/ProfileManager'

const eventCenter = EventCenter.getInstance()

export interface QuickSendItem {
  id: number
  name: string
  content: string
  type: 'text' | 'hex'
  addCRLFType: string
}

export interface QuickSendGroup {
  id: number
  name: string
  items: QuickSendItem[]
}

const defaultGroups: QuickSendGroup[] = [
  {
    id: 1,
    name: '默认分组',
    items: [
      {
        id: 1,
        name: '查询版本',
        content: 'AT+VERSION?',
        type: 'text',
        addCRLFType: '\n'
      },
      {
        id: 2,
        name: '重启设备',
        content: 'AT+RESET',
        type: 'text',
        addCRLFType: '\n'
      },
      {
        id: 3,
        name: '查询状态',
        content: 'AT+STATUS?',
        type: 'text',
        addCRLFType: '\n'
      },
      {
        id: 4,
        name: '16进制测试',
        content: 'AA BB CC 11 22',
        type: 'hex',
        addCRLFType: ''
      }
    ]
  }
]

export const useQuickSendStore = defineStore('quickSend', () => {
  const serialHelper = SerialHelper.getInstance()
  const profileManager = ProfileManagerInst

  const groups = ref<QuickSendGroup[]>([])
  const currentGroupId = ref<number>(0)
  const currentGroup = computed(() => groups.value.find(g => g.id === currentGroupId.value) || groups.value[0])
  const autoSendIntervals = ref<Record<number, number>>({})
  const autoSendInterval = ref(1000)

  const loadFromProfile = () => {
    const profile = profileManager.activeProfile
    const savedGroups = profile?.config?.quickSendGroups as QuickSendGroup[] | undefined
    
    if (savedGroups && savedGroups.length > 0) {
      groups.value = savedGroups
    } else {
      groups.value = JSON.parse(JSON.stringify(defaultGroups))
    }
    setCurrentGroup(groups.value[0])
  }

  profileManager.onProfileChange(() => {
    loadFromProfile()
  })

  const saveToProfile = () => {
    const profile = profileManager.activeProfile
    if (profile) {
      profileManager.updateProfile(profile.id, {
        config: {
          ...profile.config,
          quickSendGroups: groups.value
        }
      })
    }
  }

  const validateHexData = (data: string): boolean => {
    const hexPattern = /^[0-9A-Fa-f\s]*$/
    return hexPattern.test(data)
  }

  const sendData = (item: QuickSendItem) => {
    if (!item.content) {
      ElMessage.warning('发送内容不能为空')
      return
    }

    if (item.type === 'hex' && !validateHexData(item.content)) {
      ElMessage.error('HEX格式数据不合法')
      return
    }

    const data = serialHelper.stringToUint8Array(item.content + item.addCRLFType, item.type === 'hex')
    eventCenter.emit(EventNames.SERIAL_SEND, data)
  }

  const toggleAutoSend = (item: QuickSendItem) => {
    const intervalId = autoSendIntervals.value[item.id]
    if (intervalId) {
      clearInterval(intervalId)
      delete autoSendIntervals.value[item.id]
    } else {
      autoSendIntervals.value[item.id] = window.setInterval(() => sendData(item), autoSendInterval.value)
    }
  }

  const addItem = () => {
    currentGroup.value.items.push({
      id: Date.now(),
      name: '新建项目',
      content: '',
      type: 'text',
      addCRLFType: '\n'
    })
  }

  const removeItem = (id: number) => {
    const index = currentGroup.value.items.findIndex(item => item.id === id)
    if (index > -1) {
      currentGroup.value.items.splice(index, 1)
    }
  }

  const addGroup = (name: string) => {
    if (name) {
      groups.value.push({
        id: Date.now(),
        name,
        items: []
      })
    }
  }

  const removeGroup = () => {
    if (groups.value.length <= 1) {
      ElMessage.warning('至少保留一个分组')
      return
    }
    const index = groups.value.findIndex(group => group.id === currentGroup.value.id)
    if (index > -1) {
      groups.value.splice(index, 1)
      if (groups.value.length == 0) {
        addGroup('默认分组')
      }
      setCurrentGroup(groups.value[0])
    }
  }

  const renameGroup = (name: string) => {
    if (name) {
      currentGroup.value.name = name
    }
  }

  const setCurrentGroup = (group: QuickSendGroup) => {
    currentGroupId.value = group.id
  }

  const handleGroupChange = (groupId: number) => {
    console.log('切换分组', groupId, groups)
    currentGroupId.value = groupId
  }

  const importConfig = (data: any) => {
    try {
      if (!Array.isArray(data) || !data.every(group =>
        typeof group === 'object' &&
        typeof group.id === 'number' &&
        typeof group.name === 'string' &&
        Array.isArray(group.items)
      )) {
        throw new Error('配置文件格式错误')
      }
      groups.value = data
      setCurrentGroup(groups.value[0])
      saveToProfile()
      ElMessage.success('导入成功')
    } catch (error) {
      ElMessage.error(`导入失败：${error instanceof Error ? error.message : '无效的配置文件'}`)
    }
  }

  const exportConfig = () => {
    return JSON.stringify(groups.value, null, 2)
  }

  watch([groups, currentGroup], () => {
    saveToProfile()
  }, { deep: true })

  loadFromProfile()

  return {
    groups,
    currentGroupId,
    currentGroup,
    autoSendIntervals,
    autoSendInterval,
    sendData,
    toggleAutoSend,
    addItem,
    removeItem,
    addGroup,
    removeGroup,
    renameGroup,
    handleGroupChange,
    importConfig,
    exportConfig,
    loadFromProfile
  }
})
