/*
 ** effectful implementation of the official fastify trpc plugin;
 ** https://github.com/trpc/trpc/blob/main/packages/server/src/adapters/fastify/fastifyTRPCPlugin.ts
 */

import type { AnyRouter } from '@trpc/server'
import { Effect } from 'effect'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { EffectfulFastifyInstance } from './FastifyInstance.js'
import { FastifyRoute } from './FastifyRoute.js'
import {
  effectTrpcRequestHandler,
  type FastifyTrpcHandlerOptions,
} from './FastifyTrpcRequestHandler.js'

interface EffectTRPCPluginOptions<TRouter extends AnyRouter> {
  prefix?: string
  trpcOptions: FastifyTrpcHandlerOptions<TRouter, FastifyRequest, FastifyReply>
}

export class FastifyTrpcPlugin extends Effect.Service<FastifyTrpcPlugin>()('FastifyTrpcPlugin', {
  effect: Effect.gen(function* () {
    const { addAllRoute } = yield* FastifyRoute
    const fastifyInstance = yield* EffectfulFastifyInstance

    const registerTRPCPlugin = <TRouter extends AnyRouter>(
      options: EffectTRPCPluginOptions<TRouter>
    ) =>
      Effect.gen(function* () {
        // Configure content type parser for tRPC like the official adapter
        yield* Effect.sync(() => {
          fastifyInstance.removeContentTypeParser('application/json')
          fastifyInstance.addContentTypeParser(
            'application/json',
            { parseAs: 'string' },
            (_, body, done) => {
              done(null, body)
            }
          )
        })

        // Use addAllRoute to handle all HTTP methods like the official adapter
        yield* addAllRoute(`${options.prefix ?? ''}/:path`, (req, res) =>
          Effect.gen(function* () {
            const params = req.params as Record<'path', string>
            const path = params.path
            yield* effectTrpcRequestHandler({
              ...options.trpcOptions,
              req,
              res,
              path,
            })
          })
        )
      })

    return { registerTRPCPlugin } as const
  }),
}) {}
