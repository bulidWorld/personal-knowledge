import { httpPost, ServiceError } from './http-client'
import { shouldUseTauriCommands } from './runtime'
import { tauriInvoke } from './tauri-client'
import { resolveFileUrl } from '@/lib/file-url'

export interface UploadFileResponse {
  id: string
  url: string
  reused?: boolean
}

export interface DesktopUploadPayload {
  fileName: string
  mimeType: string
  bytes: number[]
  knowledgeId?: string
}

export interface FileMetadata {
  id: string
  filename: string
  mimeType: string
  size: number
  createdAt: string
}

export interface ExportFileOptions {
  targetPath?: string
}

export interface ExportFileResponse {
  path: string
}

type RawRecord = Record<string, unknown>

function normalizeFileMetadata(file: RawRecord): FileMetadata {
  return {
    id: file.id as string,
    filename: (file.filename ?? '') as string,
    mimeType: (file.mime_type ?? file.mimeType ?? 'application/octet-stream') as string,
    size: Number(file.size ?? 0),
    createdAt: (file.created_at ?? file.createdAt ?? '') as string,
  }
}

function normalizeFileUrl(idOrUrl: string): string {
  return resolveFileUrl(idOrUrl)
}

async function toDesktopUploadPayload(file: File): Promise<DesktopUploadPayload> {
  const bytes = Array.from(new Uint8Array(await file.arrayBuffer()))
  return {
    fileName: file.name || `upload-${Date.now()}`,
    mimeType: file.type || 'application/octet-stream',
    bytes,
  }
}

export async function uploadImage(file: File): Promise<UploadFileResponse> {
  if (shouldUseTauriCommands()) {
    const payload = await toDesktopUploadPayload(file)
    return tauriInvoke<UploadFileResponse>('upload_file_to_postgres', { payload })
  }

  const formData = new FormData()
  formData.append('file', file)
  return httpPost<UploadFileResponse>('/api/upload', formData)
}

export async function uploadFile(file: File, knowledgeId?: string): Promise<UploadFileResponse> {
  if (shouldUseTauriCommands()) {
    const payload = await toDesktopUploadPayload(file)
    if (knowledgeId) payload.knowledgeId = knowledgeId
    return tauriInvoke<UploadFileResponse>('upload_file_to_postgres', { payload })
  }

  return uploadImage(file)
}

export async function listFiles(): Promise<FileMetadata[]> {
  if (shouldUseTauriCommands()) {
    const data = await tauriInvoke<RawRecord[]>('list_files')
    return data.map(normalizeFileMetadata)
  }

  throw new ServiceError('Web API 暂未实现文件列表能力', { code: 'NOT_IMPLEMENTED' })
}

export function getFileUrl(idOrUrl: string): string {
  return normalizeFileUrl(idOrUrl)
}

export async function openFile(idOrUrl: string): Promise<void> {
  if (shouldUseTauriCommands()) {
    await tauriInvoke<void>('open_file_from_postgres', { idOrUrl })
    return
  }

  if (typeof window !== 'undefined') {
    window.open(normalizeFileUrl(idOrUrl), '_blank', 'noopener,noreferrer')
  }
}

export async function exportFile(
  idOrUrl: string,
  options: ExportFileOptions = {},
): Promise<string | void> {
  if (shouldUseTauriCommands()) {
    const result = await tauriInvoke<ExportFileResponse>('export_file_from_postgres', {
      idOrUrl,
      targetPath: options.targetPath,
    })
    return result.path
  }

  await openFile(idOrUrl)
}

export async function deleteFile(id: string): Promise<void> {
  if (shouldUseTauriCommands()) {
    await tauriInvoke<void>('delete_file', { id })
    return
  }

  throw new ServiceError('Web API 暂未实现文件删除能力', { code: 'NOT_IMPLEMENTED' })
}

export async function attachFileToKnowledge(entryId: string, fileId: string): Promise<void> {
  if (shouldUseTauriCommands()) {
    await tauriInvoke<void>('attach_file_to_knowledge', { entryId, fileId })
    return
  }

  throw new ServiceError('Web API 暂未实现文件关联能力', { code: 'NOT_IMPLEMENTED' })
}

export async function detachFileFromKnowledge(entryId: string, fileId: string): Promise<void> {
  if (shouldUseTauriCommands()) {
    await tauriInvoke<void>('detach_file_from_knowledge', { entryId, fileId })
    return
  }

  throw new ServiceError('Web API 暂未实现文件取消关联能力', { code: 'NOT_IMPLEMENTED' })
}
