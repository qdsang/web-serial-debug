// 组件注册中心
import { type Component } from 'vue'

interface NodeComponent {
  type: string
  component: Component
  label: string
  category: string
  defaultData?: Record<string, any>
}

const nodeComponents = new Map<string, NodeComponent>()

// 注册节点组件
export function registerNode(config: NodeComponent) {
  nodeComponents.set(config.type, config)
}

// 获取所有注册的节点组件
export function getNodeComponents() {
  return Array.from(nodeComponents.values())
}

// 获取指定类型的节点组件
export function getNodeComponent(type: string) {
  return nodeComponents.get(type)
}

// 按分类获取节点组件
export function getNodeComponentsByCategory(category: string) {
  return getNodeComponents().filter(node => node.category === category)
}