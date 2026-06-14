import {
  convertToModelMessages,
  gateway,
  validateUIMessages,
  type ModelMessage,
} from 'ai'

import type { LegacyChatRequest, UIChatRequest } from './contracts.js'
import { buildToolSetFromClient, type ClientToolsMap } from './client-tools.js'

const defaultModelId = process.env.AI_DEFAULT_MODEL ?? 'openai/gpt-4.1-mini'

export { buildToolSetFromClient, type ClientToolsMap }

export function resolveModel(modelId?: string) {
  return gateway(modelId ?? defaultModelId)
}

export function normalizeLegacyMessages(request: LegacyChatRequest): ModelMessage[] {
  if (request.messages?.length) {
    return request.messages as ModelMessage[]
  }

  if (request.prompt) {
    return [{ role: 'user', content: request.prompt }]
  }

  return []
}

export async function normalizeUIMessages(request: UIChatRequest): Promise<ModelMessage[]> {
  const tools = buildToolSetFromClient(request.tools)
  const validated = await validateUIMessages({ messages: request.messages })

  return convertToModelMessages(validated, { tools })
}
