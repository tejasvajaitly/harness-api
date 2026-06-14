import { jsonSchema, tool, type ToolSet } from 'ai'

export type ClientToolDefinition = {
  description: string
  inputSchema: Record<string, unknown>
  /** When true, stream emits tool-approval-request; iOS executes after user confirms. */
  needsApproval?: boolean
}

export type ClientToolsMap = Record<string, ClientToolDefinition>

/**
 * Builds the ToolSet passed to streamText from tools the iOS app sends each request.
 * No execute — tools run on device when the UI stream emits tool-input-available.
 */
export function buildToolSetFromClient(tools: ClientToolsMap | undefined): ToolSet | undefined {
  if (!tools || Object.keys(tools).length === 0) {
    return undefined
  }

  const result: ToolSet = {}

  for (const [name, definition] of Object.entries(tools)) {
    if (!definition?.description || !definition?.inputSchema) {
      continue
    }

    result[name] = tool({
      description: definition.description.trim(),
      inputSchema: jsonSchema(definition.inputSchema),
      ...(definition.needsApproval != null
        ? { needsApproval: definition.needsApproval }
        : {}),
    })
  }

  return Object.keys(result).length > 0 ? result : undefined
}
