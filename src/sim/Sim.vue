<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
// @ts-ignore
import Stats from 'stats.js'
import { SceneManager } from './SceneManager.js';
import { RocketPhysics } from './RocketPhysics.js';
import katex from 'katex';

interface Props {
  readonly?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false
})

const container = ref<HTMLDivElement | null>(null)
let animationFrameId: number
const sceneManager = new SceneManager();
let stats: Stats

// UI状态
const started = ref(false)
const currentCameraIndex = ref(0)
const cameras = ['main', 'nozzle', 'ellipsis']
const cameraNames = {
  'main': 'Rocket main camera',
  'nozzle': 'Rocket nozzle camera',
  'ellipsis': 'Fixed ground camera'
}
const currentCameraName = ref(cameraNames['main'])
const physicsData = ref(null)
const formula = ref('')
const formulaOpacity = ref(0)

// 相机控制方法
function nextCamera() {
  currentCameraIndex.value = (currentCameraIndex.value + 1) % cameras.length
  const camera = cameras[currentCameraIndex.value]
  sceneManager.setCamera(camera)
  currentCameraName.value = cameraNames[camera]
}

function setCamera(type: string) {
  sceneManager.setCamera(type)
  currentCameraName.value = cameraNames[type]
}

// 更新公式显示
function updateFormulas(physicsState: any) {
  let newFormula = ''
  
  if (physicsState.time > 4 && physicsState.time < 40) {
    newFormula = `
      \\theta = \\theta_{0} - 2(\\theta_{0} - \\theta_{k})\\frac{${Math.round(physicsState.time)}-t_{a}}{t_{p} - t_{a}} + (\\theta_{0} - \\theta_{k})(\\frac{t-t_{a}}{t_{k} - t_{a}})^2 = ${Math.round(physicsState.angle * 100) / 100}\\newline 
      \\ \\newline
      \\theta_{0} = 1.57 \\ rad\\newline
      \\ \\newline
      \\theta_{k} = 0.68 \\ rad\\newline
      \\ \\newline
      t_{a} = 4 \\ c\\newline
      \\ \\newline
      t_{p} = 40 \\ c
    `
  } else if (physicsState.position.y > 95000) {
    newFormula = `
      v_{k} = \\frac{V_{k}^2(R+h_{k})}{\\pi_{0}} = ${physicsState.vk}\\newline
      \\ \\newline
      \\beta_{B} = arctan\\frac{v_{k}tg\\theta_{k}}{1+tg^2\\theta_{k}-v_{k}} = ${physicsState.beta}\\newline
      \\ \\newline
      p = v_{k}(R+h_{k})cos^2\\theta_{k} = ${physicsState.focal}\\newline
      \\ \\newline
      e = \\sqrt{(1-v_{k})^2cos^2\\theta_{k}+sin^2\\theta_{k}} = ${physicsState.eccentricity}
    `
  }

  formula.value = newFormula
  formulaOpacity.value = newFormula ? 1 : 0

  if (newFormula) {
    nextTick(() => {
      katex?.render(newFormula, document.querySelector('.tex'), {
        throwOnError: false
      })
    })
  }
}

