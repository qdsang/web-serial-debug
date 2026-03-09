<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { EditorState } from '@codemirror/state'
import { EditorView, keymap, lineNumbers } from '@codemirror/view'
import { defaultKeymap, indentWithTab } from '@codemirror/commands'
import { javascript } from '@codemirror/lang-javascript'
import { oneDark, oneDarkHighlightStyle } from '@codemirror/theme-one-dark'
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language'
import { ScriptManager } from '../utils/ScriptManager'
import { useDark } from '@vueuse/core'
import { WorkspaceManagerInst } from '../utils/ProfileManager'

const scriptManager = ScriptManager.getInstance()
const workspaceManager = WorkspaceManagerInst

const currentScript = ref(scriptManager.getScript())
const editor = ref<EditorView | null>(null)
const isDark = useDark()

const editorSetValue = (content: string) => {
  if (editor.value) {
    editor.value.dispatch({
      changes: { from: 0, to: editor.value.state.doc.length, insert: content }
    })
  }
}

const runScript = async () => {
  if (currentScript.value.isRunning) {
    await scriptManager.stopScript()
  } else {
    await scriptManager.runScript()
  }
  currentScript.value = scriptManager.getScript()
}

const createEditor = () => {
  const container = document.getElementById('script-editor-container')
  if (container) {
    const startState = EditorState.create({
      doc: currentScript.value.code,
      extensions: [
        keymap.of(defaultKeymap),
        keymap.of([indentWithTab]),
        syntaxHighlighting(isDark.value ? oneDarkHighlightStyle : defaultHighlightStyle),
        javascript(),
        isDark.value ? oneDark : [],
        lineNumbers(),
        EditorView.updateListener.of(update => {
          if (update.docChanged) {
            currentScript.value.code = update.state.doc.toString()
            scriptManager.updateScript({ code: currentScript.value.code })
          }
        })
      ]
    })

    editor.value = new EditorView({
      state: startState,
      parent: container
    })
  }
}

onMounted(() => {
  createEditor()
  workspaceManager.onWorkspaceChange(() => {
    currentScript.value = scriptManager.getScript()
    editorSetValue(currentScript.value.code)
  })
})

watch(isDark, () => {
  if (editor.value) {
    editor.value.destroy()
    createEditor()
  }
})
</script>

<template>
  <div class="serial-script">
    <div class="script-editor">
      <div class="script-name-container">
        <el-input
          size="small"
          v-model="currentScript.name"
          placeholder="脚本名称"
          class="script-name-input"
          @change="scriptManager.updateScript({ name: currentScript.name })"
        />
        <el-button
          :type="currentScript.isRunning ? 'success' : 'primary'"
          size="small"
          @click="runScript()"
          class="run-button"
        >
          {{ currentScript.isRunning ? '停止' : '运行' }}
        </el-button>

        <el-tooltip
            effect="dark"
            placement="bottom"
          >
          <template #content>
            <p>可用的API:</p>
            <ul>
              <li>sendText(text) - 发送文本数据</li>
              <li>sendHex(hex) - 发送HEX格式数据</li>
              <li>sleep(ms) - 延时指定毫秒数</li>
              <li>updateDataTable({pitch: 1.0, roll: 1.0, yaw: 1.0}); 更新IMU数据</li>
            </ul>
          </template>
          <el-button size="small" style="margin-left: 0;">
            <el-icon><Compass /></el-icon>
          </el-button>
        </el-tooltip>
      </div>
      <div id="script-editor-container" class="editor-container" />
    </div>
  </div>
</template>

<style scoped>
.serial-script {
  margin: 10px;
  min-width: 300px;
}

.script-editor {
  padding: 8px 0;
}

.script-name-container {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.script-name-input {
  flex: 1;
}

.run-button {
  flex-shrink: 0;
}

.ms-2 {
  margin-left: 8px;
}

:deep(.CodeMirror) {
  height: 800px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
}

:deep(.CodeMirror-focused) {
  border-color: #409eff;
}
</style>
