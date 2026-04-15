FROM mcr.microsoft.com/playwright/python:v1.48.0-jammy

WORKDIR /app

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN playwright install chromium

COPY . .

WORKDIR /app/backend

ENV PORT=8080
EXPOSE 8080

CMD ["python3", "server.py"]
