# Data Models

This document describes all MongoDB schemas, indexes, and data structures used in Najah Delivery OS.

## Collections Overview

| Collection | Purpose | Key Features |
|------------|---------|--------------|
| users | User authentication and profiles | bcrypt hashing, role-based access |
| merchants | Merchant accounts and API keys | API key generation, webhook secrets |
| couriers | Delivery driver profiles | Geospatial location, shift management |
| orders | Delivery orders | Bilingual addresses, geolocation, status tracking |
| routeplans | Optimized delivery routes | Order assignments, metrics |
| shipments | Delivery tracking events | Timestamps, signatures |
| paymentintents | Payment transactions | Mada/STC/COD support, SAR currency |
| sessions | Auth refresh tokens | TTL auto-expiry |
| auditlogs | Security and compliance logs | Action tracking, IP logging |
| webhooklogs | Webhook delivery history | HMAC verification logs |

## User Model

**Collection**: `users`  
**Service**: `auth`, `express-api`  
**Purpose**: User authentication, authorization, and profile management

### Schema

```javascript
{
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: /^\S+@\S+\.\S+$/
  },
  password: {
    type: String,
    required: true,
    minlength: 6
    // Stored as bcrypt hash with 10 salt rounds
  },
  role: {
    type: String,
    enum: ['admin', 'merchant', 'driver', 'customer'],
    default: 'customer'
  },
  merchantId: {
    type: ObjectId,
    ref: 'Merchant',
    required: function() {
      return this.role === 'merchant' || this.role === 'driver';
    }
  },
  verified: {
    type: Boolean,
    default: false
  },
  createdAt: Date,
  updatedAt: Date
}
```

### Indexes

```javascript
// Automatic from unique constraint
{ email: 1 } // UNIQUE

// Query optimization
{ role: 1 }
{ merchantId: 1 }
{ verified: 1 }
```

### Pre-save Hook

- Hashes password with bcrypt (10 rounds) before saving
- Only rehashes if password field is modified

### Methods

- `comparePassword(candidatePassword)`: Validates password against hash
- `toJSON()`: Removes password field from JSON output

### Example Document

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "email": "merchant@najah.sa",
  "password": "$2a$10$...",
  "role": "merchant",
  "merchantId": "507f1f77bcf86cd799439012",
  "verified": true,
  "createdAt": "2024-01-15T10:00:00.000Z",
  "updatedAt": "2024-01-15T10:00:00.000Z"
}
```

## Merchant Model

**Collection**: `merchants`  
**Service**: `express-api`  
**Purpose**: Merchant account management, API authentication

### Schema

```javascript
{
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: true
  },
  address: {
    ar: { 
      type: String, 
      required: true 
    },
    en: { 
      type: String, 
      required: true 
    }
  },
  api_key: {
    type: String,
    required: true,
    unique: true
    // Generated with crypto.randomBytes(32).toString('hex')
  },
  webhook_secret: {
    type: String,
    required: true
    // Used for HMAC signature verification
  },
  active: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}
