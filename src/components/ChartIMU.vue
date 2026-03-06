<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
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
import particleFire from 'three-particle-fire';
try { particleFire.install( { THREE: THREE } ); } catch (e) { }

import { EventCenter, EventNames } from '../utils/EventCenter'

interface Props {
  readonly?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false
})

const eventCenter = EventCenter.getInstance()

const container = ref<HTMLDivElement | null>(null)
const pitch = ref(0)
const roll = ref(0)
const yaw = ref(0)
const currentModel = ref('rocket')
const customModel = ref<THREE.Group | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

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
let rocketFireMesh: any

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

  createModel(currentModel.value)
  addLights()
}

const createArrowModel = () => {
  const group = new THREE.Group()

  // 箭头主体
  const bodyGeometry = new THREE.ConeGeometry(0.5, 1.4, 12)
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: modelColor.value,
    metalness: 0.6,
    roughness: 0.3,
    envMapIntensity: 1.2
  })
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial)
  body.position.set(0, 0, -0.6)
  body.rotation.x = -Math.PI / 2
  group.add(body)

  const tailGeometry = new THREE.BoxGeometry(0.4, 0.4, 1)
  const tailMaterial = new THREE.MeshStandardMaterial({
    color: modelColor.value,
    metalness: 0.6,
    roughness: 0.3,
    envMapIntensity: 1.2
  })
  const tail = new THREE.Mesh(tailGeometry, tailMaterial)
  tail.position.set(0, 0, 0.3)
  group.add(tail)

  return group
}

const createRocketModel = () => {
  const group = new THREE.Group()

  // 箭头主体
  const bodyGeometry = new THREE.ConeGeometry(0.2, 0.5, 12)
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: modelColor.value,
    metalness: 0.6,
    roughness: 0.3,
    envMapIntensity: 1.2
  })
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial)
  body.position.set(0, 1.05, 0)
  // body.rotation.x = -Math.PI / 2
  group.add(body)

  const tailGeometry = new THREE.CylinderGeometry(0.2, 0.2, 1.6)
  const tailMaterial = new THREE.MeshStandardMaterial({
    color: modelColor.value,
    metalness: 0.6,
    roughness: 0.3,
    envMapIntensity: 1.2
  })
  const tail = new THREE.Mesh(tailGeometry, tailMaterial)
  tail.position.set(0, 0, 0)
  group.add(tail)

  const fireRadius = 0.09;
  const fireHeight = 1.5;
  const particleCount = 800;
  const height = window.innerHeight;

  const geometry0 = new particleFire.Geometry( fireRadius, fireHeight, particleCount );
  const material0 = new particleFire.Material( { color: 0xff2200 } );
  material0.setPerspective( camera.fov, height );
  rocketFireMesh = new THREE.Points( geometry0, material0 );
  rocketFireMesh.rotation.x = 3.14
  rocketFireMesh.position.set(0, -0.92, 0)

  group.add(rocketFireMesh)

  return group
}

const createCubeModel = () => {
  const group = new THREE.Group()

  const geometry = new THREE.BoxGeometry(1, 1, 1)
  const material = new THREE.MeshStandardMaterial({
    color: modelColor.value,
    metalness: 0.7,
    roughness: 0.3,
    envMapIntensity: 1
  })
  const cube = new THREE.Mesh(geometry, material)
  group.add(cube)

  return group
}

const createModel = (type: string) => {
  if (model) {
    scene.remove(model)
  }

  switch (type) {
    case 'rocket':
      model = createRocketModel()
      break
    case 'arrow':
      model = createArrowModel()
      break
    case 'cube':
      model = createCubeModel()
      break
    case 'custom':
      if (customModel) {
        model = customModel.value!
      } else {
        model = createArrowModel()
      }
      break
    default:
      model = createArrowModel()
  }

  scene.add(model)
}

