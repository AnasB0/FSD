# Seeding Test Data

This document describes the seed script and test data for Najah Delivery OS.

## Purpose

The seed script (`services/express-api/scripts/seed.js`) generates realistic test data for:
- **Development**: Local testing and feature development
- **Demo**: Showcasing the system to stakeholders
- **QA**: End-to-end testing and validation
- **Training**: Onboarding new team members

## Demo Data Overview

### 3 Merchants

The seed script creates three merchants representing different KSA cities:

#### 1. Riyadh Electronics Store
- **Location**: Al Olaya District, King Fahd Road
- **Arabic**: الرياض، حي العليا، شارع الملك فهد
- **Email**: contact@riyadh-electronics.sa
- **Phone**: +966112345678
- **Products**: Electronics, gadgets, smartphones

#### 2. Jeddah Foods Market
- **Location**: Al Rawdah District, Palestine Street
- **Arabic**: جدة، حي الروضة، شارع فلسطين
- **Email**: orders@jeddah-foods.sa
- **Phone**: +966122345678
- **Products**: Groceries, fresh produce, packaged foods

#### 3. Dammam Pharmacy Plus
- **Location**: Al Faisaliyah District, Dhahran Street
- **Arabic**: الدمام، حي الفيصلية، شارع الظهران
- **Email**: info@dammam-pharmacy.sa
- **Phone**: +966132345678
- **Products**: Medications, health products, medical supplies

Each merchant receives:
- Unique API key (64-character hex string)
- Webhook secret for HMAC signature verification
- Active status

### 10 Couriers

The seed script creates 10 couriers distributed across the three cities:

#### Riyadh Couriers (3)

**1. Ahmed Al-Qarni**
- Vehicle: Motorcycle
- Shift: 08:00 - 16:00
- Capacity: 15 orders
- Location: [46.6753, 24.7136] (Al Olaya)
- Status: Available

**2. Mohammed Al-Otaibi**
- Vehicle: Car
- Shift: 09:00 - 17:00
- Capacity: 20 orders
- Location: [46.6848, 24.7242] (Al Malqa)
- Status: Available

**3. Khalid Al-Harbi**
- Vehicle: Van
- Shift: 07:00 - 15:00
- Capacity: 30 orders
- Location: [46.6923, 24.7301] (Al Sahafa)
- Status: Offline

#### Jeddah Couriers (4)

**4. Fahad Al-Malki**
- Vehicle: Motorcycle
- Shift: 09:00 - 17:00
- Capacity: 15 orders
- Location: [39.1688, 21.5433] (Al Rawdah)

**5. Abdullah Al-Zahrani**
- Vehicle: Car
- Shift: 08:00 - 16:00
- Capacity: 20 orders
- Location: [39.1777, 21.5522] (Al Andalus)

**6. Saad Al-Ghamdi**
- Vehicle: Bicycle
- Shift: 10:00 - 18:00
- Capacity: 8 orders
- Location: [39.1866, 21.5611] (Al Hamra)

**7. Turki Al-Shehri**
- Vehicle: Van
- Shift: 07:00 - 15:00
- Capacity: 30 orders
- Location: [39.1955, 21.5700] (Al Basatin)

#### Dammam Couriers (3)

**8. Faisal Al-Dosari**
- Vehicle: Motorcycle
- Shift: 08:00 - 16:00
- Capacity: 15 orders
- Location: [50.1045, 26.4207] (Al Faisaliyah)

**9. Nasser Al-Mutairi**
- Vehicle: Car
- Shift: 09:00 - 17:00
- Capacity: 20 orders
- Location: [50.1134, 26.4296] (Al Khobar)

**10. Saleh Al-Qahtani**
- Vehicle: Van
- Shift: 07:00 - 15:00
- Capacity: 30 orders
- Location: [50.1223, 26.4385] (Dhahran)

### 20+ Orders

The seed script generates diverse orders with bilingual addresses:

#### Riyadh Orders (8)

**Order 1: Samsung Galaxy S23**
- Address (AR): الرياض، حي النخيل، شارع الأمير محمد بن عبدالعزيز
- Address (EN): Riyadh, Al Nakheel District, Prince Mohammed Bin Abdulaziz St
- Coordinates: [46.7235, 24.7242]
- Priority: 2
- Amount: 3,299 SAR
- Time Window: 09:00 - 17:00

**Order 2: MacBook Pro 16"**
- Address (AR): الرياض، حي الياسمين، طريق الملك عبدالله
- Address (EN): Riyadh, Al Yasmin District, King Abdullah Road
- Coordinates: [46.6935, 24.7635]
- Priority: 3 (High)
- Amount: 9,999 SAR
- Time Window: 10:00 - 18:00

**Order 3-8**: Various electronics (headphones, smart watches, tablets, laptops)
- Distributed across Riyadh districts
- Coordinates range: [46.6-46.8, 24.6-24.8]
- Priorities: 1-3
- Amounts: 399-7,499 SAR

#### Jeddah Orders (8)

