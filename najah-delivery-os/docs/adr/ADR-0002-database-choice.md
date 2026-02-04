# ADR-0002: MongoDB as Primary Database

**Status**: Accepted  
**Date**: 2024-01-15  
**Decision Makers**: Engineering Team, Data Architect  
**Technical Story**: Choose database technology for Najah Delivery OS

## Context

Najah Delivery OS requires a database to store:
- User accounts and authentication data
- Merchant profiles and API keys
- Orders with bilingual addresses (Arabic/English)
- Courier locations (geospatial data)
- Route plans and delivery tracking
- Payment transactions
- Audit logs and webhook history

Key requirements:
- **Geospatial queries**: Find nearby couriers, calculate delivery zones
- **Flexible schema**: Address formats vary across KSA cities
- **Arabic text support**: Store and search Arabic addresses
- **High write throughput**: Orders and location updates
- **JSON storage**: Nested documents (address, time windows, items)
- **Scalability**: Support growing merchant base

Options considered:
1. **MongoDB** - Document database with geospatial support
2. **PostgreSQL** - Relational database with PostGIS extension
3. **MySQL** - Relational database
4. **DynamoDB** - AWS NoSQL database

## Decision

We will use **MongoDB** as the primary database for Najah Delivery OS.

## Rationale

### Why MongoDB?

#### 1. Native Geospatial Support

MongoDB has **first-class geospatial indexing** with 2dsphere indexes:

```javascript
// Create 2dsphere index on courier location
db.couriers.createIndex({ currentLocation: "2dsphere" })

// Find couriers within 5km of order
db.couriers.find({
  currentLocation: {
    $near: {
      $geometry: { type: "Point", coordinates: [46.6753, 24.7136] },
      $maxDistance: 5000
    }
  },
  status: "available"
})
```

**Alternative: PostgreSQL + PostGIS**
- Requires extension installation
- More complex query syntax
- Less intuitive for developers
- Overkill for our use case

#### 2. Flexible Schema for Addresses

KSA addresses have **varying formats**:
- Some have postal codes, others don't
- District names in Arabic vary (الحي vs حي)
- Address components differ by city

MongoDB's flexible schema handles this elegantly:

```javascript
// Riyadh address (full components)
{
  address: {
    ar: "الرياض، حي العليا، شارع الملك فهد",
    en: "Riyadh, Al Olaya District, King Fahd Road",
    components: {
      street: "King Fahd Road",
      district: "Al Olaya",
      city: "Riyadh",
      postal_code: "12345"
    },
    coordinates: { lat: 24.7136, lng: 46.6753 }
  }
}

// Rural address (minimal components)
{
  address: {
    ar: "القصيم، عنيزة",
    en: "Qassim, Unayzah",
    coordinates: { lat: 26.0833, lng: 43.9833 }
  }
}
```

**Alternative: PostgreSQL**
- Requires nullable columns or JSONB for flexibility
- Schema migrations for address format changes
- Less natural fit for varying structures

#### 3. Excellent Arabic Text Support

MongoDB uses **UTF-8 by default** and has collation support for Arabic:

```javascript
// Create collection with Arabic collation
db.createCollection("orders", {
  collation: {
    locale: "ar",
    strength: 1  // Case-insensitive, accent-insensitive
  }
})

// Search Arabic addresses case-insensitively
db.orders.find({ "address.ar": /الرياض/i })
```

**Alternative: MySQL**
- UTF-8 support but requires careful configuration
- Collation issues with Arabic characters
- Full-text search on Arabic is complex

#### 4. JSON-Native Storage

Orders have **nested structures** (items array, time windows, address object):

```javascript
{
  _id: ObjectId("..."),
  merchantId: ObjectId("..."),
  address: { /* nested object */ },
  timeWindow: {
    start: ISODate("2024-01-16T09:00:00Z"),
    end: ISODate("2024-01-16T17:00:00Z")
  },
  items: [
    { name: "Product 1", quantity: 2, price: 99.99 },
    { name: "Product 2", quantity: 1, price: 149.99 }
  ],
  totalAmount: 349.97
}
```

MongoDB stores this naturally. PostgreSQL would require:
- JSONB columns (loses relational benefits)
- OR separate tables (orders, order_items) with joins

