# Najah Delivery OS

A comprehensive last-mile delivery optimization platform for the KSA market with bilingual support (Arabic/English), RAG-powered assistant, and multi-tenant architecture.

## 🌟 Features

- **Multi-Service Architecture**: Microservices-based design with dedicated services for authentication, payments, optimization, and more
- **Bilingual Support**: Full Arabic and English internationalization across all interfaces
- **RAG Assistant**: LLM-powered assistant using OpenRouter GPT-4o mini with Chroma vector store
- **Route Optimization**: Python-based VRP solver with OSRM integration for real-world routing
- **Arabic Geocoding**: Specialized geocoding service handling Arabic addresses with Nominatim
- **Real-time Tracking**: Driver location updates and route progress monitoring
- **KSA Compliance**: PDPL-aware, weekend-aligned (Fri/Sat), local payment methods (Mada, STC Pay, COD)

## 🏗️ Architecture

The system consists of 10 microservices:

### Backend Services (Node.js)
- **express-api** (Port 8080): Main API gateway with authentication, order management, merchant management
- **auth** (Port 8081): JWT-based authentication with refresh tokens
- **payments** (Port 8082): Payment intent management for Mada, STC Pay, and COD
- **ingestion** (Port 8083): Webhook receiver with HMAC validation

### Backend Services (Python)
- **optimizer** (Port 5001): Flask-based VRP optimizer using OSRM
- **geocoding** (Port 5002): Flask geocoding service with Arabic normalization
- **llm-assistant** (Port 5003): FastAPI RAG assistant with Chroma and OpenRouter

### Frontend Services
- **merchant-portal** (Port 3000): React merchant dashboard with Mapbox integration
- **driver-app** (Port 3001): React driver interface for route execution
- **streamlit-admin** (Port 8501): Streamlit admin dashboard for operations

## 📋 Prerequisites

- Docker Desktop (20.10+)
- Docker Compose (2.0+)
- 8GB RAM minimum (HP Victus optimized)
- 50GB free storage
- OpenRouter API key (for LLM assistant)

## 🚀 Quick Start

### 1. Clone and Configure

```bash
git clone <repository-url>
cd najah-delivery-os
cp .env.example .env
```

Edit `.env` and add your OpenRouter API key:
```
OPENROUTER_API_KEY=your_key_here
```

### 2. Start Services

```bash
./scripts/start-local.sh
```

This will:
- Build all Docker images
- Start MongoDB and all services
- Wait for health checks
- Display service URLs

### 3. Seed Sample Data

```bash
docker compose exec express-api node scripts/seed.js
```

This populates:
- 3 merchants (Riyadh, Jeddah, Dammam)
- 10 couriers with shifts
- 20+ orders with Arabic/English addresses
- Sample route plans

### 4. Access Applications

- **Merchant Portal**: http://localhost:3000
- **Driver App**: http://localhost:3001
- **Admin Dashboard**: http://localhost:8501
- **Express API**: http://localhost:8080
- **API Documentation**: http://localhost:8080/api-docs

### Default Credentials

```
# Merchant
Email: merchant@najah.sa
Password: merchant123

# Driver
Email: driver@najah.sa
Password: driver123

# Admin
Email: admin@najah.sa
Password: admin123
```

## 🛑 Stop Services

```bash
./scripts/stop-local.sh
```

## 🧪 Development

### Run Tests

```bash
# Node services
cd services/express-api && npm test
cd services/auth && npm test

# Python services
cd services/optimizer && python -m pytest
cd services/geocoding && python -m pytest
```

### Rebuild a Service

```bash
docker compose up -d --build express-api
```

### View Logs

```bash
docker compose logs -f express-api
docker compose logs -f optimizer
```

## 📚 Documentation

- [Architecture Overview](docs/architecture.md) - System design and Mermaid diagrams
- [Data Models](docs/data-models.md) - MongoDB schemas and indexes
- [ADR-0001: Monorepo](docs/adr/ADR-0001-monorepo.md) - Why monorepo structure
- [ADR-0002: Database Choice](docs/adr/ADR-0002-database-choice.md) - Why MongoDB
- [ADR-0003: Routing Engine](docs/adr/ADR-0003-routing-engine.md) - Why OSRM
- [Security & SSDLC](docs/security.md) - Security practices and PDPL compliance
- [Observability](docs/observability.md) - Logging, monitoring, and tracing
- [Runbook](docs/runbook.md) - Operations procedures
- [Seeding Data](docs/seeding.md) - Test data generation

## 🌐 Deployment

### Option A: Local Docker Compose (Development)

Already covered in Quick Start above.

### Option B: AWS EC2 with Docker Compose (Production)

```bash
cd infra/terraform/ec2-compose
terraform init
terraform plan
terraform apply

# Get the public IP
terraform output public_ip

# Access at: http://<public_ip>
```

See [infra/terraform/ec2-compose/README.md](infra/terraform/ec2-compose/README.md) for details.

### CI/CD

GitHub Actions workflows in `.github/workflows/`:
- `ci.yaml`: Run tests on all services
- `docker-build-push.yaml`: Build and push images to GHCR

## 🔐 Security

- JWT authentication with access + refresh tokens
- RBAC: admin, merchant, driver, customer roles
- Rate limiting (100 req/15min per IP)
- Helmet.js security headers
- CORS configuration
- HMAC webhook signature verification
- Request ID tracking
- Audit logging

## 🌍 Internationalization

- Frontend: react-i18next for AR/EN
- Backend: Accept-Language header support
- Address model: Separate `address.ar` and `address.en` fields
- Error messages: Bilingual
- Map center: Riyadh (24.7136°N, 46.6753°E)

## 📊 KSA-Specific Features

- **Weekend Alignment**: Courier shifts respect Fri/Sat weekend
- **Payment Methods**: Mada, STC Pay, Cash on Delivery
- **PDPL Compliance**: Data protection and privacy controls
- **Arabic Address Support**: Normalized geocoding for Arabic text
- **Local Time Windows**: Delivery windows in Arabia Standard Time

## 🧑‍💻 Technology Stack

### Backend
- Node.js 18+ (Express, Mongoose, Joi, Winston)
- Python 3.11+ (Flask, FastAPI, sentence-transformers)
- MongoDB 6.0+
- Redis (optional, for caching)

### Frontend
- React 18+ with Vite
- react-i18next, Mapbox GL, Axios
- Streamlit 1.28+

### Infrastructure
- Docker & Docker Compose
- Terraform (AWS provider)
- GitHub Actions
- OSRM (public router)
- Nominatim (geocoding)
- OpenRouter (LLM API)

## 🤝 Contributing

1. Create a feature branch
2. Make changes and add tests
3. Run linters and tests
4. Submit pull request

## 📝 License

MIT License - see LICENSE file for details

## 📧 Support

For issues and questions, please open a GitHub issue or contact support@najah.sa

## 🎯 Roadmap

- [ ] Mobile apps (React Native)
- [ ] Real-time WebSocket updates
- [ ] Advanced ML route optimization
- [ ] Multi-language support (FR, UR)
- [ ] SLA monitoring and alerts
- [ ] Customer portal
- [ ] Analytics dashboard

---

Built with ❤️ for the KSA Transportation & E-commerce sector
