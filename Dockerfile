FROM node:20-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci

FROM node:20-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build --workspace apps/api
RUN npm run build --workspace apps/web

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/api/dist apps/api/dist
COPY apps/web/.next apps/web/.next
COPY apps/web/next.config.mjs apps/web/next.config.mjs
COPY docker/start.sh /app/start.sh
RUN chmod +x /app/start.sh

EXPOSE 3000 4000
CMD ["/app/start.sh"]
