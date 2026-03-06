<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, nextTick, watch } from 'vue'
// @ts-ignore
import * as THREE from 'three'
// @ts-ignore
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
// @ts-ignore
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
// @ts-ignore
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader'
import { useDark } from '@vueuse/core'
import { ElMessage } from 'element-plus'
// @ts-ignore
import Stats from 'stats.js'
// @ts-ignore
import particleFire from 'three-particle-fire'
import katex from 'katex'
import 'katex/dist/katex.min.css'
try { particleFire.install( { THREE: THREE } ); } catch (e) { }

import { WaterRocketPhysics } from '../utils/WaterRocketPhysics'
import { MultiStageRocketPhysics } from '../utils/MultiStageRocketPhysics'

interface Props {
  readonly?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false
})

const container = ref<HTMLDivElement | null>(null)
const waterRocketPhysics = WaterRocketPhysics.getInstance()
const multiStageRocketPhysics = MultiStageRocketPhysics.getInstance()

// 控制参数
const waterVolume = ref(waterRocketPhysics.getWaterVolume())
const pressure = ref(waterRocketPhysics.getPressure())
const angle = ref(waterRocketPhysics.getAngle())
const isLaunched = ref(false)
const isMultiStage = ref(true)

// 环境参数
const temperature = ref(20) // 默认温度20°C
const windSpeed = ref(0)    // 默认无风
const windDirection = ref(0) // 默认风向0°

// 计算结果
const velocity = computed(() => waterRocketPhysics.getVelocity())
const height = computed(() => waterRocketPhysics.getHeight())
const distance = computed(() => waterRocketPhysics.getDistance())
const flightTime = computed(() => waterRocketPhysics.getFlightTime())

// 运动方程
const equations = computed(() => waterRocketPhysics.getEquations())
const parameters = computed(() => waterRocketPhysics.getParameterDescriptions())

const isDark = useDark()
const sceneBackground = computed(() => isDark.value ? 0x1a1a1a : 0xf0f0f0)
// const gridColor = computed(() => isDark.value ? 0x404040 : 0x808080)
const modelColor = computed(() => isDark.value ? 0x404040 : 0x3366ff)
// const modelColor = computed(() => isDark.value ? 0xF4F5F0 : 0x3366ff)

let scene: THREE.Scene
let clock: THREE.Clock
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let model: THREE.Group
let controls: OrbitControls
let animationFrameId: number
let stats: Stats
let waterJetMesh: any

// 更新3D模型外观以反映当前级的状态
const updateModelAppearance = (stage: number, config: any) => {
  if (!model) return

  // 更新瓶身尺寸
  const bottleGeometry = new THREE.CylinderGeometry(
    config.bottleDiameter / 2,
    config.bottleDiameter / 2,
    config.bottleVolume / 10000, // 将ml转换为近似高度
    32
  )
  const bottleMaterial = new THREE.MeshStandardMaterial({
    color: 0x88ccff,
    transparent: true,
    opacity: 0.6,
    metalness: 0.2,
    roughness: 0.1
  })

  // 更新喷嘴尺寸
  const nozzleGeometry = new THREE.CylinderGeometry(
    config.nozzleDiameter / 2,
    config.nozzleDiameter * 0.8 / 2,
    config.nozzleDiameter * 4,
    32
  )
  const nozzleMaterial = new THREE.MeshStandardMaterial({
    color: modelColor.value,
    metalness: 0.6,
    roughness: 0.3
  })

  // 更新模型
  model.children.forEach((child: THREE.Mesh) => {
    if (child.geometry instanceof THREE.CylinderGeometry) {
      if (child.position.y > 0) {
        child.geometry.dispose()
        child.geometry = bottleGeometry
      } else {
        child.geometry.dispose()
        child.geometry = nozzleGeometry
      }
    }
  })
}

// 监听火箭配置变化
watch(
  () => multiStageRocketPhysics.getAllStageConfigs(),
  (newConfigs) => {
    if (newConfigs.length > 0) {
      const currentConfig = newConfigs[0]
      updateModelAppearance(0, currentConfig)
    }
  },
  { deep: true }
)

