# Stage 1: Build & Prepare Dependencies
FROM node:24-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Deterministic dependency installation
RUN npm ci

# Copy application source and Prisma definitions
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build NestJS production bundle (dist/)
RUN npm run build

# Prune development dependencies (Jest, ESLint, TypeScript, etc.)
# Keeps production dependencies and required Prisma engine/CLI files
RUN npm prune --omit=dev

# Stage 2: Production Runtime
FROM node:24-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Prepare application directory and permissions for non-root user
RUN mkdir -p /app/logs && chown -R node:node /app

# Copy pruned dependencies and Prisma Client
COPY --chown=node:node --from=builder /app/node_modules ./node_modules

# Copy compiled application code
COPY --chown=node:node --from=builder /app/dist ./dist

# Copy package manifests
COPY --chown=node:node --from=builder /app/package*.json ./

# Copy Prisma schema and migrations for runtime deployment
COPY --chown=node:node --from=builder /app/prisma ./prisma

# Copy container entrypoint script
COPY --chown=node:node docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Switch to non-root node user
USER node

# Expose NestJS application port
EXPOSE 3000

# Execute entrypoint (handles db wait, migrations deploy, and app launch)
ENTRYPOINT ["./docker-entrypoint.sh"]