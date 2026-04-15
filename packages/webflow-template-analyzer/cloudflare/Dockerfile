FROM mcr.microsoft.com/playwright/python:v1.48.0-jammy

WORKDIR /app

COPY runtime/backend/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt && playwright install chromium

COPY runtime/ /app/

WORKDIR /app/backend
ENV PORT=7860

EXPOSE 7860

CMD ["python3", "server.py"]