**Order 9: Fresh Fruits & Vegetables**
- Address (AR): جدة، حي الروضة، شارع فلسطين
- Address (EN): Jeddah, Al Rawdah District, Palestine Street
- Coordinates: [39.1688, 21.5433]
- Priority: 2
- Amount: 249 SAR
- Time Window: 08:00 - 12:00 (Fresh delivery)

**Order 10: Organic Chicken & Fish**
- Address (AR): جدة، حي الزهراء، طريق المدينة
- Address (EN): Jeddah, Al Zahra District, Madinah Road
- Coordinates: [39.1788, 21.5533]
- Priority: 3 (High - Perishable)
- Amount: 179 SAR
- Time Window: 08:00 - 12:00

**Order 11-16**: Various groceries (dairy, snacks, beverages, frozen foods)
- Distributed across Jeddah districts
- Coordinates range: [39.1-39.2, 21.5-21.6]
- Priorities: 1-3
- Amounts: 89-449 SAR

#### Dammam Orders (6)

**Order 17: Blood Pressure Monitor**
- Address (AR): الدمام، حي الفيصلية، شارع الظهران
- Address (EN): Dammam, Al Faisaliyah District, Dhahran Street
- Coordinates: [50.1045, 26.4207]
- Priority: 2
- Amount: 399 SAR
- Time Window: 09:00 - 19:00

**Order 18: Diabetes Test Kit**
- Address (AR): الدمام، حي الشاطئ، كورنيش الدمام
- Address (EN): Dammam, Al Shati District, Dammam Corniche
- Coordinates: [50.1145, 26.4307]
- Priority: 3 (High - Urgent)
- Amount: 599 SAR
- Time Window: 09:00 - 15:00

**Order 19-22**: Various medical supplies (vitamins, pain relief, first aid)
- Distributed across Dammam districts
- Coordinates range: [50.0-50.2, 26.3-26.5]
- Priorities: 1-3
- Amounts: 49-799 SAR

### Sample Route Plans

The seed script creates initial route plans:

**Route Plan 1: Riyadh Morning Route**
- Courier: Ahmed Al-Qarni (Motorcycle)
- Orders: 4 orders in North Riyadh
- Total Distance: ~15 km
- Total Duration: ~40 minutes
- Status: Pending

**Route Plan 2: Jeddah Fresh Delivery Route**
- Courier: Fahad Al-Malki (Motorcycle)
- Orders: 3 perishable food orders
- Total Distance: ~8 km
- Total Duration: ~25 minutes
- Status: Active

**Route Plan 3: Dammam Medical Route**
- Courier: Faisal Al-Dosari (Motorcycle)
- Orders: 2 urgent medical orders
- Total Distance: ~6 km
- Total Duration: ~18 minutes
- Status: Pending

## Address Format

All addresses follow a consistent bilingual format:

```javascript
address: {
  ar: "المدينة، الحي، الشارع",
  en: "City, District, Street",
  components: {
    street: "Street Name",
    district: "District Name",
    city: "City Name",
    postal_code: "12345"
  },
  coordinates: {
    lat: 24.7136,
    lng: 46.6753
  }
}
```

### Arabic Address Normalization

The geocoding service normalizes Arabic addresses:
- Removes diacritics (تَشْكِيل)
- Standardizes spellings (الرياض vs الریاض)
- Handles common abbreviations (ش. → شارع)
- Biases results toward KSA

## How to Run Seed Script

### Prerequisites

1. MongoDB running and accessible
2. Express API service built
3. Environment variables configured

### Local (Docker Compose)

```bash
# Start all services
./scripts/start-local.sh

# Wait for services to be healthy
docker compose ps

# Run seed script
docker compose exec express-api node scripts/seed.js
```

Expected output:
```
Connected to MongoDB
Cleared existing data
Created 3 merchants
Created 10 couriers
Created 22 orders
Seeding completed successfully
```

### Local (Direct Node.js)

```bash
# From project root
cd services/express-api

# Install dependencies
npm install

# Set MongoDB URI
export MONGODB_URI="mongodb://localhost:27017/najah-delivery"

# Run seed script
node scripts/seed.js
```

### CI/CD Pipeline

```yaml
# .github/workflows/e2e-tests.yml
- name: Seed test data
  run: |
    docker compose exec -T express-api node scripts/seed.js
```

## Verifying Seeded Data

### Check Merchants

```bash
# Using MongoDB Shell
docker compose exec mongodb mongosh najah-delivery --eval "db.merchants.find().pretty()"

# Using Express API
curl http://localhost:8080/api/merchants | jq
```

### Check Couriers

```bash
# List all couriers
curl http://localhost:8080/api/couriers | jq

# Filter by city (merchant)
curl http://localhost:8080/api/couriers?merchantId=<MERCHANT_ID> | jq
```

### Check Orders

```bash
# List all orders
curl http://localhost:8080/api/orders | jq

# Filter by status
curl http://localhost:8080/api/orders?status=pending | jq

# Get specific order
curl http://localhost:8080/api/orders/<ORDER_ID> | jq
```

