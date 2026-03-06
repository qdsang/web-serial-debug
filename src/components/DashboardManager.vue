<script setup lang="ts">
import { ref, computed } from 'vue'
import { useDashboardStore } from '../store/dashboardStore'

const dashboardStore = useDashboardStore()

const showDialog = ref(false)
const newDashboardName = ref('')

const dashboards = computed(() => dashboardStore.dashboards)
const activeId = computed(() => dashboardStore.activeDashboardId)

const handleCreate = () => {
  if (newDashboardName.value.trim()) {
    dashboardStore.addDashboard(newDashboardName.value.trim())
    newDashboardName.value = ''
    showDialog.value = false
  }
}

const handleSwitch = (id: string) => {
  dashboardStore.setActiveDashboard(id)
}

const handleDelete = (id: string) => {
  dashboardStore.removeDashboard(id)
}

const handleRename = (id: string, newName: string) => {
  dashboardStore.renameDashboard(id, newName)
}
</script>

<template>
  <div class="dashboard-manager">
    <el-dropdown trigger="click" @command="handleSwitch">
      <el-button type="primary" size="small">
        {{ dashboardStore.activeDashboard?.name || '选择看板' }}
        <el-icon class="el-icon--right"><arrow-down /></el-icon>
      </el-button>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item
            v-for="dash in dashboards"
            :key="dash.id"
            :command="dash.id"
          >
            <div class="dashboard-item">
              <span>{{ dash.name }}</span>
              <el-icon v-if="dash.id === activeId" class="check-icon"><check /></el-icon>
            </div>
          </el-dropdown-item>
          <el-dropdown-item divided @click="showDialog = true">
            <el-icon><plus /></el-icon>
            新建看板
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>

    <el-dialog v-model="showDialog" title="新建看板" width="400px">
      <el-input
        v-model="newDashboardName"
        placeholder="请输入看板名称"
        @keyup.enter="handleCreate"
      />
      <template #footer>
        <el-button @click="showDialog = false">取消</el-button>
        <el-button type="primary" @click="handleCreate">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="less">
.dashboard-manager {
  display: inline-block;
}

.dashboard-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 150px;
}

.check-icon {
  color: var(--el-color-success);
  margin-left: 8px;
}
</style>
