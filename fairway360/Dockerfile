# Fairway360 — production image.
# Single service: the Express API also serves the built SPA on one port (5000).
FROM node:24-bookworm-slim

# pnpm via corepack
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

# Install the full workspace (lockfile is committed; non-frozen avoids a
# pnpm overrides/lockfile config-mismatch error in clean builds)
COPY . .
RUN pnpm install --no-frozen-lockfile

# Build: shared libs (project references) -> API bundle (esbuild) -> SPA (vite).
# Use pnpm filters so each package's local bin (vite, esbuild) resolves correctly.
RUN node node_modules/typescript/bin/tsc --build \
 && pnpm --filter @workspace/api-server build \
 && BASE_PATH=/ PORT=5173 NODE_ENV=production pnpm --filter @workspace/fairway360 build

ENV NODE_ENV=production
ENV PORT=5000
EXPOSE 5000

# Run from the API dir so it resolves ../fairway360/dist/public (the built SPA).
# devDeps (drizzle-kit, tsx) remain available for `db push` / `seed` via exec.
WORKDIR /app/artifacts/api-server
CMD ["node", "dist/index.mjs"]
