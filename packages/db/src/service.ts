import { drizzle } from 'drizzle-orm/postgres-js'
import { Effect } from 'effect'
import postgres from 'postgres'
import { env } from './env.js'
import type { DbType, PostgresOptions } from './index.js'

// Effect-ified database service with proper resource cleanup
export class Database extends Effect.Service<Database>()('Database', {
  scoped: Effect.gen(function* () {
    const defaultOptions: PostgresOptions = {
      user: env.PGUSER,
      password: env.PGPASSWORD,
      database: env.PGDATABASE,
      host: env.PGHOST,
      port: Number.parseInt(env.PGPORT),
    }

    const queryClient = postgres(defaultOptions)
    const db = drizzle({ client: queryClient })

    // Ensure connection is established
    yield* Effect.acquireRelease(
      Effect.tryPromise({
        try: () => queryClient`SELECT 1`,
        catch: (error) => new Error(`Failed to connect to database: ${error}`),
      }),
      () => Effect.promise(() => queryClient.end())
    )

    const query = <T>(queryFn: (db: DbType) => Promise<T>) =>
      Effect.tryPromise({
        try: () => queryFn(db),
        catch: (error) => new Error(`Database query failed: ${error}`),
      })

    console.log('✅ Database: Connected to PostgreSQL')
    return { db, queryClient, query }
  }),
}) {}
