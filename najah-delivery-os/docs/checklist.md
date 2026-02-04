# End-to-End Validation Checklist

This checklist ensures all components of Najah Delivery OS are working correctly.

## Pre-Deployment Validation

### 1. Docker Build Verification

- [ ] All Dockerfiles build successfully
  ```bash
  docker compose build --no-cache
  ```
- [ ] No build errors or warnings
- [ ] Image sizes are reasonable (< 1GB each)
  ```bash
  docker images | grep najah
  ```
- [ ] Multi-stage builds optimize final image size

### 2. Service Health Checks

- [ ] All services start successfully
  ```bash
  docker compose up -d
  docker compose ps
  ```
- [ ] All services report "healthy" status
- [ ] Health endpoints respond correctly:
  - [ ] Express API: `curl http://localhost:8080/health`
  - [ ] Auth: `curl http://localhost:8081/health`
  - [ ] Payments: `curl http://localhost:8082/health`
  - [ ] Ingestion: `curl http://localhost:8083/health`
  - [ ] Optimizer: `curl http://localhost:5001/health`
  - [ ] Geocoding: `curl http://localhost:5002/health`
  - [ ] LLM Assistant: `curl http://localhost:5003/health`
- [ ] Frontend services load in browser:
  - [ ] Merchant Portal: http://localhost:3000
  - [ ] Driver App: http://localhost:3001
  - [ ] Admin Dashboard: http://localhost:8501

### 3. Database Connectivity

- [ ] MongoDB is running
  ```bash
  docker compose ps mongodb
  ```
- [ ] Database connection from services works
  ```bash
  docker compose logs express-api | grep "MongoDB connected"
  ```
- [ ] Collections are created
  ```bash
  docker compose exec mongodb mongosh najah-delivery --eval "db.getCollectionNames()"
  ```
- [ ] Indexes are created correctly
  ```bash
  docker compose exec mongodb mongosh najah-delivery --eval "db.orders.getIndexes()"
  ```
- [ ] Geospatial indexes are functional
  ```bash
  docker compose exec mongodb mongosh najah-delivery --eval "db.couriers.getIndexes()" | grep 2dsphere
  ```

## Functional Testing

### 4. Order Creation and Normalization

- [ ] Create order via API
  ```bash
  curl -X POST http://localhost:8080/api/orders \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer <TOKEN>" \
    -d '{
      "merchantId": "<MERCHANT_ID>",
      "address": {
        "ar": "الرياض، حي العليا، شارع الملك فهد",
        "en": "Riyadh, Al Olaya District, King Fahd Road"
      },
      "items": [{"name": "Product", "quantity": 1, "price": 100}],
      "totalAmount": 100
    }'
  ```
- [ ] Order is saved to database
  ```bash
  docker compose exec mongodb mongosh najah-delivery --eval "db.orders.find().pretty()"
  ```
- [ ] Arabic address is normalized
- [ ] Coordinates are geocoded correctly
- [ ] Address components extracted (street, district, city)
- [ ] Order status is "pending"

### 5. Route Optimization

- [ ] Seed test data with 20+ orders
  ```bash
  docker compose exec express-api node scripts/seed.js
  ```
- [ ] Trigger route optimization
  ```bash
  curl -X POST http://localhost:5001/optimize \
    -H "Content-Type: application/json" \
    -d '{"merchantId": "<MERCHANT_ID>"}'
  ```
- [ ] Route plan is created
  ```bash
  docker compose exec mongodb mongosh najah-delivery --eval "db.routeplans.find().pretty()"
  ```
- [ ] Orders are assigned to couriers
- [ ] Route distance and duration calculated
- [ ] OSRM integration working
  ```bash
  docker compose logs optimizer | grep OSRM
  ```
- [ ] Optimization completes in < 5 seconds for 20 orders

### 6. Frontend Accessibility

#### Merchant Portal
- [ ] Loads without errors
- [ ] Login page displays
- [ ] Can log in with test credentials
- [ ] Dashboard shows orders
- [ ] Can create new order
- [ ] Map displays correctly (Mapbox)
- [ ] Arabic/English language toggle works
- [ ] Order list loads
- [ ] Order details page works
- [ ] Can filter orders by status

