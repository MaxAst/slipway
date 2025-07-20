import { Context } from 'effect'

export class EffectfulFastifyInstance extends Context.Tag('FastifyInstance')<
  EffectfulFastifyInstance,
  import('fastify').FastifyInstance
>() {}
