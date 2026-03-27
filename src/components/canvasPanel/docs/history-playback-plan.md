# 历史数据回放功能方案

## 一、需求概述

### 1.1 功能目标
- 支持对已接收的串口/WebSocket 历史数据进行回放
- 提供完整的播放器交互（播放/暂停/拖拽/调速）
- 数据需要持久化存储，支持 desktop 模式下本地保存

### 1.2 数据来源
- 串口/WebSocket 实时接收的数据
- 存储在 dataStore 中
- 需要支持跨会话持久化（IndexedDB + 本地文件）

### 1.3 核心交互
- 播放/暂停控制
- 进度条拖拽
- 播放速度调节（0.1x, 0.5x, 1x, 2x, 5x, 10x）
- 支持双向播放（正放/倒放）

---

## 二、现有架构分析

### 2.1 当前 dataStore 结构

```typescript
// src/store/dataStore.ts
interface DataPoint {
  timestamp: number      // 毫秒时间戳
  values: Record<string, number>  // 字段值
}

const dataStore = {
  dataPoints: DataPoint[],         // 数据点列表
  timeRange: [number, number],     // 当前时间范围
  isRealtime: boolean,              // 是否实时模式
  maxDataPoints: number,           // 最大数据点数
  
  addDataPoint(timestamp, values),
  setTimeRange(range),
  toggleRealtime(value),
  clearData()
}
```

### 2.2 问题与挑战

| 问题 | 说明 |
|------|------|
| 内存占用 | 原始数据点可能导致内存溢出 |
| 持久化缺失 | 刷新页面后数据丢失 |
| 回放能力 | 现有 only 支持实时/历史切换，无回放功能 |
| Desktop 模式 | 需要支持本地文件导入/导出 |

---

## 三、方案设计

### 3.1 数据层架构

```
┌─────────────────────────────────────────────────────────────┐
│                        dataStore                             │
├─────────────────────────────────────────────────────────────┤
│  dataPoints: DataPoint[]     ← 原始数据（内存）             │
│  playback: PlaybackState     ← 回放状态管理                 │
│  storage: StorageAdapter     ← 持久化适配器                 │
└─────────────────────────────────────────────────────────────┘
                              ↑
                              │
        ┌─────────────────────┴─────────────────────┐
        │                                           │
   IndexedDB                                  本地文件
 (Web环境)                                   (Desktop)
```

### 3.2 核心数据结构

#### 3.2.1 原始数据类型

```typescript
interface DataPoint {
  id: number              // 唯一标识
  timestamp: number       // 毫秒时间戳
  values: Record<string, number>  // 字段值
}

interface DataSeries {
  id: string
  name: string
  startTime: number       // 开始时间
  endTime: number         // 结束时间
  pointCount: number      // 数据点数量
  fields: string[]        // 包含的字段
  createdAt: number      // 创建时间
}
```

#### 3.2.2 回放状态

```typescript
interface PlaybackState {
  isPlaying: boolean           // 是否正在播放
  isPaused: boolean            // 是否暂停
  currentIndex: number         // 当前数据点索引
  currentTime: number         // 当前时间戳
  speed: number               // 播放速度 (0.1-10)
  direction: PlayDirection     // 播放方向
  
  // 时间范围选择
  rangeStart: number           // 回放范围开始
  rangeEnd: number            // 回放范围结束
  
  // 循环模式
  loopMode: 'none' | 'single' | 'all'
}

enum PlayDirection {
  FORWARD = 1,
  BACKWARD = -1
}
```

#### 3.2.3 存储适配器

```typescript
interface DataStorageAdapter {
  // 保存数据系列
  saveSeries(series: DataSeries, points: DataPoint[]): Promise<void>
  
  // 加载数据系列
  loadSeries(seriesId: string): Promise<{ series: DataSeries, points: DataPoint[] }>
  
  // 列出所有数据系列
  listSeries(): Promise<DataSeries[]>
  
  // 删除数据系列
  deleteSeries(seriesId: string): Promise<void>
  
  // 导出到文件
  exportToFile(seriesId: string, path: string): Promise<void>
  
  // 从文件导入
  importFromFile(path: string): Promise<DataSeries>
}
```

### 3.3 核心模块设计

#### 3.3.1 PlaybackController

```typescript
class PlaybackController {
  private timerId: number | null = null
  private lastFrameTime: number = 0
  
  // 启动回放
  play(): void
  
  // 暂停回放
  pause(): void
  
  // 停止回放
  stop(): void
  
  // 跳转到指定位置
  seek(index: number): void
  seekToTime(timestamp: number): void
  
  // 设置播放速度
  setSpeed(speed: number): void
  
  // 设置播放方向
  setDirection(direction: PlayDirection): void
  
  // 设置回放范围
  setRange(start: number, end: number): void
  
  // 获取当前帧数据
  getCurrentFrame(): DataPoint | null
}
```

#### 3.3.2 渲染节流策略

