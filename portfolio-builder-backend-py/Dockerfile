FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN useradd --create-home appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8080

# Explicit sh -c (exec form) so ${PORT} still expands — most PaaS platforms
# (Railway, Render, Fly.io, Heroku-style) inject PORT dynamically — without
# Docker's implicit shell-wrapping warning for a bare shell-form CMD.
CMD ["sh", "-c", "gunicorn config.wsgi:application --bind 0.0.0.0:${PORT:-8080} --workers 3"]
