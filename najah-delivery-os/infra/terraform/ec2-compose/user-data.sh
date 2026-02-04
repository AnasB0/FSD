#!/bin/bash

set -e

# Update system
apt-get update
apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
usermod -aG docker ubuntu

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Install nginx
apt-get install -y nginx

# Create application directory
mkdir -p /opt/najah-delivery
cd /opt/najah-delivery

# Create docker-compose.yaml
cat > docker-compose.yaml << 'EOF'
version: '3.8'

services:
  mongo:
    image: mongo:6.0
    container_name: najah-mongo
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db
    environment:
      - MONGO_INITDB_ROOT_USERNAME=admin
      - MONGO_INITDB_ROOT_PASSWORD=admin123
    restart: always
    deploy:
      resources:
        limits:
          memory: 512m

  express-api:
    image: ghcr.io/your-org/najah-delivery-os/express-api:latest
    container_name: najah-express-api
    ports:
      - "8080:8080"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://admin:admin123@mongo:27017/najah-delivery?authSource=admin
      - PORT=8080
    depends_on:
      - mongo
    restart: always
    deploy:
      resources:
        limits:
          memory: 256m

  merchant-portal:
    image: ghcr.io/your-org/najah-delivery-os/merchant-portal:latest
    container_name: najah-merchant-portal
    ports:
      - "3000:3000"
    environment:
      - REACT_APP_API_URL=http://localhost:8080
      - NODE_ENV=production
    depends_on:
      - express-api
    restart: always
    deploy:
      resources:
        limits:
          memory: 512m

  streamlit-admin:
    image: ghcr.io/your-org/najah-delivery-os/streamlit-admin:latest
    container_name: najah-streamlit-admin
    ports:
      - "8501:8501"
    environment:
      - STREAMLIT_SERVER_PORT=8501
      - STREAMLIT_SERVER_ADDRESS=0.0.0.0
      - MONGODB_URI=mongodb://admin:admin123@mongo:27017/najah-delivery?authSource=admin
      - API_URL=http://express-api:8080
    depends_on:
      - mongo
      - express-api
    restart: always
    deploy:
      resources:
        limits:
          memory: 256m

volumes:
  mongo-data:
EOF

# Create .env file
cat > .env << EOF
OPENROUTER_API_KEY=${openrouter_api_key}
MONGODB_URI=mongodb://admin:admin123@mongo:27017/najah-delivery?authSource=admin
NODE_ENV=production
JWT_SECRET=$(openssl rand -base64 32)
EOF

# Set permissions
chown -R ubuntu:ubuntu /opt/najah-delivery

# Start Docker Compose
cd /opt/najah-delivery
docker-compose up -d

# Configure nginx as reverse proxy
cat > /etc/nginx/sites-available/najah-delivery << 'EOF'
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /admin {
        proxy_pass http://localhost:8501;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Enable nginx site
ln -sf /etc/nginx/sites-available/najah-delivery /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx
systemctl enable nginx

# Create systemd service for docker-compose
cat > /etc/systemd/system/najah-delivery.service << EOF
[Unit]
Description=Najah Delivery OS
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/najah-delivery
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
User=root

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable najah-delivery.service

echo "Najah Delivery OS installation complete!"