```

### Indexes

```javascript
{ email: 1 } // UNIQUE
{ api_key: 1 } // UNIQUE, for API authentication
{ active: 1 } // Filter active merchants
```

### Example Document

```json
{
  "_id": "507f1f77bcf86cd799439012",
  "name": "Riyadh Electronics Store",
  "email": "contact@riyadh-electronics.sa",
  "phone": "+966112345678",
  "address": {
    "ar": "الرياض، حي العليا، شارع الملك فهد",
    "en": "Riyadh, Al Olaya District, King Fahd Road"
  },
  "api_key": "a3f4b2c1d5e6f7g8h9i0j1k2l3m4n5o6...",
  "webhook_secret": "whs_7e8f9g0h1i2j3k4l5m6n7o8p9q0r...",
  "active": true,
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

## Order Model

**Collection**: `orders`  
**Service**: `express-api`, `optimizer`  
**Purpose**: Delivery order management with bilingual addresses and geolocation

### Schema

```javascript
{
  merchantId: {
    type: ObjectId,
    ref: 'Merchant',
    required: true
  },
  customerId: {
    type: ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
    enum: [
      'pending',      // Created, awaiting confirmation
      'confirmed',    // Confirmed, ready for optimization
      'assigned',     // Assigned to courier
      'picked_up',    // Courier collected from merchant
      'in_transit',   // En route to customer
      'delivered',    // Successfully delivered
      'cancelled',    // Cancelled by merchant/customer
      'failed'        // Delivery attempt failed
    ],
    default: 'pending'
  },
  address: {
    ar: { 
      type: String, 
      required: true 
    },
    en: { 
      type: String, 
      required: true 
    },
    components: {
      street: String,
      district: String,
      city: String,
      postal_code: String
    },
    coordinates: {
      lat: { 
        type: Number, 
        required: true 
      },
      lng: { 
        type: Number, 
        required: true 
      }
    }
  },
  timeWindow: {
    start: { 
      type: Date, 
      required: true 
    },
    end: { 
      type: Date, 
      required: true 
    }
  },
  priority: {
    type: Number,
    default: 1,
    min: 1,
    max: 5
  },
  courierId: {
    type: ObjectId,
    ref: 'Courier'
  },
  routePlanId: {
    type: ObjectId,
    ref: 'RoutePlan'
  },
  items: [{
    name: { 
      type: String, 
      required: true 
    },
    quantity: { 
      type: Number, 
      required: true 
    },
    price: { 
      type: Number, 
      required: true 
    }
  }],
  totalAmount: {
    type: Number,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}
```

### Indexes

```javascript
{ merchantId: 1 }           // Filter by merchant
{ status: 1 }               // Filter by status
{ courierId: 1 }            // Find courier's orders
{ createdAt: -1 }           // Recent orders first
{ 
  'address.coordinates.lat': 1, 
  'address.coordinates.lng': 1 
}                           // Geospatial queries
{ merchantId: 1, status: 1, createdAt: -1 } // COMPOUND
```

### Pre-save Hook

- Updates `updatedAt` timestamp on every save

### Example Document

```json
{
  "_id": "507f1f77bcf86cd799439013",
  "merchantId": "507f1f77bcf86cd799439012",
  "customerId": "507f1f77bcf86cd799439014",
  "status": "assigned",
  "address": {
    "ar": "الرياض، حي النخيل، شارع الأمير محمد بن عبدالعزيز",
    "en": "Riyadh, Al Nakheel District, Prince Mohammed Bin Abdulaziz St",
    "components": {
      "street": "Prince Mohammed Bin Abdulaziz St",
      "district": "Al Nakheel",
      "city": "Riyadh",
      "postal_code": "12382"
    },
    "coordinates": {
      "lat": 24.7136,
      "lng": 46.6753
    }
  },
  "timeWindow": {
    "start": "2024-01-16T09:00:00.000Z",
    "end": "2024-01-16T17:00:00.000Z"
  },
  "priority": 2,
  "courierId": "507f1f77bcf86cd799439015",
  "routePlanId": "507f1f77bcf86cd799439016",
  "items": [
    {
      "name": "Samsung Galaxy S23",
      "quantity": 1,
      "price": 3299.00
    }
  ],
  "totalAmount": 3299.00,
  "createdAt": "2024-01-16T08:00:00.000Z",
  "updatedAt": "2024-01-16T08:30:00.000Z"
}
```

## Courier Model

**Collection**: `couriers`  
**Service**: `express-api`, `optimizer`  
**Purpose**: Courier profile and real-time location tracking

### Schema

```javascript
{
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: true
  },
  vehicle: {
    type: String,
    enum: ['motorcycle', 'car', 'van', 'bicycle'],
    default: 'motorcycle'
  },
  status: {
    type: String,
    enum: ['available', 'busy', 'offline', 'on_break'],
    default: 'offline'
  },
  currentLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: [0, 0]
    }
  },
  shift: {
    start: { 
      type: String, 
      required: true 
    }, // HH:MM format
    end: { 
      type: String, 
      required: true 
    }
  },
  capacity: {
    type: Number,
    default: 10
  },
  merchantId: {
    type: ObjectId,
    ref: 'Merchant'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}
```

### Indexes

```javascript
{ email: 1 }              // UNIQUE
{ status: 1 }             // Filter available couriers
{ merchantId: 1 }         // Filter by merchant
{ currentLocation: '2dsphere' } // Geospatial queries (near, within)
```

### Geospatial Index Details

The `2dsphere` index enables:
- **$near**: Find couriers near a coordinate
- **$geoWithin**: Find couriers within a polygon
- **$geoIntersects**: Find couriers intersecting geometry

### Example Document

```json
{
  "_id": "507f1f77bcf86cd799439015",
  "name": "Ahmed Al-Qarni",
  "email": "ahmed.qarni@najahdelivery.sa",
  "phone": "+966501234567",
  "vehicle": "motorcycle",
  "status": "busy",
  "currentLocation": {
    "type": "Point",
    "coordinates": [46.6753, 24.7136]
  },
  "shift": {
    "start": "08:00",
    "end": "16:00"
  },
  "capacity": 15,
  "merchantId": "507f1f77bcf86cd799439012",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

## RoutePlan Model

**Collection**: `routeplans`  
**Service**: `express-api`, `optimizer`  
**Purpose**: Optimized delivery routes with assignments and metrics

### Schema

```javascript
{
  courierId: {
    type: ObjectId,
    ref: 'Courier',
    required: true
  },
  merchantId: {
    type: ObjectId,
    ref: 'Merchant',
    required: true
  },
  orders: [{
    type: ObjectId,
    ref: 'Order'
  }],
  status: {
    type: String,
    enum: ['pending', 'active', 'completed', 'cancelled'],
    default: 'pending'
  },
  totalDistance: {
    type: Number,
    default: 0 // in meters
  },
  totalDuration: {
    type: Number,
    default: 0 // in seconds
  },
  optimizedAt: {
    type: Date
  },
  startedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  }
}
```

### Indexes

```javascript
{ courierId: 1 }      // Find courier's routes
{ merchantId: 1 }     // Find merchant's routes
{ status: 1 }         // Filter by status
{ optimizedAt: -1 }   // Most recent optimizations
```

### Example Document

```json
{
  "_id": "507f1f77bcf86cd799439016",
  "courierId": "507f1f77bcf86cd799439015",
  "merchantId": "507f1f77bcf86cd799439012",
  "orders": [
    "507f1f77bcf86cd799439013",
    "507f1f77bcf86cd799439017",
    "507f1f77bcf86cd799439018"
  ],
  "status": "active",
  "totalDistance": 15420,
  "totalDuration": 2340,
  "optimizedAt": "2024-01-16T08:00:00.000Z",
  "startedAt": "2024-01-16T08:30:00.000Z",
  "completedAt": null
}
```

## Shipment Model

**Collection**: `shipments`  
**Service**: `express-api`  
**Purpose**: Delivery tracking with timestamps and proof of delivery

### Schema

```javascript
{
  orderId: {
    type: ObjectId,
    ref: 'Order',
    required: true
  },
  courierId: {
    type: ObjectId,
    ref: 'Courier',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'picked_up', 'in_transit', 'delivered', 'failed'],
    default: 'pending'
  },
  pickupTime: {
    type: Date
  },
  deliveryTime: {
    type: Date
  },
  signature: {
    type: String // Base64 encoded signature image
  },
  notes: {
    type: String
  }
}
```

### Indexes

```javascript
{ orderId: 1 }    // Find shipment for order
{ courierId: 1 }  // Find courier's shipments
{ status: 1 }     // Filter by status
```

### Example Document

```json
{
  "_id": "507f1f77bcf86cd799439019",
  "orderId": "507f1f77bcf86cd799439013",
  "courierId": "507f1f77bcf86cd799439015",
  "status": "delivered",
  "pickupTime": "2024-01-16T08:45:00.000Z",
  "deliveryTime": "2024-01-16T10:30:00.000Z",
  "signature": "data:image/png;base64,iVBORw0KGgoAAAANS...",
  "notes": "Delivered to reception desk"
}
```

## PaymentIntent Model

**Collection**: `paymentintents`  
**Service**: `payments`  
**Purpose**: Payment transaction tracking for KSA payment methods

### Schema

```javascript
{
  intentId: {
    type: String,
    unique: true,
    default: () => `pi_${uuidv4().replace(/-/g, '')}`
  },
  orderId: {
    type: ObjectId,
    required: true,
    index: true
  },
  merchantId: {
    type: ObjectId,
    required: true,
    index: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'SAR',
    uppercase: true
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: ['mada', 'stc_pay', 'cash_on_delivery'],
    lowercase: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'succeeded', 'failed', 'cancelled'],
    default: 'pending',
    index: true
  },
  metadata: {
    type: Object,
    default: {}
  },
  confirmedAt: {
    type: Date
  },
  cancelledAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}
