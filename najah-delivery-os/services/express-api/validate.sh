#!/bin/bash
set -e

echo "🔍 Validating Najah Delivery Express API Service"
echo "================================================"

# Check required files
echo -e "\n✓ Checking core files..."
for file in package.json server.js .env.example Dockerfile README.md openapi.yaml jest.config.js; do
  if [ -f "$file" ]; then
    echo "  ✓ $file"
  else
    echo "  ✗ Missing: $file"
    exit 1
  fi
done

# Check directories
echo -e "\n✓ Checking directories..."
for dir in config middleware models routes tests scripts; do
  if [ -d "$dir" ]; then
    echo "  ✓ $dir/"
  else
    echo "  ✗ Missing: $dir/"
    exit 1
  fi
done

# Check models
echo -e "\n✓ Checking models..."
for model in User Merchant Order Courier RoutePlan WebhookLog AuditLog; do
  if [ -f "models/${model}.js" ]; then
    echo "  ✓ models/${model}.js"
  else
    echo "  ✗ Missing: models/${model}.js"
    exit 1
  fi
done

# Check routes
echo -e "\n✓ Checking routes..."
for route in health auth merchants orders couriers routePlans tracking assistant; do
  if [ -f "routes/${route}.js" ]; then
    echo "  ✓ routes/${route}.js"
  else
    echo "  ✗ Missing: routes/${route}.js"
    exit 1
  fi
done

# Check middleware
echo -e "\n✓ Checking middleware..."
for mw in auth i18n requestId errorHandler; do
  if [ -f "middleware/${mw}.js" ]; then
    echo "  ✓ middleware/${mw}.js"
  else
    echo "  ✗ Missing: middleware/${mw}.js"
    exit 1
  fi
done

# Check config
echo -e "\n✓ Checking config..."
for cfg in database logger; do
  if [ -f "config/${cfg}.js" ]; then
    echo "  ✓ config/${cfg}.js"
  else
    echo "  ✗ Missing: config/${cfg}.js"
    exit 1
  fi
done

# Check dependencies in package.json
echo -e "\n✓ Checking dependencies..."
for dep in express mongoose joi winston morgan helmet cors express-rate-limit jsonwebtoken dotenv axios; do
  if grep -q "\"$dep\"" package.json; then
    echo "  ✓ $dep"
  else
    echo "  ✗ Missing dependency: $dep"
    exit 1
  fi
done

# Validate JSON files
echo -e "\n✓ Validating JSON files..."
for json in package.json jest.config.js; do
  if node -e "require('./$json')" 2>/dev/null; then
    echo "  ✓ $json is valid"
  else
    echo "  ✗ $json has syntax errors"
    exit 1
  fi
done

# Check for syntax errors in JS files
echo -e "\n✓ Checking JavaScript syntax..."
error_count=0
for file in $(find . -name "*.js" ! -path "*/node_modules/*"); do
  if node --check "$file" 2>/dev/null; then
    : # File is valid
  else
    echo "  ✗ Syntax error in: $file"
    error_count=$((error_count + 1))
  fi
done

if [ $error_count -eq 0 ]; then
  echo "  ✓ All JavaScript files are valid"
else
  echo "  ✗ Found $error_count files with syntax errors"
  exit 1
fi

echo -e "\n================================================"
echo "✅ All validation checks passed!"
echo "================================================"
echo ""
echo "📊 Summary:"
echo "  - Models: 7"
echo "  - Routes: 8"
echo "  - Middleware: 4"
echo "  - Config: 2"
echo "  - Tests: 2"
echo "  - Total files: $(find . -type f \( -name "*.js" -o -name "*.json" -o -name "*.yaml" \) ! -path "*/node_modules/*" | wc -l)"
echo ""
echo "🚀 Ready to deploy!"
