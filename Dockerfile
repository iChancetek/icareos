FROM node:20-alpine AS deps
RUN apk upgrade --no-cache
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --only=production

FROM node:20-alpine AS builder
RUN apk upgrade --no-cache
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

# Build the Next.js application
# Pass dummy values for build-time env vars (real secrets are injected at runtime)
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build

FROM node:20-alpine AS runner
RUN apk upgrade --no-cache
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create a non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy only what's needed to run the server
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
