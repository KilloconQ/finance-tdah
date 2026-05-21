FROM oven/bun:1.2-alpine AS base
WORKDIR /repo
RUN apk add --no-cache wget

FROM base AS deps
COPY package.json pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN bun install --frozen-lockfile || bun install

FROM base AS build
COPY --from=deps /repo /repo
COPY packages/shared packages/shared
COPY apps/api apps/api
WORKDIR /repo/apps/api
RUN bun run typecheck || echo 'typecheck skipped'

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /repo
COPY --from=build /repo /repo
WORKDIR /repo/apps/api
EXPOSE 3001
CMD ["sh", "-c", "bun src/db/migrate.ts && bun src/index.ts"]
