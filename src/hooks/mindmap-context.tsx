'use client'

import { createContext, useContext, useState, useCallback, useRef } from 'react'
import type { MindMapNode, MindMapConnection, MindMapSystem } from '@/types/mindmap'
import {
  createMindMapConnection,
  createMindMapNode,
  deleteMindMapConnection,
  deleteMindMapNode,
  listMindMapConnections,
  listMindMapNodes,
  updateMindMapNode,
} from '@/services/mindmap-service'
import {
  createSystem as createSystemService,
  deleteSystem as deleteSystemService,
  listSystems,
} from '@/services/system-service'

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
    setSystems(await listSystems())
  }, [])

  const fetchNodes = useCallback(async (systemId: string) => {
    setNodes(await listMindMapNodes(systemId))
  }, [])

  const fetchConnections = useCallback(async (systemId: string) => {
    setConnections(await listMindMapConnections(systemId))
  }, [])

  const createSystem = useCallback(async (name: string) => {
    const s = await createSystemService({ name })
    await fetchSystems()
    return s
  }, [fetchSystems])

  const deleteSystem = useCallback(async (id: string) => {
    await deleteSystemService(id)
    await fetchSystems()
  }, [fetchSystems])

  const createNode = useCallback(async (partial: {
    systemId: string; title: string; nodeType: string; parentId?: string | null
    x?: number; y?: number; color?: string
    htmlContent?: string; markdownContent?: string; richtextContent?: string; contentType?: string
  }): Promise<MindMapNode> => {
    const newNode = await createMindMapNode(partial)

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
      await updateMindMapNode(id, merged as Partial<MindMapNode>)
    }, 200)

    pendingTimers.current.set(id, timer)
  }, [])

  const deleteNode = useCallback(async (id: string) => {
    await deleteMindMapNode(id)
    if (selectedSystemId) {
      await Promise.all([fetchNodes(selectedSystemId), fetchConnections(selectedSystemId)])
    }
  }, [selectedSystemId, fetchNodes, fetchConnections])

  const createConnection = useCallback(async (systemId: string, sourceNodeId: string, targetNodeId: string) => {
    await createMindMapConnection({ systemId, sourceNodeId, targetNodeId })
    await fetchConnections(systemId)
  }, [fetchConnections])

  const deleteConnection = useCallback(async (id: string) => {
    await deleteMindMapConnection(id)
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
