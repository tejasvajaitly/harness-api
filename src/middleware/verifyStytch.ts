import type { MiddlewareHandler } from 'hono'

type StytchUser = Record<string, unknown>
type StytchSession = Record<string, unknown>

type StytchAuthenticateResponse = {
  user?: StytchUser
  session?: StytchSession
}

export type StytchAuthEnv = {
  Variables: {
    stytchUser: StytchUser | undefined
    stytchSession: StytchSession | undefined
  }
}

const stytchBaseURL = (projectID: string): string => {
  if (process.env.STYTCH_API_URL) {
    return process.env.STYTCH_API_URL
  }

  return projectID.startsWith('project-test-')
    ? 'https://test.stytch.com'
    : 'https://api.stytch.com'
}

export const verifyStytch: MiddlewareHandler<StytchAuthEnv> = async (c, next) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const projectID = process.env.STYTCH_PROJECT_ID
  const secretKey = process.env.STYTCH_SECRET_KEY
  if (!projectID || !secretKey) {
    return c.json({ error: 'Stytch authentication is not configured' }, 500)
  }

  const sessionToken = authHeader.slice('Bearer '.length).trim()
  if (!sessionToken) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const credentials = Buffer.from(`${projectID}:${secretKey}`).toString('base64')

  try {
    const response = await fetch(
      new URL('/v1/sessions/authenticate', stytchBaseURL(projectID)),
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ session_token: sessionToken }),
      },
    )

    if (!response.ok) {
      return c.json({ error: 'Invalid session' }, 401)
    }

    const data = (await response.json()) as StytchAuthenticateResponse
    c.set('stytchUser', data.user)
    c.set('stytchSession', data.session)

    return next()
  } catch {
    return c.json({ error: 'Auth check failed' }, 500)
  }
}
