<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, markRaw } from 'vue'

import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader'
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader'
import { useDark } from '@vueuse/core'
import { ElMessage } from 'element-plus'
import Stats from 'stats.js'
import particleFire from 'three-particle-fire';
try { particleFire.install( { THREE: THREE } ); } catch (e) { }

import { EventCenter, EventNames } from '../../utils/EventCenter'

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
const showGrid = ref(true)
const showAxes = ref(true)
const currentCamera = ref('default')

const modelOptions = [
  { key: 'arrow', name: '箭头' },
  { key: 'cube', name: '方块' },
  { key: 'rocket', name: '火箭' }
]

const isDark = useDark()
const sceneBackground = computed(() => isDark.value ? 0x1a1a1a : 0xf0f0f0)
const gridColor = computed(() => isDark.value ? 0x404040 : 0x808080)
const modelColor = computed(() => isDark.value ? 0x03370ff : 0x03370ff)

const scene = ref<THREE.Scene>()
const clock = ref<THREE.Clock>()
const camera = ref<THREE.PerspectiveCamera>()
const renderer = ref<THREE.WebGLRenderer>()
const model = ref<THREE.Group>()
let controls: OrbitControls
let animationFrameId: number
let stats: Stats
let rocketFireMesh: any
let gridHelper: THREE.GridHelper
let axesHelper: THREE.AxesHelper

const cameraPresets = [
  { key: 'default', name: '默认视角', position: [2, 2, 2] },
  { key: 'front', name: '正视图', position: [0, 0, 5] },
  { key: 'top', name: '俯视图', position: [0, 5, 0.1] },
  { key: 'side', name: '侧视图', position: [5, 0, 0] },
  { key: 'iso', name: '等轴测', position: [3, 3, 3] }
]

const initScene = () => {
  scene.value = markRaw(new THREE.Scene())
  scene.value.background = new THREE.Color(sceneBackground.value)

  axesHelper = new THREE.AxesHelper(1.6)
  scene.value.add(axesHelper)

  gridHelper = new THREE.GridHelper(10, 10, gridColor.value, gridColor.value)
  scene.value.add(gridHelper)

  clock.value = markRaw(new THREE.Clock())

  if (!props.readonly) {
    stats = new Stats()
    stats.showPanel(0)
    stats.dom.style.position = 'absolute'
    stats.dom.style.left = '8px'
    stats.dom.style.bottom = '60px'
    container.value!.appendChild(stats.dom)
  }

  const aspect = container.value!.clientWidth / container.value!.clientHeight
  camera.value = markRaw(new THREE.PerspectiveCamera(75, aspect, 0.1, 1000))
  camera.value.position.set(2, 2, 2)
  camera.value.lookAt(0, 0, 0)

  renderer.value = markRaw(new THREE.WebGLRenderer({ antialias: true }))
  renderer.value.setSize(container.value!.clientWidth, container.value!.clientHeight)
  container.value!.appendChild(renderer.value.domElement)

  controls = new OrbitControls(camera.value, renderer.value.domElement)
  controls.enableDamping = true
  controls.enablePan = true
  controls.enableZoom = true

  createModel(currentModel.value)
  addLights()
}

const createArrowModel = () => {
  const group = new THREE.Group()

  const bodyGeometry = new THREE.ConeGeometry(0.3, 1.2, 12)
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: modelColor.value,
    metalness: 0.8,
    roughness: 0.2,
    emissive: modelColor.value,
    emissiveIntensity: 0.2,
  })
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial)
  body.position.set(0, 0.6, 0)
  group.add(body)

  const tailGeometry = new THREE.CylinderGeometry(0.15, 0.25, 0.8, 12)
  const tailMaterial = new THREE.MeshStandardMaterial({
    color: modelColor.value,
    metalness: 0.8,
    roughness: 0.2,
    emissive: modelColor.value,
    emissiveIntensity: 0.2,
  })
  const tail = new THREE.Mesh(tailGeometry, tailMaterial)
  tail.position.set(0, -0.4, 0)
  group.add(tail)

  return group
}

const createRocketModel = () => {
  return new Promise<THREE.Group>((resolve) => {
    const group = new THREE.Group()
    
    const mtlLoader = new MTLLoader()
    mtlLoader.load('./models/starshipv2.mtl', (mtl) => {
      mtl.preload()
      const objLoader = new OBJLoader()
      objLoader.setMaterials(mtl)
      
      objLoader.load('./models/starshipv2.obj', (root) => {
        root.scale.set(0.02, 0.02, 0.02)
        root.position.set(0.3, 1.3, 0.3)
        
        root.traverse((child: any) => {
          if (child.isMesh) {
            child.material = new THREE.MeshStandardMaterial({
              color: 0x888888,
              metalness: 0.9,
              roughness: 0.2,
            })
          }
        })
        
        group.add(root)
        
        const fireRadius = 0.09
        const fireHeight = 1.5
        const particleCount = 800
        const height = window.innerHeight
        
        const geometry0 = new particleFire.Geometry(fireRadius, fireHeight, particleCount)
        const material0 = new particleFire.Material({ color: 0x00aaff })
        material0.setPerspective(camera.value!.fov, height)
        rocketFireMesh = new THREE.Points(geometry0, material0)
        rocketFireMesh.rotation.x = Math.PI
        rocketFireMesh.position.set(-0.1, 0.0, 0.3)
        
        group.add(rocketFireMesh)
        group.position.set(0.15, -1, -0.3)
        
        resolve(group)
      }, undefined, (error) => {
        console.error('加载火箭模型失败:', error)
        resolve(createSimpleRocketModel())
      })
    }, undefined, (error) => {
      console.error('加载材质失败:', error)
      resolve(createSimpleRocketModel())
    })
  })
}

