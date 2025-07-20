import { getRandomValues } from 'node:crypto'
import { db, eq, type Session, schema, type User } from '@my/db'
import { sha256 } from '@oslojs/crypto/sha2'
import { encodeBase32LowerCaseNoPadding, encodeHexLowerCase } from '@oslojs/encoding'
import type { Context } from '../trpc.js'

export function generateSessionToken(): string {
  const bytes = new Uint8Array(20)
  getRandomValues(bytes)
  const token = encodeBase32LowerCaseNoPadding(bytes)
  return token
}

export async function createSession(token: string, userId: string): Promise<Session> {
  const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)))
  const session: Session = {
    id: sessionId,
    userId,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30), // 30 days
    createdAt: new Date(),
  }
  await db.insert(schema.sessions).values(session)
  return session
}

export async function validateSessionToken(ctx: Context): Promise<SessionValidationResult> {
  const { logger } = ctx
  try {
    const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(ctx.session)))

    const [result] = await db
      .select({ user: schema.users, session: schema.sessions })
      .from(schema.sessions)
      .innerJoin(schema.users, eq(schema.sessions.userId, schema.users.id))
      .where(eq(schema.sessions.id, sessionId))

    if (!result) {
      return { session: null, user: null }
    }

    const { user, session } = result

    if (Date.now() >= session.expiresAt.getTime()) {
      await db.delete(schema.sessions).where(eq(schema.sessions.id, session.id))
      return { session: null, user: null }
    }

    if (Date.now() >= session.expiresAt.getTime() - 1000 * 60 * 60 * 24 * 15) {
      session.expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)
      await db
        .update(schema.sessions)
        .set({
          expiresAt: session.expiresAt,
        })
        .where(eq(schema.sessions.id, session.id))
    }

    return { session, user }
  } catch (error) {
    logger.error({ error }, 'Error validating session token')
    return { session: null, user: null }
  }
}

export async function invalidateSession(sessionId: string): Promise<void> {
  await db.delete(schema.sessions).where(eq(schema.sessions.id, sessionId))
}

export async function invalidateAllSessions(userId: string): Promise<void> {
  await db.delete(schema.sessions).where(eq(schema.sessions.userId, userId))
}

export type SessionValidationResult =
  | { session: Session; user: User }
  | { session: null; user: null }
