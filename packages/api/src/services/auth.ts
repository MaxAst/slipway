import * as arctic from 'arctic'
import { env } from '../env.js'

const redirectURI = `${env.SERVER_URL}/google/callback`

export const google = new arctic.Google(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, redirectURI)
