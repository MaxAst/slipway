FROM node:lts-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS pruner
LABEL stage=intermediate
WORKDIR /app
RUN pnpm add --global turbo
COPY . .
RUN turbo prune --scope=server --docker

FROM base AS builder
LABEL stage=intermediate
WORKDIR /app
COPY --from=pruner /app/out/json/ .
RUN pnpm install
COPY --from=pruner /app/out/full/ .
RUN pnpm run server:build

FROM base AS installer
LABEL stage=intermediate
WORKDIR /app
COPY --from=pruner /app/out/json/ .
RUN pnpm install --prod --frozen-lockfile
COPY --from=builder /app/packages/api/dist /app/packages/api/dist
COPY --from=builder /app/packages/db/dist /app/packages/db/dist
COPY --from=builder /app/apps/server/dist /app/apps/server/dist

FROM base AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 fastify
USER fastify
COPY --from=installer --chown=fastify:nodejs /app .
CMD ["node", "apps/server/dist/server.js"]