const handleFileSelect = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  const extension = file.name.split('.').pop()?.toLowerCase()
  const reader = new FileReader()

  reader.onload = (e) => {
    const contents = e.target?.result
    if (!contents) return

    if (extension === 'gltf' || extension === 'glb') {
      const loader = new GLTFLoader()
      loader.parse(contents as string, '', 
      // @ts-ignore
        (gltf) => {
          customModel.value = gltf.scene
          currentModel.value = 'custom'
          createModel('custom')
        },
        // @ts-ignore
        (error) => {
          ElMessage.error('加载模型失败：' + error.message)
        }
      )
    } else if (extension === 'obj') {
      const loader = new OBJLoader()
      try {
        const object = loader.parse(contents as string)
        customModel.value = object
        currentModel.value = 'custom'
        createModel('custom')
      } catch (error) {
        ElMessage.error('加载模型失败：' + (error as Error).message)
      }
    } else {
      ElMessage.error('不支持的文件格式，请使用.gltf、.glb或.obj格式的3D模型文件')
    }
  }

  reader.readAsText(file)
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
  animationFrameId = requestAnimationFrame(animate)
  stats.begin()
  
  if (model) {
    model.rotation.set(
      THREE.MathUtils.degToRad(roll.value),
      THREE.MathUtils.degToRad(yaw.value),
      THREE.MathUtils.degToRad(pitch.value)
    )
  }
  if (rocketFireMesh) {
    rocketFireMesh.material.update( delta );
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

    if (rocketFireMesh) {
      rocketFireMesh.material.setPerspective( camera.fov, height );
    }
  }
}

const handleImuData = (data: any) => {
  if (!data || typeof data.pitch !== 'number') return
  
  const { pitch: p, roll: r, yaw: y } = data
  pitch.value = p
  roll.value = r
  yaw.value = y
}

const switchModel = () => {
  if (currentModel.value === 'arrow') {
    currentModel.value = 'cube'
  } else if (currentModel.value === 'cube') {
    currentModel.value = 'rocket'
  } else if (currentModel.value === 'rocket') {
    currentModel.value = 'arrow'
  } else {
    currentModel.value = 'arrow'
  }
  createModel(currentModel.value)
}

const uploadModel = () => {
  fileInput.value?.click()
}

const getConfig = () => {
  return {
    modelType: currentModel.value
  }
}

const setConfig = (config: Record<string, any>) => {
  if (config.modelType) {
    currentModel.value = config.modelType
    createModel(currentModel.value)
  }
}

defineExpose({
  getConfig,
  setConfig
})

onMounted(() => {
  initScene()
  animate()

  eventCenter.on(EventNames.DATA_UPDATE, handleImuData)
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
  }
  
  eventCenter.off(EventNames.DATA_UPDATE, handleImuData)
  window.removeEventListener('resize', handleResize)
  renderer.dispose()
})
</script>

<template>
  <div class="chart-3d-container">
    <div ref="container" class="canvas-container"></div>
    <div class="data-panel">
      <div>Pitch: {{ pitch.toFixed(2) }}°</div>
      <div>Roll: {{ roll.toFixed(2) }}°</div>
      <div>Yaw: {{ yaw.toFixed(2) }}°</div>
      <div class="model-controls" v-if="!readonly">
        <el-button class="model-switch" @click="switchModel" size="small">
          切换模型
        </el-button>
        <el-button class="model-upload" @click="uploadModel" size="small">
          导入模型
        </el-button>
        <input
          ref="fileInput"
          type="file"
          accept=".gltf,.glb,.obj"
          style="display: none"
          @change="handleFileSelect"
        />
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

.data-panel {
  position: absolute;
  top: 20px;
  right: 20px;
  background: linear-gradient(135deg, rgba(60, 60, 60, 0.8), rgba(30, 30, 30, 0.8));
  color: #ffffff;
  padding: 15px;
  border-radius: 8px;
  font-family: 'SF Mono', Monaco, Menlo, Consolas, monospace;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.data-panel div {
  margin: 5px 0;
}

.model-controls {
  margin-top: 10px;
  display: flex;
  gap: 8px;
}

.model-switch,
.model-upload {
  flex: 1;
}
</style>