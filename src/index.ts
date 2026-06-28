import { streamText } from 'ai'
import { Hono } from 'hono'

import {
  buildToolSetFromClient,
  normalizeLegacyMessages,
  normalizeUIMessages,
  resolveModel,
} from './lib/ai.js'
import { parseChatRequest } from './lib/contracts.js'
import { verifyStytch, type StytchAuthEnv } from './middleware/verifyStytch.js'

const app = new Hono<StytchAuthEnv>()

app.get('/', (c) => {
  return c.text(
    [
      'Harness AI API is running.',
      '',
      'POST /api/chat — Vercel AI SDK UI message stream (SSE) for the iOS app.',
      'Also accepts legacy { prompt | messages } JSON for simple clients.',
      'Tools: sent by the iOS app on each request (forwarded to the model).',
    ].join('\n'),
  )
})

app.post('/api/chat', verifyStytch, async (c) => {
  const payload = await c.req.json().catch(() => null)
  const parsed = parseChatRequest(payload)

  if (parsed.kind === 'invalid') {
    return c.json(
      {
        error: 'Invalid request body',
        uiIssues: parsed.uiIssues,
        legacyIssues: parsed.legacyIssues,
      },
      400,
    )
  }

  try {
    const tools =
      parsed.kind === 'ui' ? buildToolSetFromClient(parsed.data.tools) : undefined

    const result =
      parsed.kind === 'ui'
        ? streamText({
            model: resolveModel(parsed.data.model),
            messages: await normalizeUIMessages(parsed.data),
            ...(parsed.data.system ? { system: parsed.data.system } : {}),
            ...(tools ? { tools } : {}),
            temperature: parsed.data.temperature,
            maxOutputTokens: parsed.data.maxOutputTokens,
          })
        : streamText({
            model: resolveModel(parsed.data.model),
            messages: normalizeLegacyMessages(parsed.data),
            ...(parsed.data.system ? { system: parsed.data.system } : {}),
            temperature: parsed.data.temperature,
            maxOutputTokens: parsed.data.maxOutputTokens,
          })

    const response = result.toUIMessageStreamResponse()
    return c.newResponse(response.body, response)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    return c.json(
      {
        error: message,
      },
      500,
    )
  }
})

export default app
