FROM docker.io/cloudflare/sandbox:0.12.3

USER root

RUN npm install --global pnpm@10.12.1 @openai/codex@0.142.5 \
    && codex --version \
    && pnpm --version

WORKDIR /app

COPY build/ ./server/
COPY clients/demo-frontend/ ./seed/demo-frontend/
COPY cloudflare/start-client-workspace.sh ./start-client-workspace.sh

RUN rm -rf ./seed/demo-frontend/node_modules ./seed/demo-frontend/.svelte-kit \
    && cd ./seed/demo-frontend \
    && pnpm install --no-frozen-lockfile \
    && chmod +x /app/start-client-workspace.sh

EXPOSE 4173 4310

WORKDIR /workspace