```typescript
// 回放时不需要每帧都渲染到 UI
// 使用 requestAnimationFrame + 帧跳过策略

const RENDER_THROTTLE = {
  minInterval: 16,    // 最小渲染间隔 (ms)
  maxSkipFrames: 5,  // 最大跳过帧数
  
  shouldRender(lastRenderTime: number): boolean {
    const now = performance.now()
    const elapsed = now - lastRenderTime
    return elapsed >= this.minInterval
  }
}
```

#### 3.3.3 数据分片存储

```typescript
// IndexedDB 分片策略
const STORAGE_CONFIG = {
  // 每个数据块的最大点数
  chunkSize: 10000,
  
  // 自动保存间隔 (ms)
  autoSaveInterval: 30000,
  
  // 最大内存缓存点数
  maxMemoryPoints: 50000,
  
  // 超过此值自动降采样
  samplingThreshold: 100000
}
```

### 3.4 播放器 UI 设计

#### 3.4.1 底部控制栏

```
┌──────────────────────────────────────────────────────────────────┐
│ [⏮] [⏪] [⏯️] [⏩] [⏭]    ──●─────────────  00:15 / 05:30    [1x ▼] │
│   回到起点  后退5秒  播放/暂停  前进5秒  跳到终点   进度条      速度   │
└──────────────────────────────────────────────────────────────────┘
```

#### 3.4.2 控制按钮功能

| 按钮 | 功能 | 快捷键 |
|------|------|--------|
| ⏮ | 跳转到回放起点 | Home |
| ⏪ | 后退指定秒数 | ← |
| ⏯️ | 播放/暂停切换 | Space |
| ⏩ | 前进指定秒数 | → |
| ⏭ | 跳转到回放终点 | End |
| 速度下拉 | 切换播放速度 | 1-6 |
| 进度条 | 拖拽跳转 | 鼠标拖拽 |

#### 3.4.3 速度选项

- 0.1x - 极慢速（详细分析）
- 0.5x - 慢速
- 1.0x - 正常速度
- 2.0x - 快速
- 5.0x - 极快速
- 10x - 最快速（概览）

---

## 四、实施方案

### 4.1 实施阶段

#### 阶段一：数据层改造
1. 扩展 dataStore，添加回放状态管理
2. 实现 PlaybackController 类
3. 添加数据系列管理逻辑

#### 阶段二：持久化支持
1. 实现 IndexedDB 存储适配器
2. 添加 Desktop 模式文件导入/导出
3. 实现数据分片存储

#### 阶段三：UI 实现
1. 重构 TimeRangeControl 为 PlaybackControl
2. 实现播放控制栏组件
3. 添加键盘快捷键支持

#### 阶段四：优化
1. 渲染节流优化
2. 内存占用优化
3. 降采样策略

### 4.2 关键文件修改

```
src/
├── store/
│   ├── dataStore.ts          # 扩展回放状态
│   └── playbackStore.ts       # 新建回放状态管理
├── utils/
│   ├── PlaybackController.ts # 新建回放控制器
│   ├── DataStorage.ts         # 新建存储适配器
│   └── IndexedDB.ts           # 新建 IndexedDB 工具
├── components/
│   └── canvasPanel/
│       ├── PlaybackControl.vue  # 新建播放器控制栏
│       └── TimeRangeControl.vue # 重构/替换
└── widgets/
    └── ...                    # Widget 需支持回放数据源
```

### 4.3 兼容性考虑

| 场景 | 处理方式 |
|------|----------|
| Web 环境 | IndexedDB 存储 |
| Desktop 环境 | 本地文件 + Electron store |
| 数据量巨大 | 自动降采样 + 分页加载 |
| 回放中接收新数据 | 暂停接收或合并到末尾 |

---

## 五、待确认问题

1. **回放时是否继续接收新数据？**
   - 方案A：暂停接收，回放结束后恢复
   - 方案B：同时接收但不显示，回放结束后追加

2. **降采样策略的具体参数？**
   - 超过多少数据点开始降采样？
   - 降采样保留原始峰值还是平均值？

3. **多数据系列管理？**
   - 是否支持同时保存多个数据系列？
   - 如何命名和区分不同的数据系列？

4. **Desktop 导出格式？**
   - JSON 格式（通用但文件大）
   - 二进制格式（紧凑但需要专用工具打开）
   - CSV 格式（便于数据分析）

---

## 六、风险与限制

1. **内存限制**：大量原始数据点可能导致浏览器崩溃
   - 缓解：设置内存上限，自动降采样 + IndexedDB 分片

2. **性能瓶颈**：高频率回放时 UI 渲染可能卡顿
   - 缓解：帧跳过策略 + Web Worker 计算

3. **数据一致性**：跨会话数据可能存在字段不一致
   - 缓解：数据系列记录字段元数据

---

## 七、总结

本方案旨在为项目添加完整的**历史数据回放**功能，核心设计思路：

1. **分层架构**：数据存储与回放控制分离
2. **双环境支持**：Web (IndexedDB) + Desktop (本地文件)
3. **用户体验优先**：完整播放器 + 快捷键支持
4. **渐进增强**：分阶段实施，逐步优化

如有疑问或需要调整，请随时讨论。
