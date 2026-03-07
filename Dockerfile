FROM node:22-alpine AS base

# Stage 1: Install dependencies
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build args are injected at build time for NEXT_PUBLIC_ vars
ARG NEXT_PUBLIC_AZURACAST_BASE_URL
ARG NEXT_PUBLIC_AZURACAST_STATION_SHORT_NAME
ARG NEXT_PUBLIC_FORCE_WHITE_TEXT

ENV NEXT_PUBLIC_AZURACAST_BASE_URL=$NEXT_PUBLIC_AZURACAST_BASE_URL
ENV NEXT_PUBLIC_AZURACAST_STATION_SHORT_NAME=$NEXT_PUBLIC_AZURACAST_STATION_SHORT_NAME
ENV NEXT_PUBLIC_FORCE_WHITE_TEXT=$NEXT_PUBLIC_FORCE_WHITE_TEXT

RUN npm run build

# Stage 3: Minimal production runner
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Standalone output includes the server and all required files
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
