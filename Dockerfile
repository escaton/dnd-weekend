FROM node:24-alpine AS builder
RUN corepack enable
WORKDIR /app

ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY apps/web/package.json apps/web/
COPY apps/server/package.json apps/server/
COPY packages/api/package.json packages/api/
RUN pnpm install --frozen-lockfile --ignore-scripts
RUN pnpm rebuild esbuild

COPY . .
RUN pnpm --filter @dnd-weekend/web build
RUN pnpm --filter @dnd-weekend/server build

FROM node:24-alpine AS runtime
RUN corepack enable
WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY apps/web/package.json apps/web/
COPY apps/server/package.json apps/server/
COPY packages/api/package.json packages/api/
RUN pnpm install --frozen-lockfile --ignore-scripts
RUN pnpm rebuild esbuild

COPY --from=builder /app/apps/web/dist apps/web/dist
COPY --from=builder /app/apps/server/dist apps/server/dist
COPY drizzle/ drizzle/
COPY drizzle.config.ts ./
COPY tsconfig.json ./

EXPOSE 3000
CMD ["pnpm", "--filter", "@dnd-weekend/server", "start"]