#### 5. Horizontal Scalability

MongoDB supports **sharding** out of the box:
- Shard by `merchantId` (merchant data stays together)
- Automatic data distribution
- Linear scalability as merchant count grows

**Alternative: PostgreSQL**
- Sharding is complex (Citus, pgpool)
- Vertical scaling easier (but limited)
- Good enough for MVP, but harder to scale later

#### 6. Developer Experience

**Mongoose ODM** provides excellent Node.js integration:

```javascript
const orderSchema = new mongoose.Schema({
  merchantId: { type: ObjectId, ref: 'Merchant', required: true },
  address: {
    ar: { type: String, required: true },
    en: { type: String, required: true },
    coordinates: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true }
    }
  }
});

// Validation, hooks, and virtuals built-in
orderSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Order = mongoose.model('Order', orderSchema);
```

**Alternative: PostgreSQL**
- Sequelize/TypeORM are good but more verbose
- Need migrations for schema changes
- Less intuitive for nested documents

#### 7. TTL Indexes for Auto-Cleanup

MongoDB has **TTL indexes** for automatic document expiration:

```javascript
// Sessions auto-delete after expiresAt
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// MongoDB automatically deletes expired sessions every 60 seconds
```

**Alternative: PostgreSQL**
- Requires cron job or background worker
- More complex to maintain
- Can miss deletions if worker fails

### MongoDB Limitations We Accept

1. **No Transactions Across Documents** (before 4.0)
   - Mitigation: MongoDB 4.0+ supports multi-document transactions
   - Reality: Most operations are single-document (order creation, status update)

2. **No Foreign Key Constraints**
   - Mitigation: Mongoose validation and application-level checks
   - Reality: Microservices should own their data integrity anyway

3. **Larger Storage Size** (than PostgreSQL)
   - Mitigation: Storage is cheap (AWS EBS)
   - Reality: Flexibility and performance worth the cost

4. **No Complex Joins**
   - Mitigation: Use `$lookup` for necessary joins
   - Reality: Denormalization preferred (embed merchant name in order)

## Comparison with Alternatives

### PostgreSQL + PostGIS

**Pros:**
- ✅ ACID transactions
- ✅ Foreign key constraints
- ✅ Complex joins
- ✅ Mature ecosystem

**Cons:**
- ❌ Requires PostGIS extension for geospatial
- ❌ Schema migrations for address changes
- ❌ JSONB for flexible documents loses relational benefits
- ❌ More complex geospatial queries
- ❌ Sharding is complex

**Verdict:** Good for transactional systems, overkill for document-centric delivery data.

### MySQL

**Pros:**
- ✅ Widely known
- ✅ Good performance
- ✅ ACID transactions

**Cons:**
- ❌ Limited geospatial support (vs. PostGIS)
- ❌ JSON support less mature than PostgreSQL
- ❌ Arabic text collation issues
- ❌ Schema rigidity

**Verdict:** Not recommended. PostgreSQL is superior if choosing SQL.

### DynamoDB

**Pros:**
- ✅ Fully managed (no ops)
- ✅ Auto-scaling
- ✅ Good for key-value access

**Cons:**
- ❌ No geospatial queries (must use another service)
- ❌ Complex query patterns (GSI design)
- ❌ Vendor lock-in (AWS only)
- ❌ Cost unpredictable at scale
- ❌ Limited local development (DynamoDB Local)

**Verdict:** Good for serverless, but geospatial limitations are deal-breaker.

## Data Model Examples

### Courier with Geospatial Location

```javascript
{
  _id: ObjectId("507f1f77bcf86cd799439015"),
  name: "Ahmed Al-Qarni",
  email: "ahmed.qarni@najahdelivery.sa",
  vehicle: "motorcycle",
  status: "available",
  currentLocation: {
    type: "Point",
    coordinates: [46.6753, 24.7136]  // [longitude, latitude]
  },
  shift: { start: "08:00", end: "16:00" },
  capacity: 15
}

// Index for geospatial queries
db.couriers.createIndex({ currentLocation: "2dsphere" })

// Find couriers near order
db.couriers.find({
  currentLocation: {
    $near: {
      $geometry: { type: "Point", coordinates: [46.7235, 24.7242] },
      $maxDistance: 5000
    }
  },
  status: "available"
})
```

