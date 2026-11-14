# Multi-stage Dockerfile for FlashReserve Backend (Monorepo)
FROM node:22-alpine AS builder

WORKDIR /usr/src/app

# Copy root configs and package manifests
COPY package*.json turbo.json ./
COPY packages/shared-types/package*.json ./packages/shared-types/
COPY apps/backend/package*.json ./apps/backend/

# Install dependencies for workspaces
RUN npm install --legacy-peer-deps

# Copy and build shared-types package
COPY packages/shared-types/ ./packages/shared-types/
RUN npm run --workspace=@flashreserve/shared-types build

# Copy backend source and configuration files
COPY apps/backend/tsconfig*.json apps/backend/nest-cli.json apps/backend/oxlint.json ./apps/backend/
COPY apps/backend/src/ ./apps/backend/src/
COPY apps/backend/test/ ./apps/backend/test/
COPY apps/backend/certs/ ./apps/backend/certs/

# Build backend
RUN npm run --workspace=@flashreserve/backend build

# Runtime Stage
FROM node:22-alpine AS runner

WORKDIR /usr/src/app

ENV NODE_ENV=production

# Copy root and package manifests
COPY package*.json ./
COPY packages/shared-types/package*.json ./packages/shared-types/
COPY apps/backend/package*.json ./apps/backend/

# Install production dependencies only
RUN npm install --omit=dev --legacy-peer-deps

# Copy compiled shared types
COPY --from=builder /usr/src/app/packages/shared-types/dist ./packages/shared-types/dist

# Copy compiled backend output and runtime assets
COPY --from=builder /usr/src/app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /usr/src/app/apps/backend/src/modules/reservation/lua ./apps/backend/dist/modules/reservation/lua
COPY --from=builder /usr/src/app/apps/backend/certs ./apps/backend/certs

WORKDIR /usr/src/app/apps/backend

EXPOSE 3000

CMD ["node", "dist/main.js"]
