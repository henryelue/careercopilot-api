# Step 1: Use a slim Python image to keep the deployment fast and light
FROM python:3.11-slim

# Step 2: Set environment variables to optimize Python for a container
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Step 3: Set the working directory inside the container
WORKDIR /app

# Step 4: Install system dependencies (essential for some Python packages)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Step 5: Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Step 6: Copy the rest of your application code
COPY . .

# Step 7: Launch the application
# Cloud Run dynamically assigns a PORT, so we must use the $PORT variable
CMD exec uvicorn main:app --host 0.0.0.0 --port $PORT