#### Driver App
- [ ] Loads without errors
- [ ] Login page displays
- [ ] Can log in as driver
- [ ] Route list displays
- [ ] Can view route details
- [ ] Map shows delivery locations
- [ ] Can update order status
- [ ] Location tracking works
- [ ] Arabic/English toggle works

#### Streamlit Admin
- [ ] Loads without errors
- [ ] Dashboard displays metrics
- [ ] Can view all orders
- [ ] Can view all couriers
- [ ] Can view route plans
- [ ] Charts render correctly
- [ ] Can export data

### 7. Authentication Flow

- [ ] User registration works
  ```bash
  curl -X POST http://localhost:8081/api/auth/register \
    -H "Content-Type: application/json" \
    -d '{"email": "test@najah.sa", "password": "test123", "role": "customer"}'
  ```
- [ ] User login returns access token
  ```bash
  curl -X POST http://localhost:8081/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email": "test@najah.sa", "password": "test123"}'
  ```
- [ ] Access token is valid JWT
- [ ] Refresh token is set in cookie
- [ ] Token refresh works
  ```bash
  curl -X POST http://localhost:8081/api/auth/refresh \
    -H "Cookie: refreshToken=<REFRESH_TOKEN>"
  ```
- [ ] Logout invalidates session
- [ ] Protected endpoints require authentication
  ```bash
  curl -X GET http://localhost:8080/api/orders
  # Should return 401
  ```
- [ ] Role-based authorization works
  ```bash
  # Customer can't access admin endpoint
  curl -X GET http://localhost:8080/api/admin/users \
    -H "Authorization: Bearer <CUSTOMER_TOKEN>"
  # Should return 403
  ```

### 8. Payment Flow

- [ ] Create payment intent
  ```bash
  curl -X POST http://localhost:8082/api/payments \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer <TOKEN>" \
    -d '{
      "orderId": "<ORDER_ID>",
      "amount": 100,
      "paymentMethod": "mada"
    }'
  ```
- [ ] Payment intent saved to database
- [ ] Can retrieve payment intent
  ```bash
  curl http://localhost:8082/api/payments/<INTENT_ID> \
    -H "Authorization: Bearer <TOKEN>"
  ```
- [ ] Can confirm payment
  ```bash
  curl -X POST http://localhost:8082/api/payments/<INTENT_ID>/confirm \
    -H "Authorization: Bearer <TOKEN>"
  ```
- [ ] Payment status updates to "succeeded"
- [ ] Supports all payment methods:
  - [ ] Mada
  - [ ] STC Pay
  - [ ] Cash on Delivery

### 9. LLM Assistant

#### With OpenRouter API Key

- [ ] API key is configured
  ```bash
  docker compose exec llm-assistant env | grep OPENROUTER_API_KEY
  ```
- [ ] Can query assistant
  ```bash
  curl -X POST http://localhost:5003/chat \
    -H "Content-Type: application/json" \
    -d '{"query": "How many orders are pending?"}'
  ```
- [ ] Returns relevant answer
- [ ] Uses RAG to retrieve context
  ```bash
  docker compose logs llm-assistant | grep "Retrieved.*documents"
  ```
- [ ] Chroma vector store is populated
- [ ] Handles Arabic queries
  ```bash
  curl -X POST http://localhost:5003/chat \
    -H "Content-Type: application/json" \
    -d '{"query": "كم عدد الطلبات المعلقة؟"}'
  ```
- [ ] Response time < 3 seconds

#### Without API Key

- [ ] Returns fallback response
- [ ] No errors in logs
- [ ] Graceful degradation message shown

### 10. CI/CD Pipeline

- [ ] GitHub Actions workflow exists
  ```bash
  ls -la .github/workflows/
  ```
- [ ] Workflow runs on push to main
- [ ] All tests pass:
  - [ ] Node.js tests (Jest)
  - [ ] Python tests (pytest)
  - [ ] Integration tests
