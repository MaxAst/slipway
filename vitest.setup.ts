import { afterAll, beforeAll } from 'vitest'
import { env } from './packages/db/dist/env.js'
import { db, getQueryClient, runMigrations } from './packages/db/dist/index.js'

const { queryClient, db: tempDb } = getQueryClient({
  user: env.PGUSER,
  password: env.PGPASSWORD,
  host: env.PGHOST,
  port: Number.parseInt(env.PGPORT),
  database: 'postgres',
})

const ensureDatabaseExists = async () => {
  try {
    await tempDb.execute(`DROP DATABASE IF EXISTS ${env.PGDATABASE}`)
    await tempDb.execute(`CREATE DATABASE ${env.PGDATABASE}`)
  } catch (err) {
    if (err.code === '42P04') {
      // Database ${DB_NAME} already exists, we do nothing
      return
    }
    console.error('Error setting up test database:', err)
    throw err
  } finally {
    await queryClient.end()
  }
}

beforeAll(async () => {
  await ensureDatabaseExists()
  await runMigrations(db, {
    migrationsFolder: './packages/db/drizzle',
  })
}, 60000)

afterAll(async () => {
  await queryClient.end()
})
