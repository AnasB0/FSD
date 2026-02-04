# Najah Delivery OS - Infrastructure Documentation

This directory contains all infrastructure and deployment configurations for the Najah Delivery OS.

## 📁 Directory Structure

```
infra/
├── ci/                         # CI/CD workflows
│   ├── ci.yaml                # GitHub Actions CI pipeline
│   └── docker-build-push.yaml # Docker image build and push
├── docker/                     # Local development
│   └── docker-compose.yaml    # Docker Compose configuration
└── terraform/                  # Cloud deployment
    └── ec2-compose/           # AWS EC2 deployment
        ├── main.tf
        ├── variables.tf
        ├── outputs.tf
        ├── user-data.sh
        └── README.md

scripts/
├── start-local.sh             # Start services locally
└── stop-local.sh              # Stop services locally
```

## 🚀 Quick Start

### Local Development

1. **Prerequisites**:
   - Docker Engine 20.10+
   - Docker Compose 2.0+
   - 8GB RAM minimum

2. **Start all services**:
   ```bash
   ./scripts/start-local.sh
   ```

3. **Access services**:
   - Merchant Portal: http://localhost:3000
   - Driver App: http://localhost:3001
   - Streamlit Admin: http://localhost:8501
   - Express API: http://localhost:8080
   - MongoDB: mongodb://localhost:27017

4. **Stop services**:
   ```bash
   ./scripts/stop-local.sh
   
   # Or with data cleanup:
   ./scripts/stop-local.sh --volumes
   ```

## 🐳 Docker Compose

### Services Overview

| Service | Port | Language | Memory Limit | Description |
|---------|------|----------|--------------|-------------|
| mongo | 27017 | - | 512MB | MongoDB 6.0 database |
| express-api | 8080 | Node.js | 256MB | Main REST API |
| auth | 8081 | Node.js | 256MB | Authentication service |
| payments | 8082 | Node.js | 256MB | Payment processing |
| ingestion | 8083 | Node.js | 256MB | Data ingestion service |
| optimizer | 5001 | Python | 256MB | Route optimization |
| geocoding | 5002 | Python | 256MB | Address geocoding |
| llm-assistant | 5003 | Python | 256MB | AI assistant |
| merchant-portal | 3000 | React | 512MB | Merchant web interface |
| driver-app | 3001 | React | 512MB | Driver mobile web app |
| streamlit-admin | 8501 | Python | 256MB | Admin dashboard |

**Total Memory Usage**: ~3.5GB (fits comfortably in 8GB systems)

### Resource Optimization

The Docker Compose configuration is optimized for development machines with 8GB RAM:

- **Memory limits**: Prevent services from consuming excessive memory
- **Health checks**: MongoDB has health checks for proper startup ordering
- **Restart policies**: All services auto-restart on failure
- **Networks**: Isolated network for service communication
- **Volumes**: Persistent storage for MongoDB and ChromaDB

### Environment Variables

Create a `.env` file in the root directory (or copy from `.env.example`):

```bash
cp .env.example .env
```

Required variables:
- `OPENROUTER_API_KEY`: For LLM assistant
- `GOOGLE_MAPS_API_KEY`: For geocoding service
- `STRIPE_SECRET_KEY`: For payment processing
- `JWT_SECRET`: For authentication (generate securely)

## 🔄 CI/CD Pipeline

### GitHub Actions Workflows

#### 1. CI Pipeline (`ci.yaml`)

**Triggers**: Push and Pull Requests to `main` branch

**Jobs**:
- **Test**: Runs tests for all 10 services in parallel
  - Node.js services: `npm test`
  - Python services: `pytest`
- **Lint**: Code quality checks
  - ESLint for JavaScript/TypeScript
  - Flake8 for Python
- **Build**: React app builds for frontend services

**Matrix Strategy**: Tests all services independently to fail fast

#### 2. Docker Build & Push (`docker-build-push.yaml`)

**Triggers**: Push to `main` branch or version tags (`v*.*.*`)

**Features**:
- Multi-platform builds (amd64, arm64)
- Pushes to GitHub Container Registry (ghcr.io)
- Image caching for faster builds
- Automatic tagging:
  - `latest` for main branch
  - Version tags for releases
  - SHA tags for specific commits

**Usage**:
```bash
# Images available at:
ghcr.io/your-org/najah-delivery-os/express-api:latest
ghcr.io/your-org/najah-delivery-os/merchant-portal:v1.0.0
```

## ☁️ Cloud Deployment

### AWS EC2 with Terraform

Deploy to AWS in minutes using Terraform.

**Resources Created**:
- VPC with public subnet
- EC2 instance (t3.medium)
- Security groups
- Elastic IP
- Auto-configured Docker Compose
- Nginx reverse proxy