- [ ] Docker images build successfully
- [ ] Code quality checks pass:
  - [ ] ESLint (JavaScript)
  - [ ] Pylint (Python)
  - [ ] Prettier (formatting)
- [ ] Security scans pass:
  - [ ] npm audit
  - [ ] pip-audit
  - [ ] Trivy (Docker images)
- [ ] Coverage reports generated
- [ ] Artifacts uploaded

### 11. Terraform Deployment

- [ ] Terraform configuration exists
  ```bash
  ls -la infra/terraform/
  ```
- [ ] Terraform validates successfully
  ```bash
  cd infra/terraform
  terraform init
  terraform validate
  ```
- [ ] Terraform plan shows expected resources
  ```bash
  terraform plan
  ```
- [ ] VPC configuration correct
- [ ] EC2 instances configured
- [ ] Security groups configured
- [ ] Load balancer configured
- [ ] DNS records configured (if applicable)
- [ ] IAM roles and policies defined
- [ ] S3 bucket for backups configured
- [ ] CloudWatch alarms configured

## Performance Testing

### 12. Load Testing

- [ ] Can handle 100 requests/minute
  ```bash
  # Using Apache Bench
  ab -n 1000 -c 10 http://localhost:8080/health
  ```
- [ ] Response time p95 < 500ms
- [ ] Response time p99 < 1000ms
- [ ] No memory leaks after 1000 requests
  ```bash
  docker stats --no-stream | grep express-api
  ```
- [ ] Database connection pool stable
- [ ] No file descriptor leaks

### 13. Optimization Performance

- [ ] 10 orders optimize in < 2 seconds
- [ ] 50 orders optimize in < 10 seconds
- [ ] 100 orders optimize in < 30 seconds
- [ ] OSRM responds in < 500ms
- [ ] Geocoding responds in < 1 second

## Security Testing

### 14. Authentication & Authorization

- [ ] Can't access protected endpoints without token
- [ ] Expired tokens are rejected
- [ ] Invalid tokens are rejected
- [ ] Can't access other merchant's data
- [ ] Can't escalate privileges
- [ ] Password requirements enforced
- [ ] Passwords are hashed (bcrypt)
- [ ] Session timeout works (7 days)

### 15. Input Validation

- [ ] SQL/NoSQL injection prevented
- [ ] XSS attacks prevented
- [ ] CSRF protection enabled
- [ ] File upload validation works
- [ ] API rate limiting works
  ```bash
  # Send 10 requests quickly
  for i in {1..10}; do curl http://localhost:8080/api/orders; done
  # Should see 429 Too Many Requests
  ```
- [ ] Request size limits enforced
- [ ] Webhook signature verification works

### 16. Network Security

- [ ] CORS configured correctly
- [ ] Security headers present (Helmet)
  ```bash
  curl -I http://localhost:8080/health | grep -E "X-Frame-Options|X-Content-Type-Options"
  ```
- [ ] HTTPS enforced (production)
- [ ] TLS 1.2+ only (production)
- [ ] No sensitive data in logs
- [ ] API keys masked in logs

## Observability

### 17. Logging

- [ ] All services log to stdout
- [ ] Logs are structured JSON
- [ ] Log level configurable via env var
- [ ] Request ID tracing works
  ```bash
  curl -H "X-Request-ID: test123" http://localhost:8080/health
  docker compose logs express-api | grep test123
  ```
- [ ] Error stack traces captured
- [ ] No passwords in logs
- [ ] No API keys in logs

### 18. Monitoring

- [ ] Health endpoints respond
- [ ] Metrics endpoint works
  ```bash
  curl http://localhost:8080/metrics
  ```
- [ ] Can track request rate
- [ ] Can track error rate
- [ ] Can track response times
- [ ] Memory usage monitored
- [ ] CPU usage monitored

### 19. Alerting

- [ ] Critical alerts configured
- [ ] Warning alerts configured
- [ ] Alerts sent to correct channel (Slack/email)
- [ ] Alerts include relevant context
- [ ] Alerts are actionable

