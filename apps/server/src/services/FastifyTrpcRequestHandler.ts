import type { AnyRouter, inferRouterContext } from '@trpc/server'
import {
  incomingMessageToRequest,
  type NodeHTTPCreateContextFnOptions,
  type NodeHTTPRequest,
} from '@trpc/server/adapters/node-http'
import {
  type HTTPBaseHandlerOptions,
  resolveResponse,
  type TRPCRequestInfo,
} from '@trpc/server/http'
import { Effect } from 'effect'
import type { FastifyReply, FastifyRequest } from 'fastify'

type EffectCreateContextFn<TRouter extends AnyRouter, TRequest, TResponse> = (
  opts: NodeHTTPCreateContextFnOptions<TRequest, TResponse>
) => Effect.Effect<inferRouterContext<TRouter>, unknown, never>

type EffectNodeHTTPCreateContextOption<TRouter extends AnyRouter, TRequest, TResponse> = {
  createContext?: EffectCreateContextFn<TRouter, TRequest, TResponse>
}

export type FastifyTrpcHandlerOptions<
  TRouter extends AnyRouter,
  TRequest extends FastifyRequest,
  TResponse extends FastifyReply,
> = HTTPBaseHandlerOptions<TRouter, TRequest> &
  EffectNodeHTTPCreateContextOption<TRouter, TRequest, TResponse>

export const effectTrpcRequestHandler = <
  TRouter extends AnyRouter,
  TRequest extends FastifyRequest,
  TResponse extends FastifyReply,
>(
  opts: FastifyTrpcHandlerOptions<TRouter, TRequest, TResponse> & {
    req: TRequest
    res: TResponse
    path: string
  }
) =>
  Effect.gen(function* () {
    const incomingMessage: NodeHTTPRequest = opts.req.raw

    // monkey-patch body to the IncomingMessage
    if ('body' in opts.req) {
      incomingMessage.body = opts.req.body
    }

    const req = incomingMessageToRequest(incomingMessage, opts.res.raw, {
      maxBodySize: null,
    })

    // Create context function that bridges Effect and Promise
    const createContext = async (innerOpts: { info: TRPCRequestInfo }) => {
      if (opts.createContext) {
        const contextOptions = {
          req: opts.req,
          res: opts.res,
          info: innerOpts.info,
        }
        const effectContext = opts.createContext(contextOptions)
        return await Effect.runPromise(effectContext)
      }
      return undefined
    }

    const res = yield* Effect.promise(() =>
      resolveResponse({
        ...opts,
        req,
        error: null,
        createContext,
        onError(o) {
          opts?.onError?.({
            ...o,
            req: opts.req,
          })
        },
      })
    )

    // Set response status and headers
    yield* Effect.sync(() => {
      opts.res.status(res.status)
      for (const [key, value] of res.headers.entries()) {
        opts.res.header(key, value)
      }
    })

    // Handle the response body
    if (res.body) {
      yield* Effect.promise(async () => {
        try {
          // Use the Web Streams API to read the response
          const responseText = await new Response(res.body).text()
          opts.res.send(responseText)
        } catch (error) {
          console.error('Error reading tRPC response stream:', error)
          opts.res.status(500).send('Internal Server Error')
        }
      })
    } else {
      yield* Effect.sync(() => opts.res.send('missing body'))
    }
  })
