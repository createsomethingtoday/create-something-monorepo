FROM mcr.microsoft.com/playwright/python:v1.49.1-noble

WORKDIR /app

RUN pip install --no-cache-dir playwright==1.49.1

# The agent drives the preinstalled Playwright browser from the terminal; the
# optional OpenHands browser-use tool stack is intentionally not installed.
RUN apt-get update -qq \
  && apt-get install -y --no-install-recommends python3.12-venv nodejs npm \
  && rm -rf /var/lib/apt/lists/* \
  && python -m venv /opt/openhands-sdk-venv \
  && /opt/openhands-sdk-venv/bin/pip install --no-cache-dir --upgrade pip \
  && /opt/openhands-sdk-venv/bin/pip install --pre --no-cache-dir opentelemetry-instrumentation==0.60b1 opentelemetry-instrumentation-threading==0.60b1 \
  && /opt/openhands-sdk-venv/bin/pip install --no-cache-dir openhands-sdk==1.35.0 fastapi fastmcp==3.4.7 \
  && /opt/openhands-sdk-venv/bin/pip install --no-cache-dir --no-deps openhands-tools==1.35.0 \
  && /opt/openhands-sdk-venv/bin/pip install --no-cache-dir binaryornot cachetools libtmux func-timeout tom-swe \
  && NPM_CONFIG_UPDATE_NOTIFIER=false npm install --global @openai/codex@0.147.0

RUN mkdir -p /app/input /app/output
