import { ref } from 'vue'

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

class WaterRocketPhysicsInstance {
  // 火箭参数
  private bottleVolume = 2000 // 瓶子容积(ml)
  private bottleMass = 100 // 瓶子质量(g)
  private bottleDiameter = 0.1 // 瓶身直径(m)
  private nozzleDiameter = 0.02 // 喷嘴直径(m)
  private waterVolume = 1000 // 水量(ml)
  private pressure = 3 // 压力(bar)
  private angle = 45 // 发射角度(度)

  // 环境参数
  private gravity: number = 9.81
  private airDensity: number = 1.225
  private dragCoefficient: number = 0.5
  private temperature = 20
  private windSpeed = 0
  private windDirection = 0

  // 计算结果
  private _velocity = 0
  private _height = 0
  private _distance = 0
  private _flightTime = 0
  private currentTime = 0
  private vx = 0
  private vy = 0

  constructor(config?: StageConfig) {
    if (config) {
      this.bottleVolume = config.bottleVolume
      this.bottleMass = config.bottleMass
      this.bottleDiameter = config.bottleDiameter
      this.nozzleDiameter = config.nozzleDiameter
      this.waterVolume = config.waterVolume
      this.pressure = config.pressure
    }
    this.calculate()
  }

  public setWaterVolume(volume: number) {
    this.waterVolume = volume
    this.calculate()
  }

  public setPressure(pressure: number) {
    this.pressure = pressure
    this.calculate()
  }

  public setAngle(angle: number) {
    this.angle = angle
    this.calculate()
  }

  public setBottleVolume(volume: number) {
    this.bottleVolume = volume
    this.calculate()
  }

  public setBottleMass(mass: number) {
    this.bottleMass = mass
    this.calculate()
  }

  public setBottleDiameter(diameter: number) {
    this.bottleDiameter = diameter
    this.calculate()
  }

  public setNozzleDiameter(diameter: number) {
    this.nozzleDiameter = diameter
    this.calculate()
  }

  public setTemperature(temp: number) {
    this.temperature = temp
    this.airDensity = 1.225 * (273.15 / (273.15 + this.temperature))
    this.calculate()
  }

  public setWindSpeed(speed: number) {
    this.windSpeed = speed
    this.calculate()
  }

  public setWindDirection(direction: number) {
    this.windDirection = direction
    this.calculate()
  }

  public getVelocity() { return this._velocity }
  public getHeight() { return this._height }
  public getDistance() { return this._distance }
  public getFlightTime() { return this._flightTime }
  public getWaterVolume() { return this.waterVolume }
  public getPressure() { return this.pressure }
  public getAngle() { return this.angle }
  public getBottleVolume() { return this.bottleVolume }
  public getBottleMass() { return this.bottleMass }
  public getBottleDiameter() { return this.bottleDiameter }
  public getNozzleDiameter() { return this.nozzleDiameter }
  public getTemperature() { return this.temperature }
  public getWindSpeed() { return this.windSpeed }
  public getWindDirection() { return this.windDirection }

  private calculate() {
    const pressurePa = this.pressure * 100000
    const waterMass = this.waterVolume / 1000
    const airVolume = (this.bottleVolume - this.waterVolume) / 1000000
    
    this._velocity = Math.sqrt(2 * pressurePa / (waterMass / airVolume))

    const angleRad = this.angle * Math.PI / 180
    const v0 = this._velocity
    
    this._height = Math.pow(v0 * Math.sin(angleRad), 2) / (2 * this.gravity)
    this._distance = Math.pow(v0, 2) * Math.sin(2 * angleRad) / this.gravity
    this._flightTime = 2 * v0 * Math.sin(angleRad) / this.gravity

    this.vx = v0 * Math.cos(angleRad)
    this.vy = v0 * Math.sin(angleRad)
    this.currentTime = 0
  }

  public update(deltaTime: number) {
    if (this.currentTime >= this._flightTime) {
      return
    }

    this.currentTime += deltaTime
    
    const velocity = Math.sqrt(Math.pow(this.vx, 2) + Math.pow(this.vy, 2))
    const area = Math.PI * Math.pow(this.bottleDiameter / 2, 2)
    const dragForce = 0.5 * this.airDensity * Math.pow(velocity, 2) * this.dragCoefficient * area
    
    const windRad = this.windDirection * Math.PI / 180
    const windVx = this.windSpeed * Math.cos(windRad)
    const windVy = this.windSpeed * Math.sin(windRad)
    
    const relativeVx = this.vx - windVx
    const relativeVy = this.vy - windVy
    const relativeV = Math.sqrt(Math.pow(relativeVx, 2) + Math.pow(relativeVy, 2))
    
    const dragX = relativeVx / relativeV * dragForce
    const dragY = relativeVy / relativeV * dragForce
    
    const mass = (this.bottleMass + this.waterVolume) / 1000
    this.vx -= (dragX / mass) * deltaTime
    this.vy -= (this.gravity + dragY / mass) * deltaTime
    
    this._distance += this.vx * deltaTime
    this._height += this.vy * deltaTime

    if (this._height < 0) {
      this._height = 0
      this.currentTime = this._flightTime
    }
  }

  public getEquations(): string[] {
    return [
      'v₀ = √(2P/ρ)',
      'h = (v₀²sin²θ)/(2g)',
      'R = (v₀²sin2θ)/g',
      't = 2v₀sinθ/g'
    ]
  }

  public getParameterDescriptions(): string[] {
    return [
      `P = ${this.pressure} bar`,
      `θ = ${this.angle}°`,
      `V = ${this.waterVolume} ml`,
      `v₀ = ${this._velocity.toFixed(2)} m/s`,
      `h = ${this._height.toFixed(2)} m`,
      `R = ${this._distance.toFixed(2)} m`,
      `t = ${this._flightTime.toFixed(2)} s`
    ]
  }

  public reset() {
    this._velocity = 0
    this._height = 0
    this._distance = 0
    this._flightTime = 0
    this.currentTime = 0
    this.vx = 0
    this.vy = 0
    this.calculate()
  }
}

export class MultiStageRocketPhysics {
  private static instance: MultiStageRocketPhysics
  private stages: WaterRocketPhysicsInstance[] = []
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
    this.stages = configs.map(config => new WaterRocketPhysicsInstance(config))
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

  // 获取当前级物理引擎
  public getCurrentStagePhysics(): WaterRocketPhysicsInstance | null {
    return this.stages[this.currentStage.value] || null
  }

  // 获取指定级物理引擎
  public getStagePhysics(index: number): WaterRocketPhysicsInstance | null {
    return this.stages[index] || null
  }

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