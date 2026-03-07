import { ref } from 'vue'

export class WaterRocketPhysics {
  private static instance: WaterRocketPhysics

  // 火箭参数
  private bottleVolume = ref(2000) // 瓶子容积(ml)
  private bottleMass = ref(100) // 瓶子质量(g)
  private bottleDiameter = ref(0.1) // 瓶身直径(m)
  private nozzleDiameter = ref(0.02) // 喷嘴直径(m)
  private waterVolume = ref(1000) // 水量(ml)
  private pressure = ref(3) // 压力(bar)
  private angle = ref(45) // 发射角度(度)

  // 环境参数
  private gravity: number = 9.81 // 重力加速度(m/s²)
  private airDensity: number = 1.225 // 空气密度(kg/m³)
  private dragCoefficient: number = 0.5 // 阻力系数
  private temperature = ref(20) // 环境温度(℃)
  private windSpeed = ref(0) // 风速(m/s)
  private windDirection = ref(0) // 风向(度)

  // 计算结果
  private velocity = ref(0) // 初始速度(m/s)
  private height = ref(0) // 最大高度(m)
  private distance = ref(0) // 最大距离(m)
  private flightTime = ref(0) // 飞行时间(s)
  private currentTime = ref(0) // 当前时间(s)
  private vx = ref(0) // x方向速度分量(m/s)
  private vy = ref(0) // y方向速度分量(m/s)

  private constructor() {}

  public static getInstance(): WaterRocketPhysics {
    if (!WaterRocketPhysics.instance) {
      WaterRocketPhysics.instance = new WaterRocketPhysics()
    }
    return WaterRocketPhysics.instance
  }

  // 设置参数
  public setWaterVolume(volume: number) {
    this.waterVolume.value = volume
    this.calculate()
  }

  public setPressure(pressure: number) {
    this.pressure.value = pressure
    this.calculate()
  }

  public setAngle(angle: number) {
    this.angle.value = angle
    this.calculate()
  }

  public setBottleVolume(volume: number) {
    this.bottleVolume.value = volume
    this.calculate()
  }

  public setBottleMass(mass: number) {
    this.bottleMass.value = mass
    this.calculate()
  }

  public setBottleDiameter(diameter: number) {
    this.bottleDiameter.value = diameter
    this.calculate()
  }

  public setNozzleDiameter(diameter: number) {
    this.nozzleDiameter.value = diameter
    this.calculate()
  }

  public setTemperature(temp: number) {
    this.temperature.value = temp
    // 根据温度更新空气密度（简化模型）
    this.airDensity = 1.225 * (273.15 / (273.15 + this.temperature.value))
    this.calculate()
  }

  public setWindSpeed(speed: number) {
    this.windSpeed.value = speed
    this.calculate()
  }

  public setWindDirection(direction: number) {
    this.windDirection.value = direction
    this.calculate()
  }

  // 获取计算结果
  public getVelocity() { return this.velocity.value }
  public getHeight() { return this.height.value }
  public getDistance() { return this.distance.value }
  public getFlightTime() { return this.flightTime.value }
  public getWaterVolume() { return this.waterVolume.value }
  public getPressure() { return this.pressure.value }
  public getAngle() { return this.angle.value }
  public getBottleVolume() { return this.bottleVolume.value }
  public getBottleMass() { return this.bottleMass.value }
  public getBottleDiameter() { return this.bottleDiameter.value }
  public getNozzleDiameter() { return this.nozzleDiameter.value }
  public getTemperature() { return this.temperature.value }
  public getWindSpeed() { return this.windSpeed.value }
  public getWindDirection() { return this.windDirection.value }

  // 计算发射参数
  private calculate() {
    // 计算初始速度
    const pressurePa = this.pressure.value * 100000 // 转换为帕斯卡
    const waterMass = this.waterVolume.value / 1000 // 转换为kg
    const airVolume = (this.bottleVolume - this.waterVolume.value) / 1000000 // 转换为m³
    
    // 使用伯努利方程计算出口速度
    this.velocity.value = Math.sqrt(2 * pressurePa / (waterMass / airVolume))

    // 计算射程
    const angleRad = this.angle.value * Math.PI / 180
    const v0 = this.velocity.value
    
    this.height.value = Math.pow(v0 * Math.sin(angleRad), 2) / (2 * this.gravity)
    this.distance.value = Math.pow(v0, 2) * Math.sin(2 * angleRad) / this.gravity
    this.flightTime.value = 2 * v0 * Math.sin(angleRad) / this.gravity

    // 初始化速度分量
    this.vx.value = v0 * Math.cos(angleRad)
    this.vy.value = v0 * Math.sin(angleRad)
    this.currentTime.value = 0
  }

  // 更新物理状态
  public update(deltaTime: number) {
    if (this.currentTime.value >= this.flightTime.value) {
      return
    }

    this.currentTime.value += deltaTime
    
    // 计算空气阻力
    const velocity = Math.sqrt(Math.pow(this.vx.value, 2) + Math.pow(this.vy.value, 2))
    const area = Math.PI * Math.pow(this.bottleDiameter.value / 2, 2)
    const dragForce = 0.5 * this.airDensity * Math.pow(velocity, 2) * this.dragCoefficient * area
    
    // 考虑风力影响
    const windRad = this.windDirection.value * Math.PI / 180
    const windVx = this.windSpeed.value * Math.cos(windRad)
    const windVy = this.windSpeed.value * Math.sin(windRad)
    
    // 计算相对速度
    const relativeVx = this.vx.value - windVx
    const relativeVy = this.vy.value - windVy
    const relativeV = Math.sqrt(Math.pow(relativeVx, 2) + Math.pow(relativeVy, 2))
    
    // 计算阻力分量
    const dragX = relativeVx / relativeV * dragForce
    const dragY = relativeVy / relativeV * dragForce
    
    // 更新速度（考虑空气阻力和风力）
    const mass = (this.bottleMass.value + this.waterVolume.value) / 1000 // 转换为kg
    this.vx.value -= (dragX / mass) * deltaTime
    this.vy.value -= (this.gravity + dragY / mass) * deltaTime
    
    // 更新位置
    this.distance.value += this.vx.value * deltaTime
    this.height.value += this.vy.value * deltaTime

    // 确保高度不会小于0
    if (this.height.value < 0) {
      this.height.value = 0
      this.currentTime.value = this.flightTime.value
    }
  }

  // 获取运动方程
  public getEquations(): string[] {
    return [
      'v₀ = √(2P/ρ)', // 初速度方程
      'h = (v₀²sin²θ)/(2g)', // 最大高度方程
      'R = (v₀²sin2θ)/g', // 射程方程
      't = 2v₀sinθ/g' // 飞行时间方程
    ]
  }

  // 获取当前参数说明
  public getParameterDescriptions(): string[] {
    return [
      `P = ${this.pressure.value} bar (压力)`,
      `θ = ${this.angle.value}° (发射角度)`,
      `V = ${this.waterVolume.value} ml (水量)`,
      `v₀ = ${this.velocity.value.toFixed(2)} m/s (初速度)`,
      `h = ${this.height.value.toFixed(2)} m (最大高度)`,
      `R = ${this.distance.value.toFixed(2)} m (射程)`,
      `t = ${this.flightTime.value.toFixed(2)} s (飞行时间)`
    ]
  }

  // 重置状态
  public reset() {
    this.velocity.value = 0
    this.height.value = 0
    this.distance.value = 0
    this.flightTime.value = 0
    this.currentTime.value = 0
    this.vx.value = 0
    this.vy.value = 0
    this.calculate()
  }
}