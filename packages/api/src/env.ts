import { z } from 'zod'

const envVars = z.object({
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
  FRONTEND_URL: z.string(),
  SERVER_URL: z.string(),
  COOKIE_DOMAIN: z.string(),
  ENVIRONMENT: z.enum(['development', 'production']),
})

export const env = envVars.parse({
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  FRONTEND_URL: process.env.FRONTEND_URL,
  SERVER_URL: process.env.SERVER_URL,
  COOKIE_DOMAIN: process.env.COOKIE_DOMAIN,
  ENVIRONMENT: process.env.ENVIRONMENT,
})
