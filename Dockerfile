# Use Node.js 22 alpine as the base image for optimization
FROM node:22-alpine AS builder

# Set working directory
WORKDIR /app

# Enable Corepack for Yarn
RUN corepack enable

# Copy package descriptors
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy standard project files
COPY tsconfig.json ./
COPY src/ ./src/

# Compile TypeScript
RUN yarn tsc

# --- Runner Stage ---
FROM node:22-alpine AS runner

# We use production environment
ENV NODE_ENV=production

WORKDIR /app

# Enable Corepack
RUN corepack enable

# Copy package descriptors
COPY package.json yarn.lock ./

# Install only production dependencies
RUN yarn install --production --frozen-lockfile

# Copy built artifacts from builder stage
COPY --from=builder /app/dist ./dist

# Start the server
CMD ["yarn", "start"]
