import { authRouter } from './routers/auth.js'
import { userRouter } from './routers/user.js'
import { router } from './trpc.js'

export const appRouter = router({
  auth: authRouter,
  userRouter: userRouter,
})

// export type definition of API
export type AppRouter = typeof appRouter
