FROM node:20-alpine AS deps

WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci --omit=dev


FROM node:20-alpine AS runner

WORKDIR /app

RUN mkdir -p /app/data

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=production \
    PORT=3000 \
    DB_PATH=/app/data/books.db

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "\
    require('http').get('http://localhost:3000/', r => \
      process.exit(r.statusCode >= 200 && r.statusCode < 400 ? 0 : 1) \
    ).on('error', () => process.exit(1))"

CMD ["node", "app.js"]