function initScene() {
  sceneManager.init(container.value)

  // 初始化性能监视器
  stats = new Stats()
  stats.showPanel(0) // 0: fps, 1: ms, 2: mb, 3+: custom
  stats.dom.style.position = 'absolute'
  stats.dom.style.left = '0px'
  stats.dom.style.top = '0px'
  // container.value!.appendChild(stats.dom)

  // 初始化场景管理器
  container.value!.appendChild(sceneManager.renderer.domElement)

  // 初始化火箭物理
  const rocketPhysics = new RocketPhysics();

  let time = 0;

  // 动画循环
  function animate() {
    animationFrameId = requestAnimationFrame(animate)
    stats.begin()
    
    if (started.value) {
      time += sceneManager.step;
      const physicsState = rocketPhysics.update(time, sceneManager.step);
      
      // 添加时间到物理状态
      physicsState.time = time;
      
      // 如果高度超过95000米，计算轨道参数
      if (physicsState.position.y > 95000) {
        const v = physicsState.velocity / 1000;
        physicsState.vk = Math.round(v * 10000) / 10000;
        physicsState.beta = Math.round(Math.atan((v * Math.tan(physicsState.angle)) / 
          (1 + Math.pow(Math.tan(physicsState.angle), 2) - v)) * 10000) / 10000;
        physicsState.focal = Math.round(v * (6371210 + physicsState.position.y) * 
          Math.pow(Math.cos(physicsState.angle), 2));
        physicsState.eccentricity = Math.round(Math.sqrt(
          Math.pow(1 - v, 2) * Math.pow(Math.cos(physicsState.angle), 2) + 
          Math.pow(Math.sin(physicsState.angle), 2)
        ) * 10000) / 10000;
      }
      
      sceneManager.updateRocket(physicsState);
      physicsData.value = physicsState;
      updateFormulas(physicsState);
    }
    
    sceneManager.render();
    stats.end();
  }

  animate();
}

const handleResize = () => {
  let renderer = sceneManager.renderer;
  let camera = sceneManager.camera;
  let rocketFireMesh = sceneManager.particleFireMesh;
  if (container.value && camera && renderer) {
    let width = container.value.clientWidth
    let height = container.value.clientHeight
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    renderer.setSize(width, height)

    if (rocketFireMesh) {
      rocketFireMesh.material.setPerspective( camera.fov, height );
    }
  }
}

const getConfig = () => {
  return {
    started: started.value,
    currentCamera: cameras[currentCameraIndex.value]
  }
}

const setConfig = (config: Record<string, any>) => {
  if (config.currentCamera) {
    setCamera(config.currentCamera)
  }
}

defineExpose({
  getConfig,
  setConfig
})

onMounted(() => {
  initScene()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
  }
  
  window.removeEventListener('resize', handleResize)
  // renderer.dispose()
})

</script>

<template>
  <div class="sim">
    <div class="tex" :style="{ opacity: formulaOpacity }"></div>
    <div class="controls" v-if="!readonly">
      <button @click="started = true">开始</button>
      <button @click="nextCamera">下一个摄像头</button>
      <button @click="setCamera('main')">主摄像头</button>
      <button @click="setCamera('nozzle')">喷嘴摄像头</button>
      <button @click="setCamera('ellipsis')">椭圆区域摄像头</button>
    </div>
    <div class="current-camera">{{ currentCameraName }}</div>
    <div v-if="physicsData" class="data-wrapper">
      <div>x - {{ Math.round(physicsData.position.x * 100) / 100 }} m</div>
      <div>y - {{ Math.round(physicsData.position.y * 100) / 100 }} m</div>
      <div>θ - {{ Math.round(physicsData.angle * 100) / 100 }} rad</div>
      <div>v - {{ Math.round(physicsData.velocity * 100) / 100 }} m/s</div>
      <div>t - {{ Math.round(physicsData.time * 100) / 100 }} s</div>
    </div>
    <div ref="container" class="container"></div>
  </div>
</template>

<style scoped lang="less">
.sim {
  height: 100%;
  position: relative;
}
.controls {
  position: absolute;
  top: 0;
  display: flex;
  gap: 4px;
  padding: 4px;
}
.current-camera {
  position: absolute;
  bottom: 0;
  right: 0;
}
.container {
  width: 100%;
  height: 100%;
  :deep(canvas) {
    width: 100%;
    height: 100%;
  }
  :deep(.lil-gui.root) {
    position: absolute;
    top: 0;
    right: 0;
  }
}

.data-wrapper {
    position: absolute;
    top: 50px;
    left: 10px;
    font-size: 18px;
}

.tex {
    position: absolute;
    top: 300px;
    left: 100px;

    color: black;
    font-size: 24px;

    transition: 200ms all;
}

</style>
