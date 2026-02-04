# FSD - Full Stack Development Projects

This repository contains the **Najah Delivery OS** - a comprehensive last-mile delivery optimization platform for the KSA market.

## 🚀 Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd FSD/najah-delivery-os

# Configure environment
cp .env.example .env
# Edit .env and add your OPENROUTER_API_KEY (optional for LLM features)

# Start all services
./scripts/start-local.sh

# Wait for services to initialize (2-3 minutes)
# Then access the applications:
#   - Merchant Portal: http://localhost:3000
#   - Driver App: http://localhost:3001
#   - Admin Dashboard: http://localhost:8501
#   - API: http://localhost:8080

# Seed sample data
docker compose -f infra/docker/docker-compose.yaml exec express-api node scripts/seed/seed.js

# Validate system health
./scripts/validate.sh
```

## 📚 Documentation

- [Najah Delivery OS README](najah-delivery-os/README.md) - Main project documentation
- [Architecture](najah-delivery-os/docs/architecture.md) - System design and diagrams
- [Runbook](najah-delivery-os/docs/runbook.md) - Operations guide
- [Security](najah-delivery-os/docs/security.md) - Security practices
- [Checklist](najah-delivery-os/docs/checklist.md) - Validation checklist

## 🎯 Features

- **10 Microservices**: Express API, Auth, Payments, Ingestion, Optimizer, Geocoding, LLM Assistant, 2 Frontends, Admin Dashboard
- **Bilingual**: Full Arabic & English support
- **KSA-Specific**: PDPL compliance, Mada/STC Pay, Arabic geocoding
- **RAG-Powered**: LLM assistant with Chroma vector store
- **Route Optimization**: VRP solver with OSRM integration
- **Docker Compose**: Local deployment ready
- **Terraform**: AWS EC2 deployment included
- **CI/CD**: GitHub Actions pipelines

## 🔐 Default Credentials

```
Admin:    admin@najah.sa / password123
Merchant: merchant@najah.sa / password123
Driver:   driver@najah.sa / password123
```

## 📝 License

MIT

