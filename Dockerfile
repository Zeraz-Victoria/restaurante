FROM node:20-alpine AS base

# Dependencias (Stage 1)
FROM base AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# Constructor (Stage 2)
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Generar Cliente Prisma
RUN npx prisma generate
# Construir Next.js
RUN npm run build

# Producción (Stage 3)
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copiamos el build
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Exponer el puerto
EXPOSE 3000
ENV PORT 3000
CMD ["node", "server.js"]
