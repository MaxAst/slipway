import { appRouter, createTRPCContext, type FastifyContextWithCookies } from '@my/api'
import type { TRPCRequestInfo } from '@trpc/server/http'
import { Effect } from 'effect'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { EffectfulFastifyInstance } from '../services/FastifyInstance.js'
import { FastifyTrpcPlugin } from './FastifyTrpcPlugin.js'

export class TrpcRouter extends Effect.Service<TrpcRouter>()('TrpcRouter', {
  effect: Effect.gen(function* () {
    const { registerTRPCPlugin } = yield* FastifyTrpcPlugin
    const fastifyInstance = yield* EffectfulFastifyInstance

    // Create Effect-based context function
    const createContext = (opts: {
      req: FastifyRequest
      res: FastifyReply
      info: TRPCRequestInfo
    }) =>
      Effect.gen(function* () {
        // Convert to FastifyContextWithCookies format
        const fastifyContext: FastifyContextWithCookies = {
          req: opts.req as FastifyContextWithCookies['req'],
          res: opts.res,
          info: opts.info,
        }

        // Use the existing createTRPCContext function
        return yield* Effect.promise(() => createTRPCContext(fastifyContext, fastifyInstance.log))
      })

    yield* registerTRPCPlugin({
      prefix: '/trpc',
      trpcOptions: {
        router: appRouter,
        createContext,
        onError({ path, error }) {
          // report to error monitoring
          console.error(`Error in tRPC handler on path '${path}':`, error)
        },
      },
    })

    return {} as const
  }),
}) {}