const initScene = () => {
  scene = new THREE.Scene()
  scene.background = new THREE.Color(sceneBackground.value)

  // 添加坐标轴辅助器
  const axesHelper = new THREE.AxesHelper(1.6)
  scene.add(axesHelper)

  clock = new THREE.Clock()

  // 初始化性能监视器
  stats = new Stats()
  stats.showPanel(0) // 0: fps, 1: ms, 2: mb, 3+: custom
  stats.dom.style.position = 'absolute'
  stats.dom.style.left = '0px'
  stats.dom.style.top = '0px'
  container.value!.appendChild(stats.dom)

  camera = new THREE.PerspectiveCamera(75, container.value!.clientWidth / container.value!.clientHeight, 0.1, 1000)
  camera.position.set(2, 2, 2)
  camera.lookAt(0, 0, 0)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(container.value!.clientWidth, container.value!.clientHeight)
  container.value!.appendChild(renderer.domElement)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true

//   const gridHelper = new THREE.GridHelper(10, 10, gridColor.value, gridColor.value)
//   scene.add(gridHelper)

  createModel()
  addLights()
}

const createModel = () => {
  const group = new THREE.Group()

  // 瓶身
  const bottleGeometry = new THREE.CylinderGeometry(0.15, 0.15, 1.2, 32)
  const bottleMaterial = new THREE.MeshStandardMaterial({
    color: 0x88ccff,
    transparent: true,
    opacity: 0.6,
    metalness: 0.2,
    roughness: 0.1
  })
  const bottle = new THREE.Mesh(bottleGeometry, bottleMaterial)
  bottle.position.y = 0.6
  group.add(bottle)

  // 瓶口
  const nozzleGeometry = new THREE.CylinderGeometry(0.05, 0.08, 0.2, 32)
  const nozzleMaterial = new THREE.MeshStandardMaterial({
    color: modelColor.value,
    metalness: 0.6,
    roughness: 0.3
  })
  const nozzle = new THREE.Mesh(nozzleGeometry, nozzleMaterial)
  nozzle.position.y = -0.1
  group.add(nozzle)

  // 水柱效果
  const waterRadius = 0.04
  const waterHeight = 0.8
  const particleCount = 1000
  const height = window.innerHeight

  const geometry0 = new particleFire.Geometry(waterRadius, waterHeight, particleCount)
  const material0 = new particleFire.Material({ color: 0x3366ff })
  material0.setPerspective(camera.fov, height)
  waterJetMesh = new THREE.Points(geometry0, material0)
  waterJetMesh.rotation.x = 3.14
  waterJetMesh.position.set(0, -0.2, 0)
  waterJetMesh.visible = false
  group.add(waterJetMesh)

  if (model) {
    scene.remove(model)
  }
  model = group
  scene.add(model)
}

const addLights = () => {
  // 环境光
  const ambientLight = new THREE.AmbientLight(0xffffff, 6)
  scene.add(ambientLight)

  // 主平行光
  const mainLight = new THREE.DirectionalLight(0xffffff, 12)
  mainLight.position.set(5, 5, 10)
  scene.add(mainLight)

  // 补充平行光
  const fillLight = new THREE.DirectionalLight(0xffffff, 1)
  fillLight.position.set(-5, 3, -5)
  scene.add(fillLight)

  // 添加点光源
  const pointLight = new THREE.PointLight(0x4a9eff, 1, 10)
  pointLight.position.set(2, 2, 2)
  scene.add(pointLight)
}

