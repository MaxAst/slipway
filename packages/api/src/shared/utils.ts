import { Console, Effect } from 'effect'
import { FetchError, JsonError } from './errors.js'

export const effectfulFetch = (url: URL) =>
  Effect.tryPromise({
    try: (signal) => fetch(url, { signal }),
    catch: (unknown) => {
      Console.error(unknown)
      return new FetchError({ url: url.href })
    },
  })

export const effectfulJson = (response: Response) =>
  Effect.tryPromise({
    try: () => response.json(),
    catch: (unknown) => {
      Console.error(unknown)
      return new JsonError({ url: response.url, contentType: response.headers.get('content-type') })
    },
  })
