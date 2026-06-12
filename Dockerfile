# ─────────────────────────────────────────────
# Stage 1: deps
#   Installs production dependencies and compiles
#   the better-sqlite3 native addon.
# ─────────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

# Build tools required by better-sqlite3 (native addon)
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci --omit=dev


# ─────────────────────────────────────────────
# Stage 2: runner
#   Minimal production image — no build tools,
#   no devDependencies, no source map bloat.
# ─────────────────────────────────────────────
FROM node:20-alpine AS runner

# Unprivileged user for security
RUN addgroup -g 1001 -S appgroup && \
    adduser  -u 1001 -S appuser -G appgroup

WORKDIR /app

# Persistent data directory (mount a volume here)
RUN mkdir -p /data && chown appuser:appgroup /data

# Copy compiled deps from build stage, then app source
COPY --from=deps  --chown=appuser:appgroup /app/node_modules ./node_modules
COPY              --chown=appuser:appgroup . .

USER appuser

ENV NODE_ENV=production \
    PORT=3000 \
    DB_PATH=/data/books.db

EXPOSE 3000

VOLUME ["/data"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "\
    require('http').get('http://localhost:3000/', r => \
      process.exit(r.statusCode >= 200 && r.statusCode < 400 ? 0 : 1) \
    ).on('error', () => process.exit(1))"

# Run node directly (not via npm) for clean SIGTERM handling
CMD ["node", "app.js"]
