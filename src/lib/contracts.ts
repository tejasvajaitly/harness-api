import { z } from 'zod'

const sharedFields = {
  model: z.string().min(1).optional(),
  system: z.string().min(1).optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxOutputTokens: z.number().int().positive().optional(),
  id: z.string().optional(),
  trigger: z.string().optional(),
  messageId: z.string().optional(),
}

/** Legacy JSON API: `{ prompt }` or `{ messages: ModelMessage[] }`. */
export const legacyChatRequestSchema = z
  .object({
    ...sharedFields,
    prompt: z.string().min(1).optional(),
    messages: z.array(z.any()).optional(),
  })
  .refine((value) => Boolean(value.prompt || value.messages?.length), {
    message: 'Provide either prompt or messages',
    path: ['messages'],
  })

const clientToolSchema = z.object({
  description: z.string().min(1),
  inputSchema: z.record(z.string(), z.unknown()),
  needsApproval: z.boolean().optional(),
})

/** Vercel AI SDK UI chat body from `useChat` / swift-ai-sdk. */
export const uiChatRequestSchema = z
  .object({
    ...sharedFields,
    messages: z.array(z.any()).min(1),
    /** Sent from iOS each request — forwarded to streamText (not stored server-side). */
    tools: z.record(z.string(), clientToolSchema).optional(),
  })
  .refine(
    (value) =>
      value.messages.some(
        (message) =>
          message &&
          typeof message === 'object' &&
          'parts' in message &&
          Array.isArray((message as { parts?: unknown }).parts),
      ),
    {
      message: 'messages must be UI messages with a parts array',
      path: ['messages'],
    },
  )

export type LegacyChatRequest = z.infer<typeof legacyChatRequestSchema>
export type UIChatRequest = z.infer<typeof uiChatRequestSchema>

export function parseChatRequest(payload: unknown) {
  const ui = uiChatRequestSchema.safeParse(payload)
  if (ui.success) {
    return { kind: 'ui' as const, data: ui.data }
  }

  const legacy = legacyChatRequestSchema.safeParse(payload)
  if (legacy.success) {
    return { kind: 'legacy' as const, data: legacy.data }
  }

  return {
    kind: 'invalid' as const,
    uiIssues: ui.error.flatten(),
    legacyIssues: legacy.error.flatten(),
  }
}
