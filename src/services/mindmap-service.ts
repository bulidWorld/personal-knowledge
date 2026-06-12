import type { ContentType } from '@/types/knowledge'
import type { MindMapConnection, MindMapNode, MindMapNodeType } from '@/types/mindmap'
import { httpDelete, httpGet, httpPost, httpPut } from './http-client'
import { shouldUseTauriCommands } from './runtime'
import { tauriInvoke } from './tauri-client'

export interface CreateMindMapNodePayload {
  systemId: string
  title: string
  nodeType: MindMapNodeType | string
  parentId?: string | null
  x?: number
  y?: number
  color?: string
  htmlContent?: string
  markdownContent?: string
  richtextContent?: string
  contentType?: ContentType | string
}

export type UpdateMindMapNodePayload = Partial<Pick<
  MindMapNode,
  'title' | 'htmlContent' | 'markdownContent' | 'richtextContent' | 'contentType' | 'nodeType' | 'parentId' | 'x' | 'y' | 'color'
>>

export interface CreateMindMapConnectionPayload {
  systemId: string
  sourceNodeId: string
  targetNodeId: string
}

export interface MindMapData {
  nodes: MindMapNode[]
  connections: MindMapConnection[]
}

export interface SaveMindMapPayload {
  systemId: string
  nodes: Array<Pick<
    MindMapNode,
    'id' | 'title' | 'htmlContent' | 'markdownContent' | 'richtextContent' | 'contentType' | 'nodeType' | 'parentId' | 'x' | 'y' | 'color'
  >>
  connections: Array<Pick<MindMapConnection, 'id' | 'sourceNodeId' | 'targetNodeId'>>
}

type RawRecord = Record<string, unknown>

function normalizeNode(node: RawRecord): MindMapNode {
  return {
    id: node.id as string,
    systemId: (node.system_id ?? node.systemId) as string,
    title: node.title as string,
    htmlContent: (node.html_content ?? node.htmlContent ?? '') as string,
    markdownContent: (node.markdown_content ?? node.markdownContent ?? '') as string,
    richtextContent: (node.richtext_content ?? node.richtextContent ?? '') as string,
    contentType: (node.content_type ?? node.contentType ?? 'html') as MindMapNode['contentType'],
    nodeType: (node.node_type ?? node.nodeType) as MindMapNode['nodeType'],
    parentId: (node.parent_id ?? node.parentId ?? null) as string | null,
    x: Number(node.x) || 400,
    y: Number(node.y) || 300,
    color: (node.color ?? '') as string,
    createdAt: (node.created_at ?? node.createdAt ?? '') as string,
    updatedAt: (node.updated_at ?? node.updatedAt ?? '') as string,
  }
}

function normalizeConnection(connection: RawRecord): MindMapConnection {
  return {
    id: connection.id as string,
    systemId: (connection.system_id ?? connection.systemId) as string,
    sourceNodeId: (connection.source_node_id ?? connection.sourceNodeId) as string,
    targetNodeId: (connection.target_node_id ?? connection.targetNodeId) as string,
    createdAt: (connection.created_at ?? connection.createdAt ?? '') as string,
  }
}

export async function listMindMapNodes(systemId: string): Promise<MindMapNode[]> {
  if (shouldUseTauriCommands()) {
    const data = await tauriInvoke<RawRecord[]>('list_mindmap_nodes', { systemId })
    return data.map(normalizeNode)
  }

  const data = await httpGet<RawRecord[]>('/api/mindmap/nodes', { systemId })
  return data.map(normalizeNode)
}

export async function createMindMapNode(payload: CreateMindMapNodePayload): Promise<MindMapNode> {
  if (shouldUseTauriCommands()) {
    const data = await tauriInvoke<RawRecord>('create_mindmap_node', { payload })
    return normalizeNode(data)
  }

  const data = await httpPost<RawRecord>('/api/mindmap/nodes', payload)
  return normalizeNode(data)
}

export async function updateMindMapNode(id: string, payload: UpdateMindMapNodePayload): Promise<MindMapNode> {
  if (shouldUseTauriCommands()) {
    const data = await tauriInvoke<RawRecord>('update_mindmap_node', { id, payload })
    return normalizeNode(data)
  }

  const data = await httpPut<RawRecord>(`/api/mindmap/nodes/${id}`, payload)
  return normalizeNode(data)
}

export async function deleteMindMapNode(id: string): Promise<void> {
  if (shouldUseTauriCommands()) {
    await tauriInvoke<void>('delete_mindmap_node', { id })
    return
  }

  await httpDelete<{ success: boolean }>(`/api/mindmap/nodes/${id}`)
}

export async function listMindMapConnections(systemId: string): Promise<MindMapConnection[]> {
  if (shouldUseTauriCommands()) {
    const data = await tauriInvoke<RawRecord[]>('list_mindmap_connections', { systemId })
    return data.map(normalizeConnection)
  }

  const data = await httpGet<RawRecord[]>('/api/mindmap/connections', { systemId })
  return data.map(normalizeConnection)
}

export async function getMindMap(systemId: string): Promise<MindMapData> {
  if (shouldUseTauriCommands()) {
    const data = await tauriInvoke<{ nodes?: RawRecord[]; connections?: RawRecord[] }>('get_mindmap', { systemId })
    return {
      nodes: (data.nodes ?? []).map(normalizeNode),
      connections: (data.connections ?? []).map(normalizeConnection),
    }
  }

  const [nodes, connections] = await Promise.all([
    listMindMapNodes(systemId),
    listMindMapConnections(systemId),
  ])
  return { nodes, connections }
}

export async function saveMindMap(payload: SaveMindMapPayload): Promise<MindMapData> {
  if (shouldUseTauriCommands()) {
    const data = await tauriInvoke<{ nodes?: RawRecord[]; connections?: RawRecord[] }>('save_mindmap', { payload })
    return {
      nodes: (data.nodes ?? []).map(normalizeNode),
      connections: (data.connections ?? []).map(normalizeConnection),
    }
  }

  await Promise.all([
    ...payload.nodes.map((node) => updateMindMapNode(node.id, node)),
    ...payload.connections.map((connection) => createMindMapConnection({
      systemId: payload.systemId,
      sourceNodeId: connection.sourceNodeId,
      targetNodeId: connection.targetNodeId,
    })),
  ])
  return getMindMap(payload.systemId)
}

export async function createMindMapConnection(payload: CreateMindMapConnectionPayload): Promise<MindMapConnection> {
  if (shouldUseTauriCommands()) {
    const data = await tauriInvoke<RawRecord>('create_mindmap_connection', { payload })
    return normalizeConnection(data)
  }

  const data = await httpPost<RawRecord>('/api/mindmap/connections', payload)
  return normalizeConnection(data)
}

export async function deleteMindMapConnection(id: string): Promise<void> {
  if (shouldUseTauriCommands()) {
    await tauriInvoke<void>('delete_mindmap_connection', { id })
    return
  }

  await httpDelete<{ success: boolean }>(`/api/mindmap/connections/${id}`)
}
