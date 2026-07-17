# Multi-stage Docker build for lightweight production images
# Stage 1: Build stage
FROM node:18-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci

COPY . .

# Compile frontend static assets and compile backend production server
RUN npm run build

# Stage 2: Minimalist Production Runner Stage
FROM node:18-alpine

WORKDIR /usr/src/app

# Only copy required build outputs and package manifest
COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /usr/src/app/dist ./dist

# Standard production environment variables
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["npm", "run", "start"]
