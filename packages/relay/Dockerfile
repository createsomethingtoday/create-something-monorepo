FROM docker.io/cloudflare/sandbox:0.12.14

USER root

# Install Node.js 22 (required by clawdbot) and rsync (for R2 backup sync)
# The base image ships Node 24; clawdbot is qualified on Node 22, so pin 22.23.4
# (CVE-2026-111497 fix) with a direct binary download for reliability
ENV NODE_VERSION=22.23.4
RUN apt-get update && apt-get install -y xz-utils ca-certificates rsync \
    && curl -fsSLk https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz -o /tmp/node.tar.xz \
    && tar -xJf /tmp/node.tar.xz -C /usr/local --strip-components=1 \
    && rm /tmp/node.tar.xz \
    && node --version \
    && npm --version

# Install pnpm globally
RUN npm install -g pnpm

# Install moltbot (CLI is still named clawdbot until upstream renames)
# Pin to specific version for reproducible builds
RUN npm install -g clawdbot@2026.1.24-3 \
    && clawdbot --version

# Create moltbot directories (paths still use clawdbot until upstream renames)
# Templates are stored in /root/.clawdbot-templates for initialization
RUN mkdir -p /root/.clawdbot \
    && mkdir -p /root/.clawdbot-templates \
    && mkdir -p /root/clawd \
    && mkdir -p /root/clawd/skills

# Copy startup script
# Build cache bust: 2026-10-22-sandbox-0.12.14
COPY start-moltbot.sh /usr/local/bin/start-moltbot.sh
COPY scripts/backup-loop.mjs scripts/container-backup.mjs scripts/run-gateway.mjs /usr/local/lib/relay/
RUN chmod +x /usr/local/bin/start-moltbot.sh

# Copy default configuration template
COPY moltbot.json.template /root/.clawdbot-templates/moltbot.json.template

# Copy custom skills
COPY skills/ /root/clawd/skills/

# Set working directory
WORKDIR /root/clawd

# Expose the gateway port
EXPOSE 18789