**Quick Deploy**:
```bash
cd infra/terraform/ec2-compose

# Configure variables
cp terraform.tfvars.example terraform.tfvars
vim terraform.tfvars

# Deploy
terraform init
terraform apply
```

See [Terraform README](./terraform/ec2-compose/README.md) for detailed instructions.

## 🔧 Development Workflows

### Adding a New Service

1. **Create service directory**:
   ```bash
   mkdir -p services/new-service
   cd services/new-service
   ```

2. **Add Dockerfile**:
   - Node.js: Base on `node:18-alpine`
   - Python: Base on `python:3.11-slim`

3. **Update docker-compose.yaml**:
   ```yaml
   new-service:
     build:
       context: ../../services/new-service
     ports:
       - "8084:8084"
     environment:
       - PORT=8084
     networks:
       - najah-network
     deploy:
       resources:
         limits:
           memory: 256m
   ```

4. **Add to CI pipeline**: Update `ci.yaml` matrix

### Running Individual Services

```bash
cd infra/docker

# Start only MongoDB
docker compose up -d mongo

# Start specific service
docker compose up -d express-api

# View logs
docker compose logs -f express-api

# Rebuild service
docker compose up -d --build express-api
```

### Debugging

```bash
# Enter container shell
docker compose exec express-api sh

# Check resource usage
docker stats

# View all logs
docker compose logs -f

# Check network connectivity
docker compose exec express-api ping mongo
```

## 📊 Monitoring

### Local Monitoring

```bash
# View all container stats
docker stats

# Check service health
docker compose ps

# View logs with timestamps
docker compose logs -f --timestamps

# Filter logs by service
docker compose logs -f express-api mongo
```

### Production Monitoring

For production deployments, consider:

1. **AWS CloudWatch**: Container and system metrics
2. **Application logs**: Centralized logging (ELK, CloudWatch Logs)
3. **Health checks**: Uptime monitoring (UptimeRobot, Pingdom)
4. **APM tools**: Application performance (New Relic, DataDog)

## 🔒 Security Best Practices

### Development

- ✅ Use `.env` files (never commit secrets)
- ✅ Resource limits prevent DoS
- ✅ Isolated Docker network
- ✅ Health checks for service availability

### Production

- ✅ Use HTTPS with SSL certificates
- ✅ Restrict security group rules
- ✅ Rotate credentials regularly
- ✅ Enable AWS CloudTrail
- ✅ Use IAM roles instead of keys
- ✅ Regular security updates
- ✅ Database backups

## 🧪 Testing Infrastructure

### Test Docker Compose

```bash
# Validate compose file
docker compose config

# Test service startup
docker compose up -d
docker compose ps

# Test service connectivity
curl http://localhost:8080/health
curl http://localhost:8501
```

### Test Terraform

```bash
cd infra/terraform/ec2-compose

# Validate configuration
terraform validate

# Plan without applying
terraform plan

# Test with minimal resources
terraform apply -var instance_type=t3.micro
```

## 📈 Performance Tuning

### Docker Compose Optimization

1. **Adjust memory limits** based on usage:
   ```yaml
   deploy:
     resources:
       limits:
         memory: 512m  # Increase if needed
       reservations:
         memory: 256m  # Minimum guaranteed
   ```

2. **Enable build cache**:
   ```bash
   docker compose build --parallel
   ```

3. **Use health checks** for better orchestration

### Production Optimization

1. **Use managed services**: RDS instead of containerized MongoDB
2. **Add caching**: Redis for API responses
3. **CDN**: CloudFront for static assets
4. **Auto-scaling**: Based on CPU/memory metrics
5. **Load balancing**: Distribute traffic across instances

## 🆘 Troubleshooting

### Common Issues

**Issue**: Services won't start
```bash
# Check logs
docker compose logs

# Check resource usage
docker stats

# Restart services
docker compose restart
```

**Issue**: MongoDB connection errors
```bash
# Wait for MongoDB to be ready
docker compose logs mongo

# Check health
docker compose exec mongo mongosh --eval "db.adminCommand('ping')"
```

**Issue**: Port conflicts
```bash
# Check what's using ports
lsof -i :8080

# Stop conflicting services
sudo systemctl stop apache2
```

**Issue**: Out of memory
```bash
# Check Docker memory usage
docker stats

# Clean up unused resources
docker system prune -a --volumes
```

### Getting Help

1. **Check logs**: `docker compose logs [service]`
2. **Verify configuration**: `docker compose config`
3. **Test connectivity**: `docker compose exec [service] ping [other-service]`
4. **Review documentation**: Each service has its own README
5. **Open an issue**: GitHub issues for bug reports

## 📚 Additional Resources

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [GitHub Actions Documentation](https://docs.github.com/actions)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [MongoDB Docker Hub](https://hub.docker.com/_/mongo)

## 📝 License

[Your License Here]

---

**Questions?** Open an issue or contact the team.
