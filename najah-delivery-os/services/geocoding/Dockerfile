FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose the service port
EXPOSE 5002

# Run the application with gunicorn
CMD ["gunicorn", "app:app", "--bind", "0.0.0.0:5002", "--workers", "4", "--timeout", "30"]
