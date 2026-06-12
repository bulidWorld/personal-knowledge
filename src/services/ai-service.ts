import { ServiceError } from './http-client'
import { isTauriRuntime } from './runtime'
import { tauriInvoke } from './tauri-client'

export interface AiSummaryPayload {
  content: string
}

export interface AiSummaryResult {
  summary: string
}

export interface AiSuggestTagsPayload {
  title?: string
  content: string
}

export interface AiSuggestTagsResult {
  tags: string[]
}

export interface AiOptimizePromptPayload {
  prompt: string
}

export interface AiOptimizePromptResult {
  prompt: string
}

export interface AiConfig {
  provider?: string
  baseUrl?: string
  model?: string
  apiKey?: string
}

export interface AiConfigStatus {
  configured: boolean
  provider?: string
  baseUrl?: string
  model?: string
}

function webAiNotImplemented(): never {
  throw new ServiceError('Web API 暂未实现 AI 能力', { code: 'NOT_IMPLEMENTED' })
}

export async function summarizeContent(payload: AiSummaryPayload): Promise<AiSummaryResult> {
  if (isTauriRuntime()) {
    return tauriInvoke<AiSummaryResult>('ai_summarize', { payload })
  }

  webAiNotImplemented()
}

export async function suggestTags(payload: AiSuggestTagsPayload): Promise<AiSuggestTagsResult> {
  if (isTauriRuntime()) {
    return tauriInvoke<AiSuggestTagsResult>('ai_suggest_tags', { payload })
  }

  webAiNotImplemented()
}

export async function autoTags(payload: AiSuggestTagsPayload): Promise<AiSuggestTagsResult> {
  if (isTauriRuntime()) {
    return tauriInvoke<AiSuggestTagsResult>('ai_auto_tags', { payload })
  }

  webAiNotImplemented()
}

export async function optimizePrompt(payload: AiOptimizePromptPayload): Promise<AiOptimizePromptResult> {
  if (isTauriRuntime()) {
    return tauriInvoke<AiOptimizePromptResult>('ai_optimize_prompt', { payload })
  }

  webAiNotImplemented()
}

export async function getAiConfigStatus(): Promise<AiConfigStatus> {
  if (isTauriRuntime()) {
    return tauriInvoke<AiConfigStatus>('get_ai_config_status')
  }

  webAiNotImplemented()
}

export async function saveAiConfig(config: AiConfig): Promise<void> {
  if (isTauriRuntime()) {
    await tauriInvoke<void>('save_ai_config', { config })
    return
  }

  webAiNotImplemented()
}
