'use client'

import { createContext, useContext, useState, useCallback, useRef } from 'react'
import type { MindMapNode, MindMapConnection, MindMapSystem } from '@/types/mindmap'

function normalizeNode(n: Record<string, unknown>): MindMapNode {
  return {
    id: n.id as string,
    systemId: (n.system_id ?? n.systemId) as string,
    title: n.title as string,
    htmlContent: (n.html_content ?? n.htmlContent ?? '') as string,
    markdownContent: (n.markdown_content ?? n.markdownContent ?? '') as string,
    richtextContent: (n.richtext_content ?? n.richtextContent ?? '') as string,
    contentType: (n.content_type ?? n.contentType ?? 'html') as MindMapNode['contentType'],
    nodeType: (n.node_type ?? n.nodeType) as MindMapNode['nodeType'],
    parentId: (n.parent_id ?? n.parentId ?? null) as string | null,
    x: Number(n.x) || 400,
    y: Number(n.y) || 300,
    color: (n.color ?? '') as string,
    createdAt: (n.created_at ?? n.createdAt) as string,
    updatedAt: (n.updated_at ?? n.updatedAt) as string,
  }
}

function normalizeConnection(c: Record<string, unknown>): MindMapConnection {
  return {
    id: c.id as string,
    systemId: (c.system_id ?? c.systemId) as string,
    sourceNodeId: (c.source_node_id ?? c.sourceNodeId) as string,
    targetNodeId: (c.target_node_id ?? c.targetNodeId) as string,
    createdAt: (c.created_at ?? c.createdAt) as string,
  }
}

interface MindMapContextValue {
  systems: MindMapSystem[]
  nodes: MindMapNode[]
  connections: MindMapConnection[]
  selectedSystemId: string | null
  setSelectedSystemId: (id: string | null) => void
  fetchSystems: () => Promise<void>
  fetchNodes: (systemId: string) => Promise<void>
  fetchConnections: (systemId: string) => Promise<void>
  createSystem: (name: string) => Promise<MindMapSystem>
  deleteSystem: (id: string) => Promise<void>
  createNode: (partial: {
    systemId: string; title: string; nodeType: string; parentId?: string | null
    x?: number; y?: number; color?: string
    htmlContent?: string; markdownContent?: string; richtextContent?: string; contentType?: string
  }) => Promise<MindMapNode>
  updateNode: (id: string, updates: Partial<MindMapNode>) => Promise<void>
  deleteNode: (id: string) => Promise<void>
  createConnection: (systemId: string, sourceNodeId: string, targetNodeId: string) => Promise<void>
  deleteConnection: (id: string) => Promise<void>
}

const MindMapContext = createContext<MindMapContextValue | null>(null)