const animate = () => {
  var delta = clock.getDelta();
  const currentTime = clock.getElapsedTime();
  animationFrameId = requestAnimationFrame(animate)
  stats.begin()
  
  if (model && isLaunched.value) {
    model.rotation.z = THREE.MathUtils.degToRad(angle.value)
    if (waterJetMesh) {
      waterJetMesh.visible = true
      waterJetMesh.material.update(delta)
    }
    
    // 更新物理状态
    if (isMultiStage.value) {
      multiStageRocketPhysics.update(delta, currentTime)
      
      // 更新模型位置和状态
      const currentStage = multiStageRocketPhysics.getCurrentStage()
      const currentConfig = multiStageRocketPhysics.getCurrentStageConfig()
      
      if (currentConfig) {
        // 更新模型的外观以反映当前级的状态
        updateModelAppearance(currentStage, currentConfig)
        
        // 更新位置
        const physics = multiStageRocketPhysics.stages[currentStage]
        model.position.x = physics.getDistance() * Math.cos(THREE.MathUtils.degToRad(angle.value))
        model.position.y = physics.getHeight()
      }
    } else {
      waterRocketPhysics.update(delta)
      model.position.x = waterRocketPhysics.getDistance() * Math.cos(THREE.MathUtils.degToRad(angle.value))
      model.position.y = waterRocketPhysics.getHeight()
    }
  }

  controls.update()
  renderer.render(scene, camera)
  stats.end()
}

const handleResize = () => {
  if (container.value && camera && renderer) {
    let width = container.value.clientWidth
    let height = container.value.clientHeight
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    renderer.setSize(width, height)

    if (waterJetMesh) {
      waterJetMesh.material.setPerspective(camera.fov, height);
    }
  }
}

const handleWaterVolumeChange = (value: number) => {
  waterRocketPhysics.setWaterVolume(value)
}

const handlePressureChange = (value: number) => {
  waterRocketPhysics.setPressure(value)
}

const handleAngleChange = (value: number) => {
  waterRocketPhysics.setAngle(value)
}

const handleLaunch = () => {
  isLaunched.value = true
}

const handleStageCountChange = (value: number) => {
  stageCount.value = value
  isMultiStage.value = value > 1
  updateRocketConfiguration()
}

const handleBottleCountChange = (value: number) => {
  bottleCount.value = value
  updateRocketConfiguration()
}

const handleSeparationTimeChange = (value: number) => {
  separationTime.value = value
  updateRocketConfiguration()
}

const updateRocketConfiguration = () => {
  const configs = []
  for (let i = 0; i < stageCount.value; i++) {
    configs.push({
      bottleCount: bottleCount.value,
      bottleVolume: waterRocketPhysics.getBottleVolume(),
      bottleMass: waterRocketPhysics.getBottleMass(),
      bottleDiameter: waterRocketPhysics.getBottleDiameter(),
      nozzleDiameter: waterRocketPhysics.getNozzleDiameter(),
      waterVolume: waterRocketPhysics.getWaterVolume(),
      pressure: waterRocketPhysics.getPressure(),
      separationTime: i < stageCount.value - 1 ? separationTime.value * (i + 1) : undefined
    })
  }
  multiStageRocketPhysics.configureStages(configs)
}

// 环境参数处理函数
const handleTemperatureChange = (value: number) => {
  // 更新温度相关的物理参数
  waterRocketPhysics.setTemperature(value)
}

const handleWindSpeedChange = (value: number) => {
  // 更新风速相关的物理参数
  waterRocketPhysics.setWindSpeed(value)
}

const handleWindDirectionChange = (value: number) => {
  // 更新风向相关的物理参数
  waterRocketPhysics.setWindDirection(value)
}

const handleReset = () => {
  isLaunched.value = false
  if (waterJetMesh) {
    waterJetMesh.visible = false
  }
  model.rotation.set(0, 0, 0)
  model.position.set(0, 0, 0)
  waterRocketPhysics.reset()
  multiStageRocketPhysics.reset()
}

const renderKatex = (text: string) => {
  return katex.renderToString(text, {
    throwOnError: false,
    output: 'html'
  })
}

const getConfig = () => {
  return {
    temperature: temperature.value,
    windSpeed: windSpeed.value,
    windDirection: windDirection.value,
    angle: angle.value,
    isMultiStage: isMultiStage.value
  }
}