### Order with Bilingual Address

```javascript
{
  _id: ObjectId("507f1f77bcf86cd799439013"),
  merchantId: ObjectId("507f1f77bcf86cd799439012"),
  status: "pending",
  address: {
    ar: "الرياض، حي النخيل، شارع الأمير محمد بن عبدالعزيز",
    en: "Riyadh, Al Nakheel District, Prince Mohammed Bin Abdulaziz St",
    components: {
      street: "Prince Mohammed Bin Abdulaziz St",
      district: "Al Nakheel",
      city: "Riyadh",
      postal_code: "12382"
    },
    coordinates: { lat: 24.7136, lng: 46.6753 }
  },
  timeWindow: {
    start: ISODate("2024-01-16T09:00:00Z"),
    end: ISODate("2024-01-16T17:00:00Z")
  },
  items: [
    { name: "Samsung Galaxy S23", quantity: 1, price: 3299.00 }
  ],
  totalAmount: 3299.00
}

// Indexes
db.orders.createIndex({ merchantId: 1, status: 1, createdAt: -1 })
db.orders.createIndex({ "address.coordinates.lat": 1, "address.coordinates.lng": 1 })
```

## Performance Considerations

### Query Performance

- **Indexed queries**: < 10ms (orders by merchant, couriers by status)
- **Geospatial queries**: < 50ms (find nearby couriers)
- **Full collection scans**: Avoided with proper indexing
- **Aggregation pipelines**: Used for analytics (< 500ms for 10K orders)

### Scaling Strategy

1. **Vertical scaling**: Increase MongoDB instance size (t3.large → t3.xlarge)
2. **Read replicas**: For read-heavy workloads
3. **Sharding**: By `merchantId` when > 1M orders

### Backup Strategy

- **Daily backups**: `mongodump` to S3
- **Point-in-time recovery**: MongoDB Atlas or custom solution
- **Retention**: 7 daily, 4 weekly, 12 monthly

## Implementation Details

### Connection Pooling

```javascript
mongoose.connect(process.env.MONGODB_URI, {
  maxPoolSize: 10,
  minPoolSize: 2,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000
});
```

### Replica Set (Production)

```yaml
# docker-compose.yml
mongodb:
  image: mongo:7
  command: --replSet rs0
  environment:
    MONGO_INITDB_ROOT_USERNAME: admin
    MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD}
```

### Monitoring

- Connection pool size
- Query latency (slow query log)
- Index usage (`db.orders.aggregate([{$indexStats:{}}])`)
- Disk usage and IOPS

## Risks and Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Data loss | Critical | Daily backups to S3, replica set in production |
| Slow queries | High | Proper indexing, query profiling, explain plans |
| Schema drift | Medium | Mongoose validation, migration scripts |
| Scaling limits | Low | Sharding strategy prepared, can shard by merchantId |
| Cost | Low | MongoDB Community Edition (free), AWS EBS for storage |

## Success Criteria

This decision is successful if:
- ✅ Geospatial queries respond in < 100ms
- ✅ Order creation completes in < 200ms
- ✅ Arabic addresses stored and searched correctly
- ✅ No data loss incidents
- ✅ Database can handle 1000 orders/hour
- ✅ Developers find MongoDB easy to work with

## Migration Path (If Needed)

If we outgrow MongoDB:
1. **MongoDB Atlas**: Managed service with auto-scaling
2. **Hybrid approach**: Keep geospatial data in MongoDB, move transactional data to PostgreSQL
3. **Migration tools**: Studio 3T, `mongodump` → PostgreSQL scripts

## Revisions

- **2024-01-15**: Initial decision (v1.0)

## References

- [MongoDB Geospatial Queries](https://www.mongodb.com/docs/manual/geospatial-queries/)
- [MongoDB vs PostgreSQL for Geospatial](https://www.mongodb.com/compare/mongodb-postgresql)
- [Mongoose Documentation](https://mongoosejs.com/)
- [MongoDB Best Practices](https://www.mongodb.com/docs/manual/core/data-modeling-introduction/)

## Related ADRs

- [ADR-0001: Monorepo Structure](ADR-0001-monorepo.md)
- [ADR-0003: OSRM for Routing](ADR-0003-routing-engine.md)
