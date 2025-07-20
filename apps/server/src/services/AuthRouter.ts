import { env, isSafeRedirect } from '@my/api'
import {
  createSession,
  createUser,
  generateSessionToken,
  getUserFromGoogleId,
  google,
} from '@my/api/services'
import { decodeIdToken, generateCodeVerifier, generateState } from 'arctic'
import { Effect } from 'effect'
import { FastifyRoute } from './FastifyRoute.js'

export class AuthRouter extends Effect.Service<AuthRouter>()('AuthRouter', {
  effect: Effect.gen(function* () {
    const { addRoute } = yield* FastifyRoute

    // Google OAuth login route
    yield* addRoute('GET', '/google/login', (req, reply) =>
      Effect.sync(() => {
        const { redirectTo } = req.query as { redirectTo?: string }
        const state = generateState()
        const codeVerifier = generateCodeVerifier()
        const url = google.createAuthorizationURL(state, codeVerifier, [
          'openid',
          'profile',
          'email',
        ])

        // Set cookies for OAuth state and code verifier
        reply.setCookie('google_oauth_state', state, {
          path: '/google/callback',
          httpOnly: true,
          secure: env.ENVIRONMENT === 'production',
          maxAge: 60 * 10, // 10 minutes
          sameSite: 'lax',
          domain: env.COOKIE_DOMAIN,
        })

        reply.setCookie('google_code_verifier', codeVerifier, {
          path: '/google/callback',
          httpOnly: true,
          secure: env.ENVIRONMENT === 'production',
          maxAge: 60 * 10, // 10 minutes
          sameSite: 'lax',
          domain: env.COOKIE_DOMAIN,
        })

        if (redirectTo) {
          reply.setCookie('google_oauth_redirect', redirectTo, {
            path: '/google/callback',
            httpOnly: true,
            secure: env.ENVIRONMENT === 'production',
            maxAge: 60 * 10, // 10 minutes
            sameSite: 'lax',
            domain: env.COOKIE_DOMAIN,
          })
        }

        return reply.status(302).redirect(url.toString())
      })
    )

    // Google OAuth callback route
    yield* addRoute('GET', '/google/callback', (req, reply) =>
      Effect.gen(function* () {
        const { code, state } = req.query as { code?: string; state?: string }
        const codeVerifier = req.cookies.google_code_verifier
        const oauthState = req.cookies.google_oauth_state
        const redirectTo = req.cookies.google_oauth_redirect
        const safeRedirect = isSafeRedirect(redirectTo) ? redirectTo : '/home'

        if (!code || !state || !oauthState || !codeVerifier) {
          return reply.status(400).send({ success: false })
        }
        if (state !== oauthState) {
          return reply.status(400).send({ success: false })
        }

        // Validate authorization code with Google
        const tokens = yield* Effect.tryPromise({
          try: () => google.validateAuthorizationCode(code, codeVerifier),
          catch: (error) => new Error(`Failed to validate authorization code: ${error}`),
        })

        const claims = decodeIdToken(tokens.idToken())

        // @ts-expect-error claims is of type object without known properties
        const googleUserId = claims.sub

        // Check if user exists
        const existingUser = yield* Effect.tryPromise({
          try: () => getUserFromGoogleId(googleUserId),
          catch: (error) => new Error(`Failed to get user from Google ID: ${error}`),
        })

        if (existingUser) {
          // Create session for existing user
          const token = generateSessionToken()
          const session = yield* Effect.tryPromise({
            try: () => createSession(token, existingUser.id),
            catch: (error) => new Error(`Failed to create session: ${error}`),
          })

          reply.setCookie('auth_session', token, {
            httpOnly: true,
            sameSite: 'lax',
            secure: env.ENVIRONMENT === 'production',
            path: '/',
            expires: session.expiresAt,
            domain: env.COOKIE_DOMAIN,
          })
        } else {
          // Create new user
          // @ts-expect-error claims is of type object without known properties
          const email = claims.email
          // @ts-expect-error claims is of type object without known properties
          const name = claims.name

          const user = yield* Effect.tryPromise({
            try: () => createUser({ googleUserId, email, name }),
            catch: (error) => new Error(`Failed to create user: ${error}`),
          })

          const token = generateSessionToken()
          const session = yield* Effect.tryPromise({
            try: () => createSession(token, user.id),
            catch: (error) => new Error(`Failed to create session: ${error}`),
          })

          reply.setCookie('auth_session', token, {
            httpOnly: true,
            sameSite: 'lax',
            secure: env.ENVIRONMENT === 'production',
            path: '/',
            expires: session.expiresAt,
            domain: env.COOKIE_DOMAIN,
          })

          reply.clearCookie('guest_session', {
            path: '/',
            domain: env.COOKIE_DOMAIN,
          })
        }

        // Clear OAuth cookies
        reply.clearCookie('google_oauth_state', {
          path: '/google/callback',
          domain: env.COOKIE_DOMAIN,
        })
        reply.clearCookie('google_code_verifier', {
          path: '/google/callback',
          domain: env.COOKIE_DOMAIN,
        })
        reply.clearCookie('google_oauth_redirect', {
          path: '/google/callback',
          domain: env.COOKIE_DOMAIN,
        })

        return reply.status(302).redirect(`${env.FRONTEND_URL}${safeRedirect ?? '/home'}`)
      })
    )

    return {} as const
  }),
}) {}
