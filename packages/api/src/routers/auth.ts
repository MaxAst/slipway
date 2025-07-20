import { sha256 } from '@oslojs/crypto/sha2'
import { encodeHexLowerCase } from '@oslojs/encoding'
import { TRPCError } from '@trpc/server'
import { env } from '../env.js'
import { invalidateSession } from '../services/session.js'
import { publicProcedure, router } from '../trpc.js'

export const authRouter = router({
  logout: publicProcedure.mutation(async ({ ctx }) => {
    ctx.logger.info('Logging out')

    const token = ctx.req.cookies.auth_session

    if (!token) {
      ctx.logger.warn('No session token found, skipping logout')
      return { success: true }
    }

    const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)))

    try {
      await invalidateSession(sessionId)
    } catch (err) {
      console.error(err)
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to logout',
      })
    }

    // Clear the correctly scoped cookie (e.g. .slipway.app)
    ctx.res.clearCookie('auth_session', {
      domain: env.COOKIE_DOMAIN,
      path: '/',
    })

    // Also attempt to clear any cookie scoped specifically to the API host (e.g., api.slipway.app)
    // Omitting domain defaults to the current host for clearing.
    ctx.res.clearCookie('auth_session', {
      path: '/',
    })

    return { success: true }
  }),
})
