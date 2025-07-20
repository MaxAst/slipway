import { NodeRuntime } from '@effect/platform-node'
import { env, envToLogger } from '@my/api'
import { Database } from '@my/db/service'
import { Effect, Layer } from 'effect'
import fastify from 'fastify'
import { AuthRouter } from './services/AuthRouter.js'
import { FastifyApp } from './services/FastifyApp.js'
import { EffectfulFastifyInstance } from './services/FastifyInstance.js'
import { FastifyRoute } from './services/FastifyRoute.js'
import { FastifyTrpcPlugin } from './services/FastifyTrpcPlugin.js'
import { TrpcRouter } from './services/TrpcRouter.js'

const FastifyInstanceLive = Layer.sync(EffectfulFastifyInstance, () => {
  console.log('🏗️ Creating FastifyInstance...')
  return fastify({
    maxParamLength: 5000,
    logger: envToLogger[env.ENVIRONMENT],
  })
})

const DatabaseLive = Database.Default

const FastifyRouteLive = FastifyRoute.Default.pipe(
  Layer.provide([FastifyInstanceLive, Layer.scope])
)

const AuthRouterLive = AuthRouter.Default.pipe(Layer.provide([FastifyRouteLive]))

const FastifyTrpcPluginLive = FastifyTrpcPlugin.Default.pipe(
  Layer.provide([FastifyInstanceLive, FastifyRouteLive])
)

const TrpcRouterLive = TrpcRouter.Default.pipe(
  Layer.provide([FastifyTrpcPluginLive, FastifyInstanceLive, DatabaseLive])
)

const FastifyAppLive = FastifyApp.Default.pipe(
  Layer.provide([FastifyInstanceLive, AuthRouterLive, TrpcRouterLive])
)

const App = Layer.scopedDiscard(
  Effect.gen(function* () {
    const { server } = yield* FastifyApp
    console.log(`server routes: ${server.printRoutes()}`)
  })
).pipe(Layer.provide([FastifyAppLive]))

App.pipe(Layer.launch, NodeRuntime.runMain)
