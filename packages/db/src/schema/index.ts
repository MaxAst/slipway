import * as sessions from './sessions.js'
import * as users from './users.js'

export const schema = {
  ...sessions,
  ...users,
}

export type { Session } from './sessions.js'
export type { User } from './users.js'

