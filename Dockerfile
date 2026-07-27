# Multi-stage Docker build for lightweight production images
# Stage 1: Build stage
FROM node:22-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci

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
RUN npm ci --omit=dev

COPY --from=builder /usr/src/app/dist ./dist

# Standard production environment variables
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/session').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["npm", "run", "start"]
