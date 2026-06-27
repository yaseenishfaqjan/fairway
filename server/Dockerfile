# syntax=docker/dockerfile:1

# ---- Build stage: compile TypeScript using the full workspace ----
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json ./server/package.json
COPY client/package.json ./client/package.json
RUN npm ci
COPY server ./server
RUN npm run build -w server

# ---- Runtime stage: production deps only, plain node ----
FROM node:20-alpine AS runner
WORKDIR /app/server
ENV NODE_ENV=production
COPY server/package.json ./package.json
RUN npm install --omit=dev --no-package-lock && npm cache clean --force
COPY --from=builder /app/server/dist ./dist
COPY --from=builder /app/server/drizzle ./drizzle
COPY server/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
EXPOSE 3001
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "dist/index.js"]
