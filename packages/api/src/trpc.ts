/**
 * YOU PROBABLY DON'T NEED TO EDIT THIS FILE, UNLESS:
 * 1. You want to modify request context (see Part 1)
 * 2. You want to create a new middleware or type of procedure (see Part 3)
 *
 * tl;dr - this is where all the tRPC server stuff is created and plugged in.
 * The pieces you will need to use are documented accordingly near the end
 */
import type { FastifyCookieOptions } from '@fastify/cookie'
import { type DbType, db } from '@my/db'
import { type User } from '@my/db/schema'
import { type inferProcedureBuilderResolverOptions, initTRPC, TRPCError } from '@trpc/server'
import type { CreateFastifyContextOptions } from '@trpc/server/adapters/fastify'
import type { TRPCRequestInfo } from '@trpc/server/http'
import type { FastifyBaseLogger } from 'fastify'
import superjson from 'superjson'
import { ZodError } from 'zod'
import { validateSessionToken } from './services/session.js'

export type FastifyContextWithCookies = {
  req: CreateFastifyContextOptions['req'] & { cookies: FastifyCookieOptions }
  res: CreateFastifyContextOptions['res']
  info: TRPCRequestInfo
}

export type Context = {
  db: DbType
  logger: FastifyBaseLogger
  session: string | undefined
  guest: string | undefined
  user?: User | undefined
} & FastifyContextWithCookies

/**
 * 1. CONTEXT
 *
 * This section defines the "contexts" that are available in the backend API.
 *
 * These allow you to access things when processing a request, like the database, the session, etc.
 *
 * This helper generates the "internals" for a tRPC context.
 *
 * @see https://trpc.io/docs/server/context
 */
export const createTRPCContext = async (
  opts: FastifyContextWithCookies,
  baseLogger: FastifyBaseLogger
): Promise<Context> => {
  const session = opts.req.cookies.auth_session
  const guest = opts.req.cookies.guest_session

  const logger = baseLogger.child({
    procedureCalls: opts.info.calls.map((c) => c.path),
    session,
    guest,
  })

  return {
    ...opts,
    db,
    logger,
    session,
    guest,
  }
}

/**
 * 2. INITIALIZATION
 *
 * This is where the trpc api is initialized, connecting the context and
 * transformer
 */
const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter: ({ shape, error }) => ({
    ...shape,
    data: {
      ...shape.data,
      zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
    },
  }),
})

/**
 * Create a server-side caller
 * @see https://trpc.io/docs/server/server-side-calls
 */
export const createCallerFactory = t.createCallerFactory

/**
 * 3. ROUTER & PROCEDURE (THE IMPORTANT BIT)
 *
 * These are the pieces you use to build your tRPC API. You should import these
 * a lot in the /src/server/api/routers folder
 */

/**
 * This is how you create new routers and subrouters in your tRPC API
 * @see https://trpc.io/docs/router
 */
export const router = t.router

export const loggerMiddleware = t.middleware(async ({ ctx, next, path }) => {
  let procedureLogger = ctx.logger.child({
    procedure: path,
    cookies: ctx.req.cookies,
  })

  let user: User | undefined

  if (ctx.session) {
    const result = await validateSessionToken(ctx)
    user = result.user ?? undefined
    if (!user) {
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid session' })
    }
    procedureLogger = procedureLogger.child({
      user,
    })
  }

  return next({
    ctx: {
      ...ctx,
      logger: procedureLogger,
      user,
    },
  })
})

const authMiddleware = t.middleware(async ({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'You are not logged in.' })
  }

  const { user } = await validateSessionToken(ctx)

  if (!user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'You are not logged in.' })
  }

  return next({
    ctx: {
      ...ctx,
      user,
    },
  })
})

/**
 * Public (unauthed) procedure
 *
 * This is the base piece you use to build new queries and mutations on your
 * tRPC API. It does not guarantee that a user querying is authorized, but you
 * can still access user session data if they are logged in
 */
export const publicProcedure = t.procedure.use(loggerMiddleware)

/**
 * Protected (authenticated) procedure
 *
 * If you want a query or mutation to ONLY be accessible to logged in users, use this. It verifies
 * the session is valid and guarantees `ctx.session.user` is not null.
 *
 * @see https://trpc.io/docs/procedures
 */
export const protectedProcedure = publicProcedure.use(authMiddleware)

export type ProtectedOpts = inferProcedureBuilderResolverOptions<typeof protectedProcedure>
