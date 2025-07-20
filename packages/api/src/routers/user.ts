import { Effect } from 'effect'
import { publicProcedure, router } from '../trpc.js'

const listUsersEffect = () =>
  Effect.gen(function* () {
    return yield* Effect.succeed('coming soon')
  })

export const userRouter = router({
  list: publicProcedure.query(() => Effect.runPromise(listUsersEffect())),
})