const createSimpleRocketModel = () => {
  const group = new THREE.Group()

  const bodyGeometry = new THREE.ConeGeometry(0.2, 0.5, 12)
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: modelColor.value,
    metalness: 0.6,
    roughness: 0.3,
    envMapIntensity: 1.2
  })
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial)
  body.position.set(0, 1.55, 0)
  group.add(body)

  const tailGeometry = new THREE.CylinderGeometry(0.2, 0.2, 1.6)
  const tailMaterial = new THREE.MeshStandardMaterial({
    color: modelColor.value,
    metalness: 0.6,
    roughness: 0.3,
    envMapIntensity: 1.2
  })
  const tail = new THREE.Mesh(tailGeometry, tailMaterial)
  tail.position.set(0, 0.5, 0)
  group.add(tail)

  const fireRadius = 0.09;
  const fireHeight = 1.5;
  const particleCount = 800;
  const height = window.innerHeight;

  const geometry0 = new particleFire.Geometry( fireRadius, fireHeight, particleCount );
  const material0 = new particleFire.Material( { color: 0x00aaff } );
  material0.setPerspective( camera.value!.fov, height );
  rocketFireMesh = new THREE.Points( geometry0, material0 );
  rocketFireMesh.rotation.x = 3.14
  rocketFireMesh.position.set(0, -0.42, 0)

  group.add(rocketFireMesh)

  return group
}

const createCubeModel = () => {
  const group = new THREE.Group()

  const geometry = new THREE.BoxGeometry(1, 1, 1)
  const material = new THREE.MeshStandardMaterial({
    color: modelColor.value,
    metalness: 0.8,
    roughness: 0.2,
    emissive: modelColor.value,
    emissiveIntensity: 0.2,
  })
  const cube = new THREE.Mesh(geometry, material)
  cube.position.set(0, 0.5, 0)
  group.add(cube)

  return group
}

const createModel = async (type: string) => {
  if (model.value && scene.value) {
    scene.value.remove(model.value)
  }

  let newModel: THREE.Group

  switch (type) {
    case 'rocket':
      newModel = await createRocketModel()
      break
    case 'arrow':
      newModel = createArrowModel()
      break
    case 'cube':
      newModel = createCubeModel()
      break
    case 'custom':
      if (customModel.value) {
        newModel = customModel.value
      } else {
        newModel = createArrowModel()
      }
      break
    default:
      newModel = createArrowModel()
  }

  model.value = markRaw(newModel)
  scene.value!.add(model.value)
}

const addLights = () => {
  const ambientLight = new THREE.AmbientLight(0xffffff, 6)
  scene.value!.add(ambientLight)

  const mainLight = new THREE.DirectionalLight(0xffffff, 12)
  mainLight.position.set(5, 5, 10)
  scene.value!.add(mainLight)

  const fillLight = new THREE.DirectionalLight(0xffffff, 1)
  fillLight.position.set(-5, 3, -5)
  scene.value!.add(fillLight)

  const pointLight = new THREE.PointLight(0x4a9eff, 1, 10)
  pointLight.position.set(2, 2, 2)
  scene.value!.add(pointLight)
}

const animate = () => {
  animationFrameId = requestAnimationFrame(animate)
  
  if (stats) stats.begin()
  
  if (model.value) {
    model.value.rotation.set(
      THREE.MathUtils.degToRad(roll.value),
      THREE.MathUtils.degToRad(yaw.value),
      THREE.MathUtils.degToRad(pitch.value)
    )
  }
  if (rocketFireMesh && clock.value) {
    rocketFireMesh.material.update( clock.value.getDelta() )
  }

  controls.update()
  renderer.value!.render(scene.value!, camera.value!)
  
  if (stats) stats.end()
}

