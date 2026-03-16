# Backend Dockerfile
# --- Build Stage ---
FROM python:3.11-slim as builder

# Set working directory
WORKDIR /app

# Install build dependencies
RUN pip install --upgrade pip

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip wheel --no-cache-dir --wheel-dir /app/wheels -r requirements.txt


# --- Final Stage ---
FROM python:3.11-slim

# Set working directory
WORKDIR /


# Install postgresql-client for wait-for-it.sh
RUN apt-get update && apt-get install -y postgresql-client && rm -rf /var/lib/apt/lists/*

# Create a non-root user
RUN useradd --create-home appuser

# Copy entrypoint script and make it executable
COPY entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/entrypoint.sh

USER appuser

# Add user's local bin to PATH
ENV PATH="/home/appuser/.local/bin:$PATH"

# Copy installed dependencies from builder stage
COPY --from=builder /app/wheels /wheels
RUN pip install --no-cache /wheels/*

# Copy application code selectively
COPY ./app /app
COPY ./alembic.ini /app/alembic.ini
RUN rm -rf /app/alembic
COPY ./alembic /app/alembic
COPY ./wait-for-it.sh /app/wait-for-it.sh

USER root
RUN chmod +x /app/wait-for-it.sh
RUN chown -R appuser:appuser /app/alembic/versions
RUN mkdir -p /app/uploads && chown -R appuser:appuser /app/uploads
USER appuser

# Healthcheck
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 CMD [ "python", "-c", "import httpx; exit(1) if httpx.get('http://localhost:8000/api/health').status_code != 200 else exit(0)" ]

# Expose port and set command
EXPOSE 8000
CMD ["sh", "-c", "cd /app && alembic upgrade head && cd / && gunicorn app.main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000"]