## Data Integrity

### 20. Database Operations

- [ ] CRUD operations work correctly
- [ ] Transactions work (if used)
- [ ] Indexes improve query performance
- [ ] TTL indexes auto-delete expired sessions
  ```bash
  # Create expired session
  docker compose exec mongodb mongosh najah-delivery --eval "
    db.sessions.insertOne({
      userId: ObjectId(),
      refreshToken: 'test',
      expiresAt: new Date('2020-01-01')
    })
  "
  # Wait 60+ seconds for TTL background task
  # Session should be deleted
  ```
- [ ] Geospatial queries work
  ```bash
  docker compose exec mongodb mongosh najah-delivery --eval "
    db.couriers.find({
      currentLocation: {
        \$near: {
          \$geometry: {type: 'Point', coordinates: [46.6753, 24.7136]},
          \$maxDistance: 5000
        }
      }
    })
  "
  ```
- [ ] Backup and restore work
  ```bash
  docker compose exec -T mongodb mongodump --db=najah-delivery --archive=/tmp/backup.archive
  docker compose exec -T mongodb mongorestore --archive=/tmp/backup.archive --drop
  ```

## Integration Testing

### 21. End-to-End Order Flow

- [ ] Merchant creates order via API
- [ ] Order is geocoded
- [ ] Order is saved to database
- [ ] Optimization is triggered
- [ ] Route plan is created
- [ ] Order assigned to courier
- [ ] Courier sees order in driver app
- [ ] Courier updates status to "picked_up"
- [ ] Status updates in database
- [ ] Merchant sees status update in portal
- [ ] Courier updates status to "delivered"
- [ ] Delivery time recorded
- [ ] Merchant receives webhook notification (if configured)

### 22. Multi-Merchant Isolation

- [ ] Merchant A can't see Merchant B's orders
- [ ] Merchant A can't access Merchant B's couriers
- [ ] Merchant A can't modify Merchant B's data
- [ ] API keys are merchant-specific
- [ ] Webhooks are merchant-specific

### 23. Concurrent Operations

- [ ] Multiple users can create orders simultaneously
- [ ] Multiple couriers can update status simultaneously
- [ ] No race conditions in route optimization
- [ ] No deadlocks in database operations

## Documentation

### 24. Documentation Completeness

- [ ] README.md is up-to-date
- [ ] Architecture documentation exists
- [ ] Data models documented
- [ ] API documentation exists (Swagger/OpenAPI)
- [ ] Security documentation exists
- [ ] Runbook exists
- [ ] ADRs exist and are up-to-date
- [ ] Deployment guide exists
- [ ] Troubleshooting guide exists

## Post-Deployment Validation

### 25. Production Smoke Tests

After deploying to production:

- [ ] All services are running
- [ ] Health checks pass
- [ ] Can log in to all frontends
- [ ] Can create test order
- [ ] Can trigger optimization
- [ ] Can view orders
- [ ] No errors in logs
- [ ] Monitoring dashboards show green
- [ ] Alerts are not firing
- [ ] SSL certificates valid
- [ ] DNS resolves correctly
- [ ] Load balancer distributes traffic

### 26. Rollback Readiness

- [ ] Rollback procedure documented
- [ ] Previous version tagged in git
- [ ] Database backup created before deployment
- [ ] Rollback tested in staging
- [ ] Rollback SLA defined (< 15 minutes)

## Sign-Off

**Tested By**: ___________________  
**Date**: ___________________  
**Environment**: [ ] Development [ ] Staging [ ] Production  
**Result**: [ ] Pass [ ] Fail  

**Notes**:
```
[Any issues found, deviations from expected behavior, or special considerations]
```

**Approved By**: ___________________  
**Date**: ___________________  

## Related Documentation

- [Architecture](docs/architecture.md)
- [Data Models](docs/data-models.md)
- [Security](docs/security.md)
- [Runbook](docs/runbook.md)
- [Seeding](docs/seeding.md)
