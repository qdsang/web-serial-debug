import { ref, watch, onMounted } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { WorkspaceManagerInst } from './ProfileManager'

export function useWorkspaceConfig<T>(key: string, defaultValue: T) {
  const workspaceManager = WorkspaceManagerInst
  const localConfig = ref<T>({ ...defaultValue as any })
  const lastWorkspaceId = ref<string | null>(null)

  const loadFromProfile = () => {
    const workspace = workspaceManager.activeWorkspace
    if (workspace?.config?.[key]) {
      localConfig.value = { ...workspace.config[key] as T }
    } else {
      localConfig.value = { ...defaultValue as any }
    }
  }

  const saveToProfile = useDebounceFn(() => {
    const workspace = workspaceManager.activeWorkspace
    if (workspace) {
      workspaceManager.updateWorkspace(workspace.id, {
        config: {
          ...workspace.config,
          [key]: { ...localConfig.value }
        }
      })
    }
  }, 300)

  const init = () => {
    loadFromProfile()
    lastWorkspaceId.value = workspaceManager.activeWorkspaceIdRef.value
    
    workspaceManager.onWorkspaceChange(() => {
      if (workspaceManager.activeWorkspaceIdRef.value !== lastWorkspaceId.value) {
        lastWorkspaceId.value = workspaceManager.activeWorkspaceIdRef.value
        loadFromProfile()
      }
    })
  }

  watch(localConfig, () => {
    saveToProfile()
  }, { deep: true })

  onMounted(() => {
    init()
  })

  return {
    config: localConfig
  }
}
