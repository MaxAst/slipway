import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import { env } from './env.js'

export type PostgresOptions = postgres.Options<Record<string, postgres.PostgresType>> | undefined

export const getQueryClient = (options?: PostgresOptions) => {
  const defaultOptions: PostgresOptions = {
    user: env.PGUSER,
    password: env.PGPASSWORD,
    database: env.PGDATABASE,
    host: env.PGHOST,
    port: Number.parseInt(env.PGPORT),
  }

  const queryClient = postgres(options ?? defaultOptions)

  const db = drizzle({
    client: queryClient,
  })

  return {
    queryClient,
    db,
  }
}

const { db } = getQueryClient()

export { db }

export const runMigrations = migrate

export type DbType = Parameters<Parameters<typeof db.transaction>[0]>[0] | typeof db

export * from 'drizzle-orm'
export * from './env.js'
export * from './schema/index.js'

