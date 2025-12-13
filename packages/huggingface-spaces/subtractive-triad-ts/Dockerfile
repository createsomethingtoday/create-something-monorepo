# Subtractive Triad Reviewer - Hugging Face Space
# TypeScript + Express + Claude

FROM node:20-slim AS builder

WORKDIR /app

# Copy package files and install all deps (including dev for build)
COPY package.json ./
RUN npm install

# Copy source files
COPY tsconfig.json ./
COPY src/ ./src/

# Build TypeScript
RUN npx tsc

# Production image
FROM node:20-slim

WORKDIR /app

# Copy package.json and install production deps only
COPY package.json ./
RUN npm install --omit=dev

# Copy built files from builder
COPY --from=builder /app/dist ./dist
COPY static/ ./static/

# Copy static to dist for the server
RUN cp -r static/* dist/ 2>/dev/null || true

# Expose port (HF Spaces uses 7860)
EXPOSE 7860

# Set environment variables
ENV PORT=7860
ENV NODE_ENV=production

# Run the server
CMD ["node", "dist/server.js"]
