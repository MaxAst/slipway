import { Cause, Effect, Exit, FiberId, FiberSet, Ref, Scope } from 'effect'
import type { RuntimeFiber } from 'effect/Fiber'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { EffectfulFastifyInstance } from './FastifyInstance.js'

export class FastifyRoute extends Effect.Service<FastifyRoute>()('FastifyRoute', {
  effect: Effect.gen(function* () {
    const server = yield* EffectfulFastifyInstance
    const scope = yield* Effect.scope

    const addRoute = <E, R>(
      method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS',
      path: string,
      handler: (req: FastifyRequest, reply: FastifyReply) => Effect.Effect<void, E, R>
    ): Effect.Effect<void, never, R> =>
      Effect.gen(function* () {
        const runFork = yield* FiberSet.makeRuntime<R>().pipe(Scope.extend(scope))
        const fiberRef = yield* Ref.make<RuntimeFiber<void, E> | null>(null)

        server.route({
          method,
          url: path,
          handler: (req, reply) => {
            const fiber = handler(req, reply).pipe(
              Effect.withSpan(`Fastify.route(${method}, ${path})`),
              Effect.onExit((exit) => {
                if (!reply.sent) {
                  reply.code(Exit.isSuccess(exit) ? 204 : 500).send()
                }
                if (Exit.isFailure(exit) && !Cause.isInterruptedOnly(exit.cause)) {
                  return Effect.annotateLogs(
                    Effect.logWarning('Unhandled error in route', exit.cause),
                    {
                      method,
                      path,
                      headers: req.headers,
                    }
                  )
                }
                return Effect.void
              }),
              runFork
            )

            // Store fiber reference in the Ref for cleanup
            Effect.runSync(Ref.set(fiberRef, fiber))
          },
          onError: (err, req, _, done) => {
            req.log.error(err, "Unhandled error in fastify's onError request lifecycle hook")
            done()
          },
          onRequestAbort: (_req, done) => {
            // Clean up Effect fiber when request is aborted
            const fiber = Effect.runSync(Ref.get(fiberRef))
            fiber?.unsafeInterruptAsFork(FiberId.none)
            done()
          },
          onTimeout: (_req, _reply, done) => {
            // Clean up Effect fiber when request timed out
            const fiber = Effect.runSync(Ref.get(fiberRef))
            fiber?.unsafeInterruptAsFork(FiberId.none)
            done()
          },
        })
      })

    const addAllRoute = <E, R>(
      path: string,
      handler: (req: FastifyRequest, reply: FastifyReply) => Effect.Effect<void, E, R>
    ): Effect.Effect<void, never, R> =>
      Effect.gen(function* () {
        const runFork = yield* FiberSet.makeRuntime<R>().pipe(Scope.extend(scope))
        const fiberRef = yield* Ref.make<RuntimeFiber<void, E> | null>(null)

        server.all(
          path,
          {
            onError: (err, req, _, done) => {
              req.log.error(err, "Unhandled error in fastify's onError request lifecycle hook")
              done()
            },
            onRequestAbort: (_req, done) => {
              // Clean up Effect fiber when request is aborted
              const fiber = Effect.runSync(Ref.get(fiberRef))
              fiber?.unsafeInterruptAsFork(FiberId.none)
              done()
            },
            onTimeout: (_req, _reply, done) => {
              // Clean up Effect fiber when request timed out
              const fiber = Effect.runSync(Ref.get(fiberRef))
              fiber?.unsafeInterruptAsFork(FiberId.none)
              done()
            },
          },
          (req, reply) => {
            const fiber = handler(req, reply).pipe(
              Effect.withSpan(`Fastify.all(${path})`),
              Effect.onExit((exit) => {
                if (!reply.sent) {
                  reply.code(Exit.isSuccess(exit) ? 204 : 500).send()
                }
                if (Exit.isFailure(exit) && !Cause.isInterruptedOnly(exit.cause)) {
                  return Effect.annotateLogs(
                    Effect.logWarning('Unhandled error in route', exit.cause),
                    {
                      method: req.method,
                      path,
                      headers: req.headers,
                    }
                  )
                }
                return Effect.void
              }),
              runFork
            )

            // Store fiber reference in the Ref for cleanup
            Effect.runSync(Ref.set(fiberRef, fiber))
          }
        )
      })

    return { addRoute, addAllRoute } as const
  }),
}) {}
