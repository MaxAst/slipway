import { defineConfig } from 'drizzle-kit'
import { env } from './src/env'

export default defineConfig({
  dialect: 'postgresql',
  schema: './dist/schema/*.js',
  out: './drizzle',
  dbCredentials: {
    host: env.PGHOST,
    port: Number.parseInt(env.PGPORT),
    user: env.PGUSER,
    password: env.PGPASSWORD,
    database: env.PGDATABASE,
    ssl: false,
  },
})
