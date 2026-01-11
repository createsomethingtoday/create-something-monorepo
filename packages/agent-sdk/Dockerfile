# CREATE SOMETHING Agent SDK
# Container deployment for Python agent runtime

FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install uv for fast dependency installation
RUN pip install uv

# Copy package files
COPY pyproject.toml .
COPY README.md .

# Install dependencies
RUN uv pip install --system -e ".[server]"

# Copy application
COPY src/ src/
COPY server/ server/

# Create non-root user
RUN useradd -m -u 1000 agent
USER agent

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run server
CMD ["uvicorn", "server.main:app", "--host", "0.0.0.0", "--port", "8000"]