const setConfig = (config: Record<string, any>) => {
  if (config.temperature !== undefined) {
    temperature.value = config.temperature
    handleTemperatureChange()
  }
  if (config.windSpeed !== undefined) {
    windSpeed.value = config.windSpeed
    handleWindSpeedChange()
  }
  if (config.windDirection !== undefined) {
    windDirection.value = config.windDirection
    handleWindDirectionChange()
  }
  if (config.angle !== undefined) {
    angle.value = config.angle
    handleAngleChange()
  }
  if (config.isMultiStage !== undefined) {
    isMultiStage.value = config.isMultiStage
  }
}

defineExpose({
  getConfig,
  setConfig
})

onMounted(() => {
  initScene()
  animate()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
  }
  window.removeEventListener('resize', handleResize)
  renderer.dispose()
})
</script>

<template>
  <div class="chart-3d-container">
    <div ref="container" class="canvas-container"></div>
    <div class="control-panel" v-if="!readonly">
      <div class="parameters">
        <h3>环境参数</h3>
        <div class="parameter-item">
          <label>温度 (°C)</label>
          <el-slider v-model="temperature" :min="-10" :max="40" :step="1" @change="handleTemperatureChange" />
        </div>
        <div class="parameter-item">
          <label>风速 (m/s)</label>
          <el-slider v-model="windSpeed" :min="0" :max="20" :step="0.5" @change="handleWindSpeedChange" />
        </div>
        <div class="parameter-item">
          <label>风向 (°)</label>
          <el-slider v-model="windDirection" :min="0" :max="360" :step="5" @change="handleWindDirectionChange" />
        </div>
        <div class="parameter-item">
          <label>发射角度 (°)</label>
          <el-slider v-model="angle" :min="0" :max="90" @change="handleAngleChange" />
        </div>
      </div>
      <div class="buttons">
        <el-button type="primary" @click="handleLaunch" :disabled="isLaunched">发射</el-button>
        <el-button @click="handleReset" :disabled="!isLaunched">重置</el-button>
      </div>
    </div>
    <div class="data-panel">
      <div class="real-time-data">
        <h3>实时数据</h3>
        <p>速度: {{ velocity.toFixed(2) }} m/s</p>
        <p>高度: {{ height.toFixed(2) }} m</p>
        <p>距离: {{ distance.toFixed(2) }} m</p>
        <p>飞行时间: {{ flightTime.toFixed(2) }} s</p>
      </div>
      <div class="equations">
        <h3>运动方程：</h3>
        <div v-for="(eq, index) in equations" :key="index" v-html="renderKatex(eq)"></div>
      </div>
      <div class="parameters">
        <h3>参数：</h3>
        <div v-for="(param, index) in parameters" :key="index" v-html="renderKatex(param)"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chart-3d-container {
  position: relative;
  width: 100%;
  height: 100%;
}

.canvas-container {
  width: 100%;
  height: 100%;
}

.control-panel {
  position: absolute;
  top: 20px;
  left: 20px;
  background: linear-gradient(135deg, rgba(60, 60, 60, 0.8), rgba(30, 30, 30, 0.8));
  color: #ffffff;
  padding: 20px;
  border-radius: 8px;
  font-family: 'SF Mono', Monaco, Menlo, Consolas, monospace;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.1);
  width: 300px;
}

.parameter-item {
  margin: 15px 0;
}

.parameter-item label {
  display: block;
  margin-bottom: 5px;
}

.buttons {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.data-panel {
  position: absolute;
  top: 20px;
  right: 20px;
  background: linear-gradient(135deg, rgba(60, 60, 60, 0.8), rgba(30, 30, 30, 0.8));
  color: #ffffff;
  padding: 20px;
  border-radius: 8px;
  font-family: 'SF Mono', Monaco, Menlo, Consolas, monospace;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.1);
  min-width: 250px;
}

.data-panel h3 {
  margin: 0 0 10px 0;
  font-size: 14px;
  color: #4a9eff;
}

.equations div,
.parameters div {
  margin: 5px 0;
  font-size: 13px;
}
</style>