```

### Indexes

```javascript
{ intentId: 1 }               // UNIQUE
{ orderId: 1 }                // Find payment for order
{ merchantId: 1 }             // Merchant's payments
{ status: 1 }                 // Filter by status
{ createdAt: -1 }             // Recent payments first
{ merchantId: 1, status: 1 }  // COMPOUND
```

### Example Document

```json
{
  "_id": "507f1f77bcf86cd79943901a",
  "intentId": "pi_a3f4b2c1d5e6f7g8h9i0j1k2",
  "orderId": "507f1f77bcf86cd799439013",
  "merchantId": "507f1f77bcf86cd799439012",
  "amount": 3299.00,
  "currency": "SAR",
  "paymentMethod": "mada",
  "status": "succeeded",
  "metadata": {
    "card_last4": "1234",
    "card_brand": "mada"
  },
  "confirmedAt": "2024-01-16T08:05:00.000Z",
  "cancelledAt": null,
  "createdAt": "2024-01-16T08:00:00.000Z",
  "updatedAt": "2024-01-16T08:05:00.000Z"
}
```

## Session Model

**Collection**: `sessions`  
**Service**: `auth`  
**Purpose**: Refresh token management with automatic expiry

### Schema

```javascript
{
  userId: {
    type: ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  refreshToken: {
    type: String,
    required: true,
    unique: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}
```

### Indexes

```javascript
{ userId: 1 }                           // Find user's sessions
{ refreshToken: 1 }                     // UNIQUE
{ expiresAt: 1 }                        // TTL queries
{ expiresAt: 1, expireAfterSeconds: 0 } // TTL INDEX for auto-cleanup
```

### TTL Index Behavior

MongoDB automatically deletes documents where `expiresAt` is in the past. The background task runs every 60 seconds.

### Example Document

```json
{
  "_id": "507f1f77bcf86cd79943901b",
  "userId": "507f1f77bcf86cd799439011",
  "refreshToken": "rt_b4c5d6e7f8g9h0i1j2k3l4m5n6o7",
  "expiresAt": "2024-01-23T10:00:00.000Z",
  "ipAddress": "203.0.113.42",
  "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)...",
  "createdAt": "2024-01-16T10:00:00.000Z"
}
```

## AuditLog Model

**Collection**: `auditlogs`  
**Service**: `express-api`  
**Purpose**: Security audit trail for compliance (PDPL, SSDLC)

### Schema

```javascript
{
  userId: {
    type: ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true
    // Examples: 'order.create', 'user.login', 'merchant.update'
  },
  resource: {
    type: String,
    required: true
    // Resource type: 'order', 'user', 'merchant', 'courier'
  },
  resourceId: {
    type: String
  },
  changes: {
    type: Mixed
    // Object containing before/after values
  },
  ipAddress: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}
```

### Indexes

```javascript
{ userId: 1 }       // Find user's actions
{ resource: 1 }     // Filter by resource type
{ createdAt: -1 }   // Recent actions first
{ userId: 1, createdAt: -1 } // COMPOUND for user history
```

### Example Document

```json
{
  "_id": "507f1f77bcf86cd79943901c",
  "userId": "507f1f77bcf86cd799439011",
  "action": "order.update",
  "resource": "order",
  "resourceId": "507f1f77bcf86cd799439013",
  "changes": {
    "status": {
      "before": "pending",
      "after": "confirmed"
    }
  },
  "ipAddress": "203.0.113.42",
  "createdAt": "2024-01-16T08:30:00.000Z"
}
```

## WebhookLog Model

**Collection**: `webhooklogs`  
**Service**: `ingestion`  
**Purpose**: Webhook delivery history and debugging

### Schema

```javascript
{
  merchantId: {
    type: ObjectId,
    ref: 'Merchant',
    required: true
  },
  event: {
    type: String,
    required: true
    // Examples: 'order.created', 'order.updated', 'order.delivered'
  },
  payload: {
    type: Mixed,
    required: true
  },
  signature: {
    type: String,
    required: true
    // HMAC-SHA256 signature
  },
  status: {
    type: String,
    enum: ['success', 'failed'],
    default: 'success'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}
```

### Indexes

```javascript
{ merchantId: 1 }           // Filter by merchant
{ event: 1 }                // Filter by event type
{ createdAt: -1 }           // Recent webhooks first
{ merchantId: 1, createdAt: -1 } // COMPOUND
```

### Example Document

```json
{
  "_id": "507f1f77bcf86cd79943901d",
  "merchantId": "507f1f77bcf86cd799439012",
  "event": "order.created",
  "payload": {
    "orderId": "507f1f77bcf86cd799439013",
    "timestamp": "2024-01-16T08:00:00.000Z"
  },
  "signature": "sha256=a3f4b2c1d5e6f7g8h9i0j1k2l3m4n5o6...",
  "status": "success",
  "createdAt": "2024-01-16T08:00:00.000Z"
}
```

## VectorDoc Model (Chroma)

**Store**: Chroma vector database  
**Service**: `llm-assistant`  
**Purpose**: Document embeddings for RAG

### Structure

```python
{
  "id": "doc_uuid",
  "content": "Full text content of document",
  "metadata": {
    "source": "documentation/architecture.md",
    "type": "documentation",
    "updated_at": "2024-01-16T08:00:00.000Z"
  },
  "embedding": [0.123, -0.456, 0.789, ...]  # 1536-dim vector
}
```

### Collections

- `najah_docs`: System documentation
- `najah_faqs`: Frequently asked questions
- `najah_orders`: Recent order data (for context)

## Index Performance Considerations

### Compound Index Strategy

Use compound indexes for common query patterns:

```javascript
// express-api: GET /api/orders?merchantId=X&status=pending
{ merchantId: 1, status: 1, createdAt: -1 }

// payments: GET /api/payments?merchantId=X&status=succeeded
{ merchantId: 1, status: 1 }

// auditlogs: GET /api/audit?userId=X&limit=50
{ userId: 1, createdAt: -1 }
```

### Geospatial Query Examples

```javascript
// Find couriers within 5km of order location
db.couriers.find({
  currentLocation: {
    $near: {
      $geometry: {
        type: "Point",
        coordinates: [46.6753, 24.7136]
      },
      $maxDistance: 5000 // meters
    }
  },
  status: "available"
})

// Find orders in Riyadh bounding box
db.orders.find({
  'address.coordinates.lat': { $gte: 24.5, $lte: 25.0 },
  'address.coordinates.lng': { $gte: 46.5, $lte: 47.0 }
})
```

## Data Retention Policies

| Collection | Retention | Cleanup Method |
|------------|-----------|----------------|
| sessions | 7 days | TTL index automatic |
| auditlogs | 90 days | Manual archive script |
| webhooklogs | 30 days | Manual cleanup |
| paymentintents | Indefinite | Compliance requirement |
| orders | Indefinite | Business requirement |

## Migration Scripts

When schema changes are needed:

1. Create migration script in `/services/express-api/migrations/`
2. Test on development database
3. Run on production with backup
4. Update this documentation

Example migration:

```javascript
// migrations/001-add-order-priority.js
db.orders.updateMany(
  { priority: { $exists: false } },
  { $set: { priority: 1 } }
)
```

## Related Documentation

- [Architecture](architecture.md) - System architecture overview
- [Security](security.md) - Data protection and PDPL compliance
- [Seeding](seeding.md) - Sample data generation
