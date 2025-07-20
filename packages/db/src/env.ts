import { z } from 'zod'

export const envVars = z.object({
  PGHOST: z.string().default('localhost'),
  PGPORT: z.string().default('5432'),
  PGDATABASE: z.string().default('postgres'),
  PGUSER: z.string().default('postgres'),
  PGPASSWORD: z.string().default('postgres'),
})

export const env = envVars.parse({
  PGHOST: process.env.PGHOST,
  PGPORT: process.env.PGPORT,
  PGDATABASE: process.env.PGDATABASE,
  PGUSER: process.env.PGUSER,
  PGPASSWORD: process.env.PGPASSWORD,
})
