import type { ContentType } from './knowledge'

export type MindMapNodeType = 'topic' | 'concept' | 'operation'

export interface MindMapNode {
  id: string
  systemId: string
  title: string
  htmlContent: string
  markdownContent: string
  richtextContent: string
  contentType: ContentType
  nodeType: MindMapNodeType
  parentId: string | null
  x: number
  y: number
  color: string
  createdAt: string
  updatedAt: string
}

export interface MindMapConnection {
  id: string
  systemId: string
  sourceNodeId: string
  targetNodeId: string
  createdAt: string
}

export interface MindMapSystem {
  id: string
  name: string
  description: string
  icon: string
  borderColor: string
  dotColor: string
  gradient: string
  nodeCount?: number
  createdAt: string
  updatedAt: string
}
