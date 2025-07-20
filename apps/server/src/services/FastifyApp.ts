import fastifyCookie from '@fastify/cookie'
import cors from '@fastify/cors'
import { env } from '@my/api'
import { Effect } from 'effect'
import { AuthRouter } from './AuthRouter.js'
import { EffectfulFastifyInstance } from './FastifyInstance.js'
import { TrpcRouter } from './TrpcRouter.js'

export class FastifyApp extends Effect.Service<FastifyApp>()('FastifyApp', {
  scoped: Effect.gen(function* () {
    // This service needs a FastifyInstance and AuthRouter
    const server = yield* EffectfulFastifyInstance

    // This ensures routes are registered
    yield* AuthRouter
    yield* TrpcRouter

    // Configure the server
    server.register(fastifyCookie)

    server.register(cors, {
      origin: env.ENVIRONMENT === 'development' ? 'http://localhost:3000' : env.FRONTEND_URL,
      credentials: true,
    })

    server.get('/health', (_, reply) => {
      reply.send('ok')
    })

    // Start the server (with proper cleanup)
    yield* Effect.acquireRelease(
      Effect.tryPromise({
        try: () => server.listen({ port: 4000, host: '0.0.0.0' }),
        catch: (error) => new Error(`Failed to start server: ${error}`),
      }),
      () =>
        Effect.async<void>((resume) => {
          server.close(() => resume(Effect.void))
        })
    )

    console.log('✅ FastifyApp: Server started on port 4000')
    return { server }
  }),
}) {}
