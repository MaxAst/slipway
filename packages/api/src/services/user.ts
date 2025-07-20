import { db, eq, schema } from '@my/db'

export const createUser = async ({
  googleUserId,
  email,
  name,
}: {
  googleUserId: string
  email: string
  name?: string
}) => {
  const [user] = await db
    .insert(schema.users)
    .values({
      email,
      googleUserId,
      name,
    })
    .returning({ id: schema.users.id })

  if (!user) {
    throw new Error('Failed to create user')
  }

  return user
}

export const getUserFromGoogleId = async (googleUserId: string) => {
  const [user] = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.googleUserId, googleUserId))

  return user
}
