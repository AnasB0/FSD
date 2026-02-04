# Use Python 3.11 slim image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose service port
EXPOSE 5001

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV OPTIMIZER_PORT=5001

# Run with gunicorn
CMD ["gunicorn", "app:app", "--bind", "0.0.0.0:5001", "--workers", "4", "--timeout", "120"]
