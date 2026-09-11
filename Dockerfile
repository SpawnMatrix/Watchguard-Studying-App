# Multi-stage Docker build for lightweight production images
# Stage 1: Build stage
FROM node:22-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./

# Lifecycle scripts from transitive dependencies have no business running
# during an image build; the project itself defines none.
RUN npm ci --ignore-scripts

COPY . .

# Declare the arguments expected from GitHub Actions
ARG COMMIT_SHA="unknown"
ARG BUILD_DATE="unknown"

# Map them to environment variables if your app needs them at runtime
ENV VITE_APP_COMMIT_SHA=${COMMIT_SHA}
ENV VITE_APP_BUILD_DATE=${BUILD_DATE}

# Compile frontend static assets and compile backend production server
RUN npm run build

# Stage 2: Minimalist Production Runner Stage
FROM node:22-alpine

WORKDIR /usr/src/app

# Only copy required build outputs and package manifest
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

COPY --from=builder /usr/src/app/dist ./dist
COPY scripts/backup.mjs ./scripts/backup.mjs

ARG COMMIT_SHA="unknown"
ARG BUILD_DATE="unknown"
ENV APP_COMMIT_SHA=${COMMIT_SHA}
ENV APP_BUILD_DATE=${BUILD_DATE}

# Standard production environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/data

# The image ships with an unprivileged user; use it. Running the portal as
# root meant any remote-code-execution bug in Express landed as uid 0 inside
# the container, which on a Proxmox host is a materially worse outcome.
# /data is the only path the runtime needs to write, so only /data is owned
# by that user — the application code stays read-only to the process.
RUN mkdir -p /data && chown -R node:node /data && chown -R root:node /usr/src/app && chmod -R g-w /usr/src/app

USER node

EXPOSE 3000

# Dedicated liveness route that exercises no authentication or database code,
# so a probe can never be confused with real traffic or trip a rate limiter.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/healthz').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

# Exec the server directly rather than through npm: one less process, and
# nothing tries to write an npm log or cache, so the container can run with a
# read-only root filesystem.
CMD ["node", "dist/server.cjs"]
