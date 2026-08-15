FROM node:22-bookworm-slim AS base
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/* \
  && corepack enable \
  && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/finance-core/package.json packages/finance-core/
COPY packages/db/package.json packages/db/
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile --filter @gpt-finance/api...

FROM deps AS build
COPY packages/shared packages/shared
COPY packages/finance-core packages/finance-core
COPY packages/db packages/db
COPY apps/api apps/api
RUN pnpm --filter @gpt-finance/shared build \
  && pnpm --filter @gpt-finance/finance-core build \
  && pnpm --filter @gpt-finance/db build \
  && pnpm --filter @gpt-finance/api build

FROM node:22-bookworm-slim AS runner
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app /app
EXPOSE 4000
CMD ["sh", "-c", "pnpm --filter @gpt-finance/db migrate && node apps/api/dist/index.js"]
