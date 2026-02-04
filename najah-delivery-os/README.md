# Najah Delivery OS

> **نظام تسليم نجاح** - A comprehensive last-mile delivery optimization platform for the KSA transportation and e-commerce sector.

## Overview

Najah Delivery OS is a bilingual (Arabic/English) delivery orchestration system designed for the Saudi Arabian market. It provides:

- **Route Optimization**: Intelligent courier assignment and route planning using heuristic algorithms
- **Real-time Tracking**: Live location updates from drivers with multi-merchant support
- **Smart Geocoding**: Address normalization supporting Arabic and English addresses
- **AI Assistant**: RAG-based LLM assistant powered by OpenRouter (GPT-4o mini) for operational queries
- **Multi-tenant Architecture**: Support for multiple merchants with isolated data
- **KSA-specific Features**: PDPL compliance considerations, weekend alignment (Fri/Sat), local payment methods (Mada, STC Pay, COD)

## Architecture

The system follows a microservices architecture with:

### Backend Services
- **Express API** (Node.js): Main orchestration layer with REST endpoints
- **Auth Service** (Node.js): JWT-based authentication with role-based access control
- **Payments Service** (Node.js): Payment gateway stub for Mada/STC Pay/COD
- **Ingestion Service** (Node.js): Webhook receiver with HMAC validation
- **Optimizer Service** (Python/Flask): Route planning with OSRM integration
- **Geocoding Service** (Python/Flask): Address normalization and Nominatim lookup
- **LLM Assistant** (Python/FastAPI): Vector-based knowledge retrieval with OpenRouter

### Frontend Applications
- **Merchant Portal** (React): Order management, route planning, analytics
- **Driver App** (React): Route viewing and location tracking
- **Admin Dashboard** (Streamlit): System monitoring and manual overrides

### Infrastructure
- **MongoDB**: Primary data store
- **Chroma/FAISS**: Vector store for RAG
- **Docker Compose**: Local development environment
- **Terraform**: EC2 deployment with Docker Compose (Option B)
- **GitHub Actions**: CI/CD pipeline

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 18+ (for local development)
- Python 3.11+ (for local development)
- 8GB RAM, 50GB storage
- OpenRouter API key

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/AnasB0/FSD.git
   cd FSD/najah-delivery-os
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env and add your OPENROUTER_API_KEY
   ```

3. **Start all services**
   ```bash
   ./scripts/start-local.sh
   ```

4. **Seed sample data**
   ```bash
   docker compose exec express-api npm run seed
   ```

5. **Access applications**
   - Merchant Portal: http://localhost:3000
   - Driver App: http://localhost:3001
   - Admin Dashboard: http://localhost:8501
   - API Documentation: http://localhost:8080/api-docs

### Deployment

**Option B: EC2 + Docker Compose**

```bash
cd infra/terraform/ec2-compose
terraform init
terraform apply -var="openrouter_api_key=YOUR_KEY"
```

See [infra/terraform/ec2-compose/README.md](infra/terraform/ec2-compose/README.md) for details.

## Project Structure

```
najah-delivery-os/
├── services/              # Microservices
│   ├── express-api/       # Main API orchestrator
│   ├── auth/              # Authentication service
│   ├── payments/          # Payment processing stub
│   ├── ingestion/         # Webhook receiver
│   ├── optimizer/         # Route optimization (Python)
│   ├── geocoding/         # Address normalization (Python)
│   ├── llm-assistant/     # RAG-based AI assistant (Python)
│   ├── merchant-portal/   # Merchant web app (React)
│   ├── driver-app/        # Driver mobile web app (React)
│   └── streamlit-admin/   # Admin dashboard (Streamlit)
├── infra/                 # Infrastructure as code
│   ├── docker/            # Docker Compose configuration
│   ├── ci/                # GitHub Actions workflows
│   └── terraform/         # Terraform modules
├── docs/                  # Documentation
│   ├── architecture.md    # System architecture
│   ├── adr/               # Architecture decision records
│   ├── data-models.md     # Database schemas
│   ├── observability.md   # Monitoring guide
│   ├── security.md        # Security & SSDLC
│   ├── seeding.md         # Data seeding guide
│   ├── runbook.md         # Operations runbook
│   └── checklist.md       # Implementation checklist
└── scripts/               # Utility scripts
    ├── start-local.sh     # Start Docker Compose
    ├── stop-local.sh      # Stop Docker Compose
    └── seed/              # Database seeding
```

## API Endpoints

### Core Endpoints
- `GET /health` - Health check (no auth)
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /auth/refresh` - Token refresh
- `GET /auth/me` - Current user info

### Merchant Operations
- `GET /merchants` - List merchants
- `POST /merchants` - Create merchant
- `GET /merchants/:id` - Get merchant details
- `PUT /merchants/:id` - Update merchant
- `DELETE /merchants/:id` - Delete merchant

### Order Management
- `GET /orders` - List orders
- `POST /orders` - Create order
- `GET /orders/:id` - Get order details
- `PUT /orders/:id` - Update order
- `POST /orders/:id/normalize` - Normalize address
- `POST /orders/:id/plan` - Create route plan

### Courier Operations
- `GET /couriers` - List couriers
- `POST /couriers` - Create courier
- `POST /couriers/:id/assign-route` - Assign route

### AI Assistant
- `POST /assistant/query` - Query the AI assistant

See [OpenAPI specifications](services/express-api/openapi.yaml) for complete API documentation.

## Key Features

### Bilingual Support (Arabic/English)
- Frontend i18n using react-i18next
- Backend Accept-Language header support
- Dual address fields (address.ar, address.en)
- Arabic address parsing and normalization

### Security
- JWT authentication with refresh tokens
- Role-based access control (ADMIN, MERCHANT, DRIVER)
- Rate limiting and CORS protection
- HMAC webhook signature validation
- Request ID tracking
- Helmet security headers

### Observability
- Structured JSON logging (Winston)
- Request/response logging (Morgan)
- Health check endpoints
- Audit logging for critical operations

### KSA Localization
- Weekend alignment (Friday/Saturday)
- Default map center: Riyadh (24.7136°N, 46.6753°E)
- PDPL compliance considerations
- Support for Mada, STC Pay, and COD payments

## Development

### Running Tests

```bash
# Node.js services
cd services/express-api
npm test

# Python services
cd services/optimizer
pytest
```

### Running Individual Services

```bash
# Express API
cd services/express-api
npm install
npm run dev

# Optimizer
cd services/optimizer
pip install -r requirements.txt
python app.py
```

## Documentation

- [Architecture Overview](docs/architecture.md)
- [Data Models](docs/data-models.md)
- [Security & SSDLC](docs/security.md)
- [Observability](docs/observability.md)
- [Operations Runbook](docs/runbook.md)
- [ADR-0001: Monorepo Structure](docs/adr/0001-monorepo.md)
- [ADR-0002: Database Choice](docs/adr/0002-database-choice.md)
- [ADR-0003: Routing Engine](docs/adr/0003-routing-engine.md)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

MIT License - See LICENSE file for details

## Support

For issues and questions:
- GitHub Issues: https://github.com/AnasB0/FSD/issues
- Documentation: [docs/](docs/)

---

**Built for Saudi Arabia's last-mile delivery needs** 🚚 🇸🇦
