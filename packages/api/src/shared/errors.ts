import { Data } from 'effect'

export class FetchError extends Data.TaggedError('FetchError')<{
  url: string
}> {}

export class JsonError extends Data.TaggedError('JsonError')<{
  url: string
  contentType: string | null
}> {}
