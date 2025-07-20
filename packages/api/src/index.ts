import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from './router.js'

type RouterInputs = inferRouterInputs<AppRouter>
type RouterOutputs = inferRouterOutputs<AppRouter>

export type { AppRouter, RouterInputs, RouterOutputs }

export { env } from './env.js'
export { appRouter } from './router.js'
export { createTRPCContext, type FastifyContextWithCookies } from './trpc.js'
export { envToLogger, isSafeRedirect } from './utils.js'