### Check Route Plans

```bash
# List all route plans
curl http://localhost:8080/api/route-plans | jq

# Get specific route plan
curl http://localhost:8080/api/route-plans/<ROUTE_PLAN_ID> | jq
```

## Resetting Data

To clear and re-seed:

```bash
# Drop database and re-seed
docker compose exec express-api node scripts/seed.js --force

# Or manually drop database
docker compose exec mongodb mongosh najah-delivery --eval "db.dropDatabase()"
docker compose exec express-api node scripts/seed.js
```

## Customizing Seed Data

### Add More Merchants

Edit `services/express-api/scripts/seed.js`:

```javascript
const merchants = await Merchant.insertMany([
  // ... existing merchants
  {
    name: 'Mecca Bookstore',
    email: 'contact@mecca-books.sa',
    phone: '+966122345679',
    address: {
      ar: 'مكة المكرمة، حي العزيزية، شارع إبراهيم الخليل',
      en: 'Mecca, Al Aziziyah District, Ibrahim Al Khalil Street'
    },
    webhook_secret: crypto.randomBytes(32).toString('hex'),
    api_key: crypto.randomBytes(32).toString('hex'),
    active: true
  }
]);
```

### Add More Orders

```javascript
const orders = await Order.insertMany([
  // ... existing orders
  {
    merchantId: merchants[0]._id,
    status: 'pending',
    address: {
      ar: 'الرياض، حي السليمانية، شارع العروبة',
      en: 'Riyadh, Al Sulaymaniyah District, Al Orouba Street',
      components: {
        street: 'Al Orouba Street',
        district: 'Al Sulaymaniyah',
        city: 'Riyadh',
        postal_code: '12345'
      },
      coordinates: { lat: 24.7500, lng: 46.7000 }
    },
    timeWindow: {
      start: new Date('2024-01-17T09:00:00Z'),
      end: new Date('2024-01-17T17:00:00Z')
    },
    priority: 2,
    items: [
      { name: 'Product Name', quantity: 1, price: 299.00 }
    ],
    totalAmount: 299.00
  }
]);
```

### Modify Coordinates

**Riyadh Bounding Box**: [46.5-47.0, 24.5-25.0]  
**Jeddah Bounding Box**: [39.0-39.3, 21.4-21.7]  
**Dammam Bounding Box**: [50.0-50.2, 26.3-26.5]

Use [OpenStreetMap](https://www.openstreetmap.org/) to find accurate coordinates.

## Seed Data for Different Scenarios

### High Volume Testing

Modify seed script to create 100+ orders:

```javascript
// Generate 100 random orders
const orderCount = 100;
const orders = [];

for (let i = 0; i < orderCount; i++) {
  const merchant = merchants[i % 3];
  const randomLat = 24.5 + Math.random() * 0.5; // Riyadh
  const randomLng = 46.5 + Math.random() * 0.5;
  
  orders.push({
    merchantId: merchant._id,
    status: 'pending',
    address: {
      ar: `الرياض، حي رقم ${i}، شارع رقم ${i}`,
      en: `Riyadh, District ${i}, Street ${i}`,
      coordinates: { lat: randomLat, lng: randomLng }
    },
    // ... rest of order data
  });
}

await Order.insertMany(orders);
```

### Weekend Orders (Fri/Sat)

```javascript
// Friday delivery window
timeWindow: {
  start: new Date('2024-01-19T10:00:00Z'), // Friday 10 AM
  end: new Date('2024-01-19T18:00:00Z')    // Friday 6 PM
}
```

### Rush Hour Testing

```javascript
// All orders with same time window
timeWindow: {
  start: new Date('2024-01-17T12:00:00Z'), // Noon
  end: new Date('2024-01-17T14:00:00Z')    // 2 PM
}
```

## Data Integrity

The seed script ensures:
- ✅ All required fields populated
- ✅ Valid email formats
- ✅ Phone numbers in KSA format (+966)
- ✅ Coordinates within KSA bounds
- ✅ Time windows in future
- ✅ Unique API keys and webhook secrets
- ✅ Referential integrity (merchantId, courierId)

## Troubleshooting

### "Connection refused" Error

```
Error: connect ECONNREFUSED 127.0.0.1:27017
```

**Solution**: Ensure MongoDB is running
```bash
docker compose ps mongodb
docker compose up -d mongodb
```

### "Duplicate key error"

```
E11000 duplicate key error collection: najah-delivery.merchants index: email_1
```

**Solution**: Clear existing data first
```bash
docker compose exec mongodb mongosh najah-delivery --eval "db.merchants.deleteMany({})"
```

### Seed script hangs

**Solution**: Check MongoDB connection and logs
```bash
docker compose logs mongodb
docker compose exec express-api node -e "require('mongoose').connect(process.env.MONGODB_URI).then(() => console.log('OK'))"
```

## Related Documentation

- [Architecture](architecture.md) - System overview
- [Data Models](data-models.md) - Database schemas
- [Runbook](runbook.md) - Operational procedures
