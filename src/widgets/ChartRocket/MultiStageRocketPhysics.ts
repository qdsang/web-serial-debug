import { ref } from 'vue'
import { WaterRocketPhysics } from './WaterRocketPhysics'

interface StageConfig {
  bottleCount: number;      // 并联瓶数
  bottleVolume: number;      // 每个瓶子容积(ml)
  bottleMass: number;        // 每个瓶子质量(g)
  bottleDiameter: number;    // 瓶身直径(m)
  nozzleDiameter: number;    // 喷嘴直径(m)
  waterVolume: number;       // 每个瓶子的水量(ml)
  pressure: number;         // 压力(bar)
  separationTime?: number;  // 分离时间(s)
}

export class MultiStageRocketPhysics {
  private static instance: MultiStageRocketPhysics
  private stages: WaterRocketPhysics[] = []
  private stageConfigs: StageConfig[] = []
  private currentStage = ref(0)
  private totalMass = ref(0)
  private totalThrust = ref(0)
  private isMultiStageActive = ref(false)

  private constructor() {}

  public static getInstance(): MultiStageRocketPhysics {
    if (!MultiStageRocketPhysics.instance) {
      MultiStageRocketPhysics.instance = new MultiStageRocketPhysics()
    }
    return MultiStageRocketPhysics.instance
  }

  // 配置多级火箭
  public configureStages(configs: StageConfig[]) {
    this.stageConfigs = configs
    this.stages = configs.map(() => WaterRocketPhysics.getInstance())
    this.currentStage.value = 0
    this.isMultiStageActive.value = configs.length > 1
    this.updateTotalMass()
    this.updateTotalThrust()
  }

  // 更新总质量
  private updateTotalMass() {
    this.totalMass.value = this.stageConfigs.reduce((total, config, index) => {
      if (index >= this.currentStage.value) {
        return total + (config.bottleMass + config.waterVolume) * config.bottleCount
      }
      return total
    }, 0)
  }

  // 更新总推力
  private updateTotalThrust() {
    const currentConfig = this.stageConfigs[this.currentStage.value]
    if (!currentConfig) return

    const pressurePa = currentConfig.pressure * 100000 // 转换为帕斯卡
    const waterMass = currentConfig.waterVolume / 1000 // 转换为kg
    const airVolume = (currentConfig.bottleVolume - currentConfig.waterVolume) / 1000000 // 转换为m³
    
    // 计算单个瓶子的推力
    const singleBottleThrust = Math.sqrt(2 * pressurePa / (waterMass / airVolume))
    
    // 总推力为并联瓶数乘以单个推力
    this.totalThrust.value = singleBottleThrust * currentConfig.bottleCount
  }

  // 检查是否需要分离
  private checkStageSeparation(currentTime: number) {
    const currentConfig = this.stageConfigs[this.currentStage.value]
    if (currentConfig?.separationTime && currentTime >= currentConfig.separationTime) {
      this.separateStage()
    }
  }

  // 分离当前级
  private separateStage() {
    if (this.currentStage.value < this.stageConfigs.length - 1) {
      this.currentStage.value++
      this.updateTotalMass()
      this.updateTotalThrust()
    }
  }

  // 获取当前状态
  public getCurrentStage() { return this.currentStage.value }
  public getTotalMass() { return this.totalMass.value }
  public getTotalThrust() { return this.totalThrust.value }
  public isMultiStage() { return this.isMultiStageActive.value }

  // 获取当前级的配置
  public getCurrentStageConfig(): StageConfig | null {
    return this.stageConfigs[this.currentStage.value] || null
  }

  // 获取所有级的配置
  public getAllStageConfigs(): StageConfig[] {
    return this.stageConfigs
  }

  // 重置状态
  public reset() {
    this.currentStage.value = 0
    this.updateTotalMass()
    this.updateTotalThrust()
    this.stages.forEach(stage => stage.reset())
  }

  // 更新物理状态
  public update(deltaTime: number, currentTime: number) {
    if (this.isMultiStageActive.value) {
      this.checkStageSeparation(currentTime)
    }
    
    const currentStagePhysics = this.stages[this.currentStage.value]
    if (currentStagePhysics) {
      currentStagePhysics.update(deltaTime)
    }
  }
}