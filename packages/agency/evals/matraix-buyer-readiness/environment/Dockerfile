FROM mcr.microsoft.com/playwright/python:v1.64.1-noble

WORKDIR /app

RUN pip install --no-cache-dir playwright==1.64.1

# The agent drives the preinstalled Playwright browser from the terminal; the
# optional OpenHands browser-use tool stack is intentionally not installed.
# Node comes from nodejs.org, not Ubuntu's package (Noble ships 18.x, EOL and
# unpatched for CVE-2026-111497).
ENV NODE_VERSION=22.23.4
RUN apt-get update -qq \
  && apt-get install -y --no-install-recommends python3.12-venv xz-utils curl ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && case "$(uname -m)" in x86_64) NODE_ARCH=x64 ;; aarch64) NODE_ARCH=arm64 ;; *) echo "unsupported arch" >&2; exit 1 ;; esac \
  && curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-${NODE_ARCH}.tar.xz" -o /tmp/node.tar.xz \
  && tar -xJf /tmp/node.tar.xz -C /usr/local --strip-components=1 \
  && rm /tmp/node.tar.xz \
  && node --version \
  && python -m venv /opt/openhands-sdk-venv \
  && /opt/openhands-sdk-venv/bin/pip install --no-cache-dir --upgrade pip \
  && /opt/openhands-sdk-venv/bin/pip install --pre --no-cache-dir opentelemetry-instrumentation==0.60b1 opentelemetry-instrumentation-threading==0.60b1 \
  && /opt/openhands-sdk-venv/bin/pip install --no-cache-dir openhands-sdk==1.35.0 fastapi fastmcp==3.4.7 \
  && /opt/openhands-sdk-venv/bin/pip install --no-cache-dir --no-deps openhands-tools==1.35.0 \
  && /opt/openhands-sdk-venv/bin/pip install --no-cache-dir binaryornot cachetools libtmux func-timeout tom-swe \
  && NPM_CONFIG_UPDATE_NOTIFIER=false npm install --global @openai/codex@0.147.0

RUN mkdir -p /app/input /app/output
