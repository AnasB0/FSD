#!/bin/bash

###############################################################################
# Najah Delivery OS - Quick Validation Script
# 
# This script performs a quick health check of all services to ensure
# the system is running correctly.
#
# Usage:
#   ./scripts/validate.sh
#
# Requirements:
#   - Docker and Docker Compose installed
#   - Services running (docker compose up -d)
#   - curl and jq installed
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}!${NC} $1"
}

check_health() {
    local service_name=$1
    local url=$2
    
    response=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null)
    
    if [ "$response" = "200" ]; then
        print_success "$service_name is healthy"
        return 0
    else
        print_error "$service_name is not responding (HTTP $response)"
        return 1
    fi
}

# Script start
print_header "Najah Delivery OS - System Validation"

echo "Starting validation at $(date)"
echo ""

# Check if Docker is running
print_header "1. Docker Environment"
if docker info > /dev/null 2>&1; then
    print_success "Docker daemon is running"
else
    print_error "Docker daemon is not running"
    exit 1
fi

# Check if Docker Compose is available
if docker compose version > /dev/null 2>&1; then
    print_success "Docker Compose is available"
else
    print_error "Docker Compose is not available"
    exit 1
fi

# Check if services are running
print_header "2. Container Status"
cd "$(dirname "$0")/../infra/docker" || exit 1

containers=$(docker compose ps --format json 2>/dev/null | jq -r '.Name' 2>/dev/null)
if [ -z "$containers" ]; then
    print_error "No containers are running. Please start services with: docker compose up -d"
    exit 1
fi

total=0
running=0
while IFS= read -r container; do
    if [ -n "$container" ]; then
        total=$((total + 1))
        status=$(docker inspect -f '{{.State.Status}}' "$container" 2>/dev/null)
        if [ "$status" = "running" ]; then
            running=$((running + 1))
            print_success "$container is running"
        else
            print_error "$container is $status"
        fi
    fi
done <<< "$containers"

echo ""
echo "Running containers: $running/$total"

# Wait a few seconds for services to be ready
print_header "3. Waiting for Services to Initialize"
echo "Waiting 10 seconds for services to start..."
sleep 10

# Check health endpoints
print_header "4. Backend Service Health Checks"

# Node.js services
check_health "Express API" "http://localhost:8080/health"
check_health "Auth Service" "http://localhost:8081/health"
check_health "Payments Service" "http://localhost:8082/health"
check_health "Ingestion Service" "http://localhost:8083/health"

# Python services
check_health "Optimizer Service" "http://localhost:5001/health"
check_health "Geocoding Service" "http://localhost:5002/health"
check_health "LLM Assistant" "http://localhost:5003/health"

# Check frontend services
print_header "5. Frontend Service Availability"

# Check if ports are open
if nc -z localhost 3000 2>/dev/null; then
    print_success "Merchant Portal is listening on port 3000"
else
    print_warning "Merchant Portal is not accessible on port 3000"
fi

if nc -z localhost 3001 2>/dev/null; then
    print_success "Driver App is listening on port 3001"
else
    print_warning "Driver App is not accessible on port 3001"
fi

if nc -z localhost 8501 2>/dev/null; then
    print_success "Streamlit Admin is listening on port 8501"
else
    print_warning "Streamlit Admin is not accessible on port 8501"
fi

# Check MongoDB
print_header "6. Database Status"

mongo_status=$(docker compose ps mongo --format json 2>/dev/null | jq -r '.Health' 2>/dev/null)
if [ "$mongo_status" = "healthy" ]; then
    print_success "MongoDB is healthy"
else
    print_warning "MongoDB health status: $mongo_status"
fi

# Check API documentation
print_header "7. API Documentation"

if curl -s "http://localhost:8080/api-docs" > /dev/null 2>&1; then
    print_success "OpenAPI documentation is accessible"
else
    print_warning "OpenAPI documentation is not accessible"
fi

# Summary
print_header "Validation Summary"

echo ""
echo "Service URLs:"
echo "  - Merchant Portal:  http://localhost:3000"
echo "  - Driver App:       http://localhost:3001"
echo "  - Admin Dashboard:  http://localhost:8501"
echo "  - Express API:      http://localhost:8080"
echo "  - API Docs:         http://localhost:8080/api-docs"
echo ""

echo "Default Credentials:"
echo "  - Admin:    admin@najah.sa / password123"
echo "  - Merchant: merchant@najah.sa / password123"
echo "  - Driver:   driver@najah.sa / password123"
echo ""

echo "Next Steps:"
echo "  1. Open Merchant Portal at http://localhost:3000"
echo "  2. Login with merchant credentials"
echo "  3. Create a new order"
echo "  4. View route optimization results"
echo "  5. Check seed data: docker compose exec express-api node scripts/seed/seed.js"
echo ""

print_header "Validation Complete"
echo "Completed at $(date)"
echo ""
