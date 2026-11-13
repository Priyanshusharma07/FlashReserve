# Multi-stage Dockerfile for FlashReserve Engine
FROM node:22-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm i --legacy-peer-deps

COPY tsconfig*.json nest-cli.json ./
COPY src/ ./src/
COPY test/ ./test/

RUN npm run build

# Runtime Stage
FROM node:22-alpine AS runner

WORKDIR /usr/src/app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm i --omit=dev --legacy-peer-deps

COPY --from=builder /usr/src/app/dist ./dist
# Copy Lua scripts required for atomic reservations
COPY --from=builder /usr/src/app/src/modules/reservation/lua ./dist/modules/reservation/lua
# Copy certificates
COPY certs/ ./certs/

EXPOSE 3000

CMD ["node", "dist/main.js"]