const handleResize = () => {
  if (container.value && camera.value && renderer.value) {
    const width = container.value.clientWidth
    const height = container.value.clientHeight
    camera.value.aspect = width / height
    camera.value.updateProjectionMatrix()
    renderer.value.setSize(width, height)

    if (rocketFireMesh) {
      rocketFireMesh.material.setPerspective( camera.value.fov, height )
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
  const models = ['arrow', 'cube', 'rocket']
  const currentIndex = models.indexOf(currentModel.value)
  currentModel.value = models[(currentIndex + 1) % models.length]
  createModel(currentModel.value)
}

const uploadModel = () => {
  fileInput.value?.click()
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
        (gltf) => {
          customModel.value = markRaw(gltf.scene)
          currentModel.value = 'custom'
          createModel('custom')
        },
        (error) => {
          ElMessage.error('加载模型失败：' + error.message)
        }
      )
    } else if (extension === 'obj') {
      const loader = new OBJLoader()
      try {
        const object = loader.parse(contents as string)
        customModel.value = markRaw(object)
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

const setCameraPreset = (presetKey: string) => {
  const preset = cameraPresets.find(p => p.key === presetKey)
  if (preset && camera.value) {
    camera.value.position.set(...preset.position as [number, number, number])
    camera.value.lookAt(0, 0, 0)
    currentCamera.value = presetKey
    controls.update()
  }
}

const toggleGrid = () => {
  showGrid.value = !showGrid.value
  if (gridHelper) {
    gridHelper.visible = showGrid.value
  }
}

const toggleAxes = () => {
  showAxes.value = !showAxes.value
  if (axesHelper) {
    axesHelper.visible = showAxes.value
  }
}

const resetView = () => {
  setCameraPreset('default')
  pitch.value = 0
  roll.value = 0
  yaw.value = 0
}

const getConfig = () => {
  return {
    modelType: currentModel.value,
    showGrid: showGrid.value,
    showAxes: showAxes.value,
    cameraPreset: currentCamera.value
  }
}

const setConfig = (config: Record<string, any>) => {
  if (config.modelType) {
    currentModel.value = config.modelType
    createModel(currentModel.value)
  }
  if (config.showGrid !== undefined) {
    showGrid.value = config.showGrid
    if (gridHelper) gridHelper.visible = showGrid.value
  }
  if (config.showAxes !== undefined) {
    showAxes.value = config.showAxes
    if (axesHelper) axesHelper.visible = showAxes.value
  }
  if (config.cameraPreset) {
    setCameraPreset(config.cameraPreset)
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
  
  if (renderer.value) {
    renderer.value.dispose()
  }
})
</script>

<template>
  <div class="chart-3d-container">
    <div ref="container" class="canvas-container"></div>
    
    <div class="data-panel">
      <div class="data-row">
        <span class="label">Pitch</span>
        <span class="value">{{ pitch.toFixed(1) }}°</span>
      </div>
      <div class="data-row">
        <span class="label">Roll</span>
        <span class="value">{{ roll.toFixed(1) }}°</span>
      </div>
      <div class="data-row">
        <span class="label">Yaw</span>
        <span class="value">{{ yaw.toFixed(1) }}°</span>
      </div>
    </div>

    <div class="model-panel">
      <el-button
        v-for="model in modelOptions"
        :key="model.key"
        :type="currentModel === model.key ? 'primary' : 'default'"
        size="small"
        @click="currentModel = model.key; createModel(currentModel)"
      >
        {{ model.name }}
      </el-button>
      <el-button @click="uploadModel" size="small">导入</el-button>
    </div>

    <div class="control-panel">
      <div class="control-section">
        <el-button
          v-for="preset in cameraPresets"
          :key="preset.key"
          :type="currentCamera === preset.key ? 'primary' : 'default'"
          size="small"
          @click="setCameraPreset(preset.key)"
        >
          {{ preset.name }}
        </el-button>
      </div>

      <div class="control-section">
        <el-button @click="resetView" size="small">重置</el-button>
        <el-button @click="toggleGrid" size="small" :type="showGrid ? 'default' : 'info'">网格</el-button>
        <el-button @click="toggleAxes" size="small" :type="showAxes ? 'default' : 'info'">轴</el-button>
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

<style scoped lang="less">
.chart-3d-container {
  position: relative;
  width: 100%;
  height: 100%;
  background: var(--el-bg-color);
}

.canvas-container {
  width: 100%;
  height: 100%;
}

.data-panel {
  position: absolute;
  top: 8px;
  right: 8px;
  margin-bottom: 8px;
  background: rgba(0, 0, 0, 0.8);
  color: #fff;
  padding: 6px 10px;
  border-radius: 6px;
  font-family: 'SF Mono', Monaco, Menlo, Consolas, monospace;
  font-size: 12px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);

  .data-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    
    .label {
      color: rgba(255, 255, 255, 0.5);
      font-size: 11px;
    }
    
    .value {
      font-weight: 600;
      color: #4fc3f7;
      min-width: 45px;
      text-align: right;
    }
  }
}

.model-panel {
  position: absolute;
  top: 100px;
  right: 8px;
  display: flex;
  gap: 4px;
  flex-direction: column;
}

.control-panel {
  position: absolute;
  bottom: 8px;
  left: 8px;
  right: 8px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.control-section {
  background: rgba(0, 0, 0, 0.8);
  border-radius: 6px;
  padding: 6px 10px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

:deep(.dark) {
  .data-panel,
  .control-section {
    background: rgba(30, 30, 30, 0.9);
  }
}
</style>