export function MindMapProvider({ children }: { children: React.ReactNode }) {
  const [systems, setSystems] = useState<MindMapSystem[]>([])
  const [nodes, setNodes] = useState<MindMapNode[]>([])
  const [connections, setConnections] = useState<MindMapConnection[]>([])
  const [selectedSystemId, setSelectedSystemId] = useState<string | null>(null)

  const fetchSystems = useCallback(async () => {
    const res = await fetch('/api/systems')
    const data = await res.json()
    setSystems(data.map((s: Record<string, unknown>) => ({
      id: s.id,
      name: s.name,
      description: (s.description || '') as string,
      icon: (s.icon || 'Network') as string,
      borderColor: (s.border_color || s.borderColor || 'border-l-teal-500') as string,
      dotColor: (s.dot_color || s.dotColor || 'bg-teal-500') as string,
      gradient: (s.gradient || 'bg-gradient-to-r from-teal-400 to-teal-500') as string,
      nodeCount: (s.node_count ?? s.nodeCount ?? 0) as number,
      createdAt: (s.created_at || s.createdAt) as string,
      updatedAt: (s.updated_at || s.updatedAt) as string,
    })))
  }, [])

  const fetchNodes = useCallback(async (systemId: string) => {
    const res = await fetch(`/api/mindmap/nodes?systemId=${systemId}`)
    const data = await res.json()
    setNodes(data.map(normalizeNode))
  }, [])

  const fetchConnections = useCallback(async (systemId: string) => {
    const res = await fetch(`/api/mindmap/connections?systemId=${systemId}`)
    const data = await res.json()
    setConnections(data.map(normalizeConnection))
  }, [])

  const createSystem = useCallback(async (name: string) => {
    const res = await fetch('/api/systems', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    const s = await res.json()
    await fetchSystems()
    return s
  }, [fetchSystems])

  const deleteSystem = useCallback(async (id: string) => {
    await fetch(`/api/systems/${id}`, { method: 'DELETE' })
    await fetchSystems()
  }, [fetchSystems])

  const createNode = useCallback(async (partial: {
    systemId: string; title: string; nodeType: string; parentId?: string | null
    x?: number; y?: number; color?: string
    htmlContent?: string; markdownContent?: string; richtextContent?: string; contentType?: string
  }): Promise<MindMapNode> => {
    const res = await fetch('/api/mindmap/nodes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(partial),
    })
    const raw = await res.json()
    const newNode = normalizeNode(raw)

    // Optimistic: add new node to local state immediately
    setNodes(prev => [...prev, newNode])

    // Still sync from server to ensure consistency
    await fetchNodes(partial.systemId)
    return newNode
  }, [fetchNodes])

  const pendingTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const pendingMerged = useRef<Map<string, Record<string, unknown>>>(new Map())

  const updateNode = useCallback(async (id: string, updates: Partial<MindMapNode>) => {
    // Optimistic local update — apply immediately for responsive UI
    setNodes(prev => prev.map(n => n.id === id ? { ...n, ...updates } as MindMapNode : n))

    // Debounce the API call for drag operations
    const existing = pendingMerged.current.get(id)
    if (existing) {
      Object.assign(existing, updates)
    } else {
      pendingMerged.current.set(id, { ...updates })
    }

    const prevTimer = pendingTimers.current.get(id)
    if (prevTimer) clearTimeout(prevTimer)

    const timer = setTimeout(async () => {
      const merged = pendingMerged.current.get(id) || {}
      pendingMerged.current.delete(id)
      pendingTimers.current.delete(id)
      await fetch(`/api/mindmap/nodes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(merged),
      })
    }, 200)

    pendingTimers.current.set(id, timer)
  }, [])

  const deleteNode = useCallback(async (id: string) => {
    await fetch(`/api/mindmap/nodes/${id}`, { method: 'DELETE' })
    if (selectedSystemId) {
      await Promise.all([fetchNodes(selectedSystemId), fetchConnections(selectedSystemId)])
    }
  }, [selectedSystemId, fetchNodes, fetchConnections])

  const createConnection = useCallback(async (systemId: string, sourceNodeId: string, targetNodeId: string) => {
    await fetch('/api/mindmap/connections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ systemId, sourceNodeId, targetNodeId }),
    })
    await fetchConnections(systemId)
  }, [fetchConnections])

  const deleteConnection = useCallback(async (id: string) => {
    await fetch(`/api/mindmap/connections/${id}`, { method: 'DELETE' })
    if (selectedSystemId) {
      await fetchConnections(selectedSystemId)
    }
  }, [selectedSystemId, fetchConnections])

  const value: MindMapContextValue = {
    systems, nodes, connections, selectedSystemId, setSelectedSystemId,
    fetchSystems, fetchNodes, fetchConnections,
    createSystem, deleteSystem,
    createNode, updateNode, deleteNode,
    createConnection, deleteConnection,
  }

  return (
    <MindMapContext.Provider value={value}>
      {children}
    </MindMapContext.Provider>
  )
}

export function useMindMap(): MindMapContextValue {
  const ctx = useContext(MindMapContext)
  if (!ctx) throw new Error('useMindMap must be used within MindMapProvider')
  return ctx
}
