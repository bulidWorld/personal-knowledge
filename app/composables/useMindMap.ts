import type { MindMapNode, MindMapConnection, MindMapSystem } from '~/types/mindmap'

function normalizeNode(n: any): MindMapNode {
  return {
    id: n.id,
    systemId: n.system_id ?? n.systemId,
    title: n.title,
    htmlContent: n.html_content ?? n.htmlContent ?? '',
    markdownContent: n.markdown_content ?? n.markdownContent ?? '',
    richtextContent: n.richtext_content ?? n.richtextContent ?? '',
    contentType: n.content_type ?? n.contentType ?? 'html',
    nodeType: n.node_type ?? n.nodeType,
    parentId: n.parent_id ?? n.parentId ?? null,
    x: Number(n.x) || 400,
    y: Number(n.y) || 300,
    color: n.color ?? '',
    createdAt: n.created_at ?? n.createdAt,
    updatedAt: n.updated_at ?? n.updatedAt,
  }
}

function normalizeConnection(c: any): MindMapConnection {
  return {
    id: c.id,
    systemId: c.system_id ?? c.systemId,
    sourceNodeId: c.source_node_id ?? c.sourceNodeId,
    targetNodeId: c.target_node_id ?? c.targetNodeId,
    createdAt: c.created_at ?? c.createdAt,
  }
}

export function useMindMap(systemId: Ref<string | null>) {
  const systems = ref<MindMapSystem[]>([])
  const nodes = ref<MindMapNode[]>([])
  const connections = ref<MindMapConnection[]>([])

  async function fetchSystems() {
    const data = await $fetch<any[]>('/api/systems')
    systems.value = data.map((s: any) => ({
      id: s.id,
      name: s.name,
      description: s.description || '',
      icon: s.icon || 'Network',
      borderColor: s.border_color || s.borderColor || 'border-l-teal-500',
      dotColor: s.dot_color || s.dotColor || 'bg-teal-500',
      gradient: s.gradient || 'bg-gradient-to-r from-teal-400 to-teal-500',
      nodeCount: s.node_count ?? s.nodeCount ?? 0,
      createdAt: s.created_at || s.createdAt,
      updatedAt: s.updated_at || s.updatedAt,
    }))
  }

  async function fetchNodes() {
    if (!systemId.value) { nodes.value = []; return }
    const data = await $fetch<any[]>(`/api/mindmap/nodes?systemId=${systemId.value}`)
    nodes.value = data.map(normalizeNode)
  }

  async function fetchConnections() {
    if (!systemId.value) { connections.value = []; return }
    const data = await $fetch<any[]>(`/api/mindmap/connections?systemId=${systemId.value}`)
    connections.value = data.map(normalizeConnection)
  }

  async function createSystem(name: string) {
    const s = await $fetch<any>('/api/systems', { method: 'POST', body: { name } })
    await fetchSystems()
    return s
  }

  async function deleteSystem(id: string) {
    await $fetch(`/api/systems/${id}`, { method: 'DELETE' })
    await fetchSystems()
  }

  async function createNode(partial: {
    systemId: string; title: string; nodeType: string; parentId?: string | null
    x?: number; y?: number; color?: string
    htmlContent?: string; markdownContent?: string; richtextContent?: string; contentType?: string
  }) {
    await $fetch('/api/mindmap/nodes', { method: 'POST', body: partial })
    await fetchNodes()
  }

  async function updateNode(id: string, updates: Partial<MindMapNode>) {
    await $fetch(`/api/mindmap/nodes/${id}`, { method: 'PUT', body: updates })
  }

  async function deleteNode(id: string) {
    await $fetch(`/api/mindmap/nodes/${id}`, { method: 'DELETE' })
    await fetchNodes()
    await fetchConnections()
  }

  async function createConnection(systemId: string, sourceNodeId: string, targetNodeId: string) {
    await $fetch('/api/mindmap/connections', {
      method: 'POST', body: { systemId, sourceNodeId, targetNodeId },
    })
    await fetchConnections()
  }

  async function deleteConnection(id: string) {
    await $fetch(`/api/mindmap/connections/${id}`, { method: 'DELETE' })
    await fetchConnections()
  }

  return {
    systems, nodes, connections,
    fetchSystems, fetchNodes, fetchConnections,
    createSystem, deleteSystem,
    createNode, updateNode, deleteNode,
    createConnection, deleteConnection,
  }
}
