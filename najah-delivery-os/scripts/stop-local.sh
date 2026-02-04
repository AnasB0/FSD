#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🛑 Stopping Najah Delivery OS...${NC}\n"

# Navigate to docker directory
cd infra/docker || { echo "Error: infra/docker directory not found"; exit 1; }

# Check if user wants to remove volumes
if [ "$1" == "--volumes" ] || [ "$1" == "-v" ]; then
    echo -e "${YELLOW}⚠️  Stopping services and removing volumes (all data will be lost)...${NC}"
    docker compose down -v
    echo -e "${RED}✓ Services stopped and volumes removed${NC}\n"
else
    echo -e "${BLUE}Stopping services (data will be preserved)...${NC}"
    docker compose down
    echo -e "${BLUE}✓ Services stopped${NC}\n"
    echo -e "${YELLOW}💡 Tip: Use './scripts/stop-local.sh --volumes' to also remove persistent data${NC}\n"
fi

echo -e "${BLUE}📊 View stopped containers:${NC}"
echo -e "   docker compose ps -a"

echo -e "\n${BLUE}🚀 Start services again:${NC}"
echo -e "   ./scripts/start-local.sh"

echo -e "\n${BLUE}Goodbye! 👋${NC}\n"
