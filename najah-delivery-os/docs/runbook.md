# Operational Runbook

This document provides operational procedures for managing Najah Delivery OS in development and production environments.

## Table of Contents

- [Starting and Stopping Services](#starting-and-stopping-services)
- [Health Check Procedures](#health-check-procedures)
- [Common Issues and Troubleshooting](#common-issues-and-troubleshooting)
- [Log Inspection](#log-inspection)
- [Database Maintenance](#database-maintenance)
- [Backup Procedures](#backup-procedures)
- [Deployment Procedures](#deployment-procedures)

## Starting and Stopping Services

### Local Development (Docker Compose)

#### Start All Services

```bash
# From project root
./scripts/start-local.sh

# Or manually
docker compose up -d

# Follow logs
docker compose logs -f
```

The script will:
1. Build Docker images for all services
2. Start MongoDB and OSRM first
3. Wait for database to be ready
4. Start backend services (auth, payments, ingestion, optimizer, geocoding, llm-assistant)
5. Start Express API
6. Start frontend services (merchant-portal, driver-app, streamlit-admin)
7. Display service URLs

Expected startup time: 2-3 minutes

#### Start Specific Service

```bash
# Start single service
docker compose up -d express-api

# Start service and rebuild
docker compose up -d --build express-api

# Start multiple services
docker compose up -d express-api auth payments
```

#### Stop All Services

```bash
# From project root
./scripts/stop-local.sh

# Or manually
docker compose down

# Stop and remove volumes (WARNING: deletes data)
docker compose down -v
```

#### Stop Specific Service

```bash
docker compose stop express-api
docker compose rm -f express-api
```

#### Restart Service

```bash
# Restart without rebuilding
docker compose restart express-api

# Restart with rebuild
docker compose up -d --build express-api
```

### Production (AWS EC2)

#### Start Services

```bash
# SSH to bastion host
ssh -i najah-delivery.pem ubuntu@<BASTION_IP>

# SSH to service host
ssh <SERVICE_HOST>

# Start service with PM2
pm2 start express-api
pm2 start optimizer

# Start all services
pm2 start all

# Save PM2 configuration
pm2 save
```

#### Stop Services

```bash
# Stop single service
pm2 stop express-api

# Stop all services
pm2 stop all

# Delete service from PM2
pm2 delete express-api
```

#### Restart Services

```bash
# Restart single service
pm2 restart express-api

# Restart with zero-downtime
pm2 reload express-api

# Restart all services
pm2 restart all
```

## Health Check Procedures

### Check All Services

```bash
# Script to check all service health
./scripts/health-check.sh
```

Or manually:

```bash
# Frontend services
curl http://localhost:3000 | grep -q "Najah" && echo "✓ Merchant Portal" || echo "✗ Merchant Portal"
curl http://localhost:3001 | grep -q "Najah" && echo "✓ Driver App" || echo "✗ Driver App"
curl http://localhost:8501 | grep -q "Streamlit" && echo "✓ Admin Dashboard" || echo "✗ Admin Dashboard"

# Backend services
curl -s http://localhost:8080/health | jq -e '.status == "ok"' && echo "✓ Express API" || echo "✗ Express API"
curl -s http://localhost:8081/health | jq -e '.status == "ok"' && echo "✓ Auth" || echo "✗ Auth"
curl -s http://localhost:8082/health | jq -e '.status == "ok"' && echo "✓ Payments" || echo "✗ Payments"
curl -s http://localhost:8083/health | jq -e '.status == "ok"' && echo "✓ Ingestion" || echo "✗ Ingestion"
curl -s http://localhost:5001/health | jq -e '.status == "ok"' && echo "✓ Optimizer" || echo "✗ Optimizer"
curl -s http://localhost:5002/health | jq -e '.status == "ok"' && echo "✓ Geocoding" || echo "✗ Geocoding"
curl -s http://localhost:5003/health | jq -e '.status == "ok"' && echo "✓ LLM Assistant" || echo "✗ LLM Assistant"

# Database
curl -s http://localhost:8080/health/ready | jq -e '.checks.database == "ok"' && echo "✓ MongoDB" || echo "✗ MongoDB"

# OSRM
curl -s http://localhost:5000/route/v1/driving/46.6753,24.7136;46.7235,24.7242 | jq -e '.code == "Ok"' && echo "✓ OSRM" || echo "✗ OSRM"
```

### Check Docker Container Status

```bash
# List all containers
docker compose ps

# Check specific service
docker compose ps express-api

# Expected output:
# NAME                          STATUS              PORTS
# najah-express-api             Up 5 minutes        0.0.0.0:8080->8080/tcp
```

### Check Service Logs for Errors

```bash
# Check recent errors across all services
docker compose logs --tail=50 | grep -i error

# Check specific service
docker compose logs express-api --tail=100 | grep -i error
```

## Common Issues and Troubleshooting

### Issue 1: MongoDB Connection Failed

**Symptoms**:
- Services show "ECONNREFUSED 27017"
- Health checks fail with database error
- Express API returns 503 Service Unavailable

**Diagnosis**:
```bash
# Check if MongoDB is running
docker compose ps mongodb

# Check MongoDB logs
docker compose logs mongodb --tail=50

# Test connection
docker compose exec mongodb mongosh --eval "db.serverStatus()"
```

**Solution**:
```bash
# Restart MongoDB
docker compose restart mongodb

# Wait for MongoDB to be ready
sleep 10

# Restart dependent services
docker compose restart express-api auth payments ingestion
```

### Issue 2: OSRM Not Responding

**Symptoms**:
- Optimizer fails with "OSRM connection timeout"
- Route optimization returns 500 error
- Health check shows OSRM down

**Diagnosis**:
```bash
# Check OSRM status
docker compose ps osrm-backend

# Test OSRM
curl "http://localhost:5000/route/v1/driving/46.6753,24.7136;46.7235,24.7242"
```

**Solution**:
```bash
# Restart OSRM
docker compose restart osrm-backend

# If still failing, check map data
docker compose logs osrm-backend | grep -i "error"

# Re-download map data if needed (takes time)
docker compose down osrm-backend
docker compose up -d osrm-backend
```

### Issue 3: Service Won't Start - Port Already in Use

**Symptoms**:
- `Error: bind: address already in use`
- Service shows "Exited (1)"

**Diagnosis**:
```bash
# Check what's using the port (e.g., 8080)
lsof -i :8080
# or
netstat -tulpn | grep 8080
```

**Solution**:
```bash
# Option 1: Stop the conflicting process
kill <PID>

# Option 2: Change port in docker-compose.yml
# Edit docker-compose.yml, change port mapping
# Then restart
docker compose up -d express-api

# Option 3: Stop all Docker containers
docker compose down
docker compose up -d
```

### Issue 4: Out of Memory

**Symptoms**:
- Services crash with "JavaScript heap out of memory"
- Docker shows "OOMKilled"
- System becomes slow and unresponsive

**Diagnosis**:
```bash
# Check Docker memory usage
docker stats --no-stream

# Check system memory
free -h

# Check service memory limits
docker compose config | grep -A5 "mem_limit"
```

**Solution**:
```bash
# Increase Docker memory limit
# Edit Docker Desktop settings -> Resources -> Memory

# Increase Node.js heap size
# Edit docker-compose.yml:
# environment:
#   - NODE_OPTIONS=--max-old-space-size=4096

# Restart services
docker compose up -d --build
```

### Issue 5: Authentication Token Expired

**Symptoms**:
- Frontend shows "Unauthorized" errors
- API returns 401 status
- User is logged out unexpectedly

**Diagnosis**:
```bash
# Check auth service logs
docker compose logs auth | grep -i "token"

# Test login
curl -X POST http://localhost:8081/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"merchant@najah.sa","password":"merchant123"}'
```

**Solution**:
```bash
# Clear sessions in database
docker compose exec mongodb mongosh najah-delivery \
  --eval "db.sessions.deleteMany({})"

# Restart auth service
docker compose restart auth

# User needs to log in again
```

### Issue 6: Geocoding Returns No Results

**Symptoms**:
- Order creation fails with "Unable to geocode address"
- Geocoding service returns empty results

**Diagnosis**:
```bash
# Check geocoding service
docker compose logs geocoding --tail=50

# Test geocoding
curl "http://localhost:5002/geocode?address=Riyadh,%20Al%20Olaya"
```

**Solution**:
```bash
# Check Nominatim connectivity
curl "https://nominatim.openstreetmap.org/search?q=Riyadh&format=json"

# Restart geocoding service
docker compose restart geocoding

# If using self-hosted Nominatim, check its status
```

### Issue 7: LLM Assistant Not Working

**Symptoms**:
- Assistant returns "No API key configured"
- Chat responses are generic fallbacks
- 500 error from LLM service

**Diagnosis**:
```bash
# Check environment variable
docker compose exec llm-assistant env | grep OPENROUTER_API_KEY

# Check logs
docker compose logs llm-assistant | grep -i "api key"
```

**Solution**:
```bash
# Add API key to .env
echo "OPENROUTER_API_KEY=your_key_here" >> .env

# Restart LLM assistant
docker compose up -d --build llm-assistant

# Verify API key is set
docker compose exec llm-assistant env | grep OPENROUTER_API_KEY
```

### Issue 8: Database Disk Full

**Symptoms**:
- MongoDB write errors
- "No space left on device"
- Services crash intermittently

**Diagnosis**:
```bash
# Check disk usage
df -h

# Check Docker disk usage
docker system df

# Check MongoDB data size
docker compose exec mongodb mongosh najah-delivery \
  --eval "db.stats()"
```

**Solution**:
```bash
# Clean up Docker resources
docker system prune -a --volumes

# Remove old logs
find logs/ -name "*.log" -mtime +7 -delete

# Compact MongoDB collections
docker compose exec mongodb mongosh najah-delivery \
  --eval "db.runCommand({compact: 'orders'})"

# If still full, add disk space or move data volume
```

## Log Inspection

### View Real-time Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f express-api

# Multiple services
docker compose logs -f express-api auth payments

# Filter by log level
docker compose logs express-api | grep -i error
docker compose logs express-api | grep -i warn
```

### View Historical Logs

```bash
# Last 100 lines
docker compose logs express-api --tail=100

# Since timestamp
docker compose logs express-api --since 2024-01-16T10:00:00

# Between timestamps
docker compose logs express-api --since 2024-01-16T10:00:00 --until 2024-01-16T11:00:00
```

### Search Logs

```bash
# Find all errors in last hour
docker compose logs --since 1h | grep -i error

# Find specific request ID
docker compose logs | grep "a3f4b2c1-d5e6-f7g8-h9i0-j1k2l3m4n5o6"

# Find slow queries
docker compose logs express-api | grep "Slow database query"

# Find authentication failures
docker compose logs auth | grep "401"
```

### Export Logs

```bash
# Export all logs to file
docker compose logs > logs_$(date +%Y%m%d_%H%M%S).log

# Export specific service
docker compose logs express-api > express-api_$(date +%Y%m%d_%H%M%S).log

# Export as JSON
docker compose logs --json > logs.jsonl
```

### Log Files Location

**Docker Compose**:
- Container stdout/stderr: `docker compose logs`
- Volume-mounted logs: `./services/<service>/logs/`

**Production**:
- Application logs: `/var/log/najah-delivery/<service>/`
- PM2 logs: `~/.pm2/logs/`
- System logs: `/var/log/syslog`, `/var/log/messages`

## Database Maintenance

### Backup Database

```bash
# Full backup
docker compose exec -T mongodb mongodump \
  --db=najah-delivery \
  --archive=/tmp/backup_$(date +%Y%m%d_%H%M%S).archive

# Copy backup to host
docker compose cp mongodb:/tmp/backup_*.archive ./backups/

# Compress backup
gzip backups/backup_*.archive
```

### Restore Database

```bash
# Copy backup to container
docker compose cp backups/backup_20240116.archive mongodb:/tmp/

# Restore
docker compose exec -T mongodb mongorestore \
  --archive=/tmp/backup_20240116.archive \
  --drop
```

### Compact Collections

```bash
# Compact all collections
docker compose exec mongodb mongosh najah-delivery \
  --eval "
    db.getCollectionNames().forEach(function(collection) {
      print('Compacting ' + collection);
      db.runCommand({compact: collection});
    });
  "
```

### Rebuild Indexes

```bash
# Rebuild all indexes
docker compose exec mongodb mongosh najah-delivery \
  --eval "
    db.getCollectionNames().forEach(function(collection) {
      print('Reindexing ' + collection);
      db[collection].reIndex();
    });
  "
```

### Check Database Size

```bash
# Overall stats
docker compose exec mongodb mongosh najah-delivery \
  --eval "db.stats(1024*1024)" # Size in MB

# Per-collection stats
docker compose exec mongodb mongosh najah-delivery \
  --eval "
    db.getCollectionNames().forEach(function(col) {
      var stats = db[col].stats(1024*1024);
      print(col + ': ' + stats.size + ' MB, ' + stats.count + ' docs');
    });
  "
```

### Clean Up Old Data

```bash
# Delete old sessions (older than 7 days)
docker compose exec mongodb mongosh najah-delivery \
  --eval "
    var cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    db.sessions.deleteMany({expiresAt: {\$lt: cutoff}});
  "

# Delete old audit logs (older than 90 days)
docker compose exec mongodb mongosh najah-delivery \
  --eval "
    var cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    db.auditlogs.deleteMany({createdAt: {\$lt: cutoff}});
  "

# Delete old webhook logs (older than 30 days)
docker compose exec mongodb mongosh najah-delivery \
  --eval "
    var cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    db.webhooklogs.deleteMany({createdAt: {\$lt: cutoff}});
  "
```

## Backup Procedures

### Automated Daily Backups

Create backup script `/scripts/backup-db.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/backups/mongodb"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/najah-delivery-$DATE.archive"

# Create backup directory
mkdir -p $BACKUP_DIR

# Create backup
docker compose exec -T mongodb mongodump \
  --db=najah-delivery \
  --archive=$BACKUP_FILE \
  --gzip

# Compress (if not using --gzip above)
# gzip $BACKUP_FILE

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.archive*" -mtime +7 -delete

echo "Backup completed: $BACKUP_FILE"
```

Schedule with cron:

```bash
# Add to crontab
crontab -e

# Daily backup at 2 AM
0 2 * * * /path/to/scripts/backup-db.sh >> /var/log/backup.log 2>&1
```

### Upload to S3 (Production)

```bash
#!/bin/bash
BACKUP_FILE="/path/to/backup.archive.gz"
S3_BUCKET="s3://najah-delivery-backups"
DATE=$(date +%Y%m%d)

# Upload to S3
aws s3 cp $BACKUP_FILE $S3_BUCKET/daily/backup-$DATE.archive.gz

# Move to monthly if 1st of month
if [ $(date +%d) -eq 01 ]; then
  aws s3 cp $BACKUP_FILE $S3_BUCKET/monthly/backup-$DATE.archive.gz
fi

# Clean up local backup
rm $BACKUP_FILE

echo "Backup uploaded to S3"
```

### Verify Backup Integrity

```bash
# Test restore to temporary database
docker compose exec -T mongodb mongorestore \
  --archive=/tmp/backup.archive \
  --nsFrom='najah-delivery.*' \
  --nsTo='najah-delivery-test.*'

# Verify data
docker compose exec mongodb mongosh najah-delivery-test \
  --eval "db.merchants.countDocuments()"

# Clean up
docker compose exec mongodb mongosh najah-delivery-test \
  --eval "db.dropDatabase()"
```

## Deployment Procedures

### Pre-Deployment Checklist

- [ ] All tests passing
- [ ] Code reviewed and approved
- [ ] Database migrations prepared
- [ ] Backup created
- [ ] Rollback plan prepared
- [ ] Deployment window scheduled
- [ ] Stakeholders notified
- [ ] Monitoring alerts configured

### Development Deployment

```bash
# Pull latest code
git pull origin develop

# Rebuild and restart services
docker compose up -d --build

# Run migrations (if any)
docker compose exec express-api node scripts/migrate.js

# Verify deployment
./scripts/health-check.sh

# Seed data (if needed)
docker compose exec express-api node scripts/seed.js
```

### Staging Deployment

```bash
# SSH to staging server
ssh staging.najah.sa

# Pull latest code
cd /opt/najah-delivery-os
git pull origin staging

# Build Docker images
docker compose build

# Stop services
docker compose down

# Start services
docker compose up -d

# Run smoke tests
./scripts/smoke-test.sh

# Check logs
docker compose logs -f --tail=100
```

### Production Deployment (Blue-Green)

```bash
# 1. Deploy to green environment
ssh green.najah.sa
cd /opt/najah-delivery-os
git pull origin main
docker compose up -d --build

# 2. Run health checks
./scripts/health-check.sh

# 3. Run smoke tests
./scripts/smoke-test.sh

# 4. Switch load balancer to green
# (Manual step in AWS Console or Terraform)
terraform apply -var="active_env=green"

# 5. Monitor for 15 minutes
# Check error rate, response times, logs

# 6. If successful, drain blue environment
ssh blue.najah.sa
docker compose down

# 7. If issues, rollback: switch LB back to blue
terraform apply -var="active_env=blue"
```

### Database Migration

```bash
# 1. Backup database
./scripts/backup-db.sh

# 2. Test migration on backup
docker compose exec -T mongodb mongorestore \
  --archive=/tmp/backup.archive \
  --nsFrom='najah-delivery.*' \
  --nsTo='najah-delivery-test.*'

docker compose exec express-api \
  MONGODB_URI=mongodb://localhost:27017/najah-delivery-test \
  node scripts/migrate.js

# 3. If test successful, run on production
docker compose exec express-api node scripts/migrate.js

# 4. Verify migration
docker compose exec mongodb mongosh najah-delivery \
  --eval "db.orders.findOne()"
```

### Rollback Procedure

```bash
# 1. Stop current version
docker compose down

# 2. Checkout previous version
git log --oneline -10  # Find last good commit
git checkout <COMMIT_HASH>

# 3. Rebuild and start
docker compose up -d --build

# 4. Restore database (if schema changed)
docker compose exec -T mongodb mongorestore \
  --archive=/backups/backup_before_deploy.archive \
  --drop

# 5. Verify rollback
./scripts/health-check.sh
```

### Post-Deployment Verification

```bash
# Check all services healthy
./scripts/health-check.sh

# Check error rate
docker compose logs --since 10m | grep -c "error"

# Check response times
curl -o /dev/null -s -w "Response time: %{time_total}s\n" http://localhost:8080/health

# Test critical flows
# - User login
# - Order creation
# - Route optimization
# - Delivery tracking

# Monitor for 30 minutes
watch -n 60 './scripts/health-check.sh'
```

## Emergency Procedures

### Service Down

```bash
# 1. Restart service immediately
docker compose restart <service>

# 2. Check logs for root cause
docker compose logs <service> --tail=200

# 3. If persistent, rollback
git checkout <LAST_GOOD_COMMIT>
docker compose up -d --build <service>

# 4. Notify team
```

### Database Corruption

```bash
# 1. Stop all services immediately
docker compose down

# 2. Assess corruption
docker compose up -d mongodb
docker compose exec mongodb mongosh najah-delivery \
  --eval "db.runCommand({validate: 'orders'})"

# 3. Restore from latest backup
docker compose exec -T mongodb mongorestore \
  --archive=/backups/latest.archive \
  --drop

# 4. Start services
docker compose up -d

# 5. Verify data integrity
```

### Security Incident

```bash
# 1. Isolate affected systems
# Block network access via security groups

# 2. Preserve evidence
# Copy logs before they rotate
tar -czf incident-logs-$(date +%Y%m%d).tar.gz logs/

# 3. Rotate secrets
# Update JWT_SECRET, API keys, passwords

# 4. Force logout all users
docker compose exec mongodb mongosh najah-delivery \
  --eval "db.sessions.deleteMany({})"

# 5. Investigate and remediate
# Analyze logs, identify attack vector

# 6. Document incident
# Create incident report
```

## Monitoring Dashboard URLs

**Local**:
- Merchant Portal: http://localhost:3000
- Driver App: http://localhost:3001
- Admin Dashboard: http://localhost:8501
- API Docs: http://localhost:8080/api-docs

**Staging**:
- https://staging-merchant.najah.sa
- https://staging-driver.najah.sa
- https://staging-admin.najah.sa

**Production**:
- https://merchant.najah.sa
- https://driver.najah.sa
- https://admin.najah.sa

## Support Contacts

- **On-Call Engineer**: +966-XX-XXXXXXX
- **DevOps Team**: devops@najah.sa
- **Security Team**: security@najah.sa
- **Slack Channel**: #najah-delivery-alerts

## Related Documentation

- [Architecture](architecture.md) - System design
- [Security](security.md) - Security procedures
- [Observability](observability.md) - Logging and monitoring
- [Seeding](seeding.md) - Test data generation
