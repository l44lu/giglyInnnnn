# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files and install deps
COPY package*.json ./
RUN npm install

# Copy code
COPY . .

# Generate Prisma Client (needed for build)
RUN npx prisma generate

# Build Nest app (creates dist/)
RUN npm run build

# Stage 2: Production (smaller image)
FROM node:20-alpine

WORKDIR /app

# Copy node_modules from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy the built dist folder
COPY --from=builder /app/dist ./dist

# Copy package json (for scripts in production)
COPY --from=builder /app/package*.json ./

# Copy Prisma folder so migration / client work
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000

CMD ["npm", "run", "start:prod"]