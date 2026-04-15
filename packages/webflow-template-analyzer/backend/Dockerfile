FROM mcr.microsoft.com/playwright/python:v1.48.0-jammy

WORKDIR /app

# Install Python deps
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN playwright install chromium

# Copy all project files
COPY . .

WORKDIR /app/backend

ENV PORT=8080
EXPOSE 8080

CMD ["python3", "server.py"]
