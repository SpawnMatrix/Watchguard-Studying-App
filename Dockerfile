# Multi-stage Dockerfile for high efficiency
# Stage 1: Build & Compile stage
FROM node:18-alpine AS builder
WORKDIR /app

# Install build dependencies
COPY package*.json ./
RUN npm ci

# Copy full application code
COPY . .

# Build React frontend assets and compile the CJS backend server via esbuild
RUN npm run build

# Remove development dependencies
RUN npm prune --production

# Stage 2: Minimalist Production Runner
FROM node:18-alpine AS runner
WORKDIR /app

# Ensure security defaults
ENV NODE_ENV=production
ENV PORT=3000

# Copy necessary production assets and bundles
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Expose server listener port
EXPOSE 3000

# Run standalone server
CMD ["npm", "run", "start"]
