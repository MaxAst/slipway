import type { PinoLoggerOptions } from 'fastify/types/logger.js'
import type { env } from './env.js'

export const isSafeRedirect = (url: string | undefined): url is string =>
  typeof url === 'string' && url.startsWith('/') && !url.startsWith('//')

export const isNotFalsey = <T>(value: T): value is NonNullable<typeof value> => !!value

export const isError = (e: unknown): e is Error => {
  return e instanceof Error
}

export const envToLogger: Record<typeof env.ENVIRONMENT, PinoLoggerOptions | boolean> = {
  development: {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  },
  production: true,
}