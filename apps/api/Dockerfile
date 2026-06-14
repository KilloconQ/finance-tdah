FROM oven/bun:1.2-alpine AS base
WORKDIR /repo
RUN apk add --no-cache wget

# Install workspace deps with pnpm: bun does NOT read pnpm-workspace.yaml, so a
# `bun install` at the root skips apps/api's dependencies entirely (drizzle-orm,
# pg, etc.). pnpm understands the workspace + `workspace:*` links correctly.
FROM node:22-alpine AS deps
RUN corepack enable && corepack prepare pnpm@11.1.1 --activate
WORKDIR /repo
COPY package.json pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --frozen-lockfile=false

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /repo
# node_modules from deps survive the source COPY because .dockerignore excludes
# them from the build context (otherwise host symlinks would clobber them).
COPY --from=deps /repo /repo
COPY packages/shared packages/shared
COPY apps/api apps/api
WORKDIR /repo/apps/api
EXPOSE 3001
CMD ["sh", "-c", "bun src/db/migrate.ts && bun src/index.ts"]
