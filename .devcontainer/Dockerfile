FROM mcr.microsoft.com/devcontainers/universal:4.0.1-noble

ARG TARGETARCH
ARG NODE_VERSION=22.21.1
ARG PNPM_VERSION=9.15.0
ARG WRANGLER_VERSION=4.64.0

RUN find /etc/apt/sources.list.d -maxdepth 1 -type f \
        \( -iname '*yarn*' -o -iname '*dl_yarnpkg_com*' \) -delete \
    && apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl gnupg jq xz-utils \
    && case "${TARGETARCH}" in \
        "amd64") NODE_ARCH="x64" ;; \
        "arm64") NODE_ARCH="arm64" ;; \
        *) echo "Unsupported architecture: ${TARGETARCH}" >&2; exit 1 ;; \
      esac \
    && curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-${NODE_ARCH}.tar.xz" \
      | tar -xJ --strip-components=1 -C /usr/local --no-same-owner \
    && if ! command -v gh >/dev/null 2>&1; then \
        curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
          | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg \
        && chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg \
        && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
          > /etc/apt/sources.list.d/github-cli.list \
        && apt-get update \
        && apt-get install -y --no-install-recommends gh; \
      fi \
    && curl -1sLf "https://artifacts-cli.infisical.com/setup.deb.sh" | bash \
    && apt-get update \
    && apt-get install -y --no-install-recommends infisical \
    && corepack enable \
    && corepack prepare pnpm@${PNPM_VERSION} --activate \
    && npm install -g wrangler@${WRANGLER_VERSION} \
    && rm -rf /var/lib/apt/lists/*
