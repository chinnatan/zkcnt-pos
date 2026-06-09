FROM oven/bun:1-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

FROM base AS build
ARG NUXT_PUBLIC_POCKETBASE_URL=http://localhost:8090
ARG NUXT_PUBLIC_APP_URL=http://localhost:3000
ENV NUXT_PUBLIC_POCKETBASE_URL=$NUXT_PUBLIC_POCKETBASE_URL
ENV NUXT_PUBLIC_APP_URL=$NUXT_PUBLIC_APP_URL
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

FROM base AS production
ENV NODE_ENV=production
COPY --from=build /app/.output ./.output
EXPOSE 3000
CMD ["bun", "run", ".output/server/index.mjs"]
