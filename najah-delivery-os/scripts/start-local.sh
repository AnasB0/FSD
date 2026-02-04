#!/bin/bash

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Najah Delivery OS locally...${NC}\n"

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Checking for .env.example...${NC}"
    if [ -f .env.example ]; then
        echo -e "${GREEN}✓ Copying .env.example to .env${NC}"
        cp .env.example .env
        echo -e "${YELLOW}⚠️  Please update .env with your actual API keys and secrets${NC}\n"
    else
        echo -e "${YELLOW}⚠️  Neither .env nor .env.example found. Creating basic .env...${NC}"
        cat > .env << EOF
# MongoDB Configuration
MONGODB_URI=mongodb://admin:admin123@mongo:27017/najah-delivery?authSource=admin

# API Keys
OPENROUTER_API_KEY=your_openrouter_api_key_here
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
STRIPE_SECRET_KEY=your_stripe_secret_key_here

# JWT Secret
JWT_SECRET=your_jwt_secret_here_change_in_production

# Node Environment
NODE_ENV=development
EOF
        echo -e "${YELLOW}⚠️  Basic .env created. Please update with your actual API keys and secrets${NC}\n"
    fi
fi

# Navigate to docker directory
cd infra/docker || { echo "Error: infra/docker directory not found"; exit 1; }

# Build and start services
echo -e "${BLUE}🔨 Building and starting Docker containers...${NC}\n"
docker compose up -d --build

# Wait for services to be healthy
echo -e "\n${BLUE}⏳ Waiting for services to be healthy...${NC}\n"
sleep 10

# Check MongoDB health
echo -e "${BLUE}Checking MongoDB...${NC}"
for i in {1..30}; do
    if docker compose exec -T mongo mongosh --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ MongoDB is ready${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${YELLOW}⚠️  MongoDB may not be fully ready yet${NC}"
    fi
    sleep 2
done

# Display service URLs
echo -e "\n${GREEN}✅ Najah Delivery OS is running!${NC}\n"
echo -e "${BLUE}📋 Service URLs:${NC}"
echo -e "   ${GREEN}Express API:${NC}        http://localhost:8080"
echo -e "   ${GREEN}Auth Service:${NC}       http://localhost:8081"
echo -e "   ${GREEN}Payments Service:${NC}   http://localhost:8082"
echo -e "   ${GREEN}Ingestion Service:${NC}  http://localhost:8083"
echo -e "   ${GREEN}Optimizer Service:${NC}  http://localhost:5001"
echo -e "   ${GREEN}Geocoding Service:${NC}  http://localhost:5002"
echo -e "   ${GREEN}LLM Assistant:${NC}      http://localhost:5003"
echo -e "   ${GREEN}Merchant Portal:${NC}    http://localhost:3000"
echo -e "   ${GREEN}Driver App:${NC}         http://localhost:3001"
echo -e "   ${GREEN}Streamlit Admin:${NC}    http://localhost:8501"
echo -e "   ${GREEN}MongoDB:${NC}            mongodb://localhost:27017"

echo -e "\n${BLUE}📊 View logs:${NC}"
echo -e "   docker compose logs -f [service-name]"

echo -e "\n${BLUE}🛑 Stop services:${NC}"
echo -e "   ./scripts/stop-local.sh"

echo -e "\n${GREEN}Happy coding! 🎉${NC}\n"
