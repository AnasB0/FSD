#!/bin/bash
set -e

echo "Seeding Najah Delivery API database..."

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '#' | xargs)
fi

# MongoDB URI
MONGO_URI=${MONGODB_URI:-mongodb://localhost:27017/najah_delivery}

echo "Connected to: $MONGO_URI"

# Seed Admin User
echo "Creating admin user..."
mongosh "$MONGO_URI" --eval '
db.users.insertOne({
  username: "admin",
  email: "admin@najahdelivery.com",
  passwordHash: "$2b$10$exampleHashValue",
  role: "admin",
  status: "active",
  createdAt: new Date(),
  updatedAt: new Date()
});
'

# Seed Sample Merchant
echo "Creating sample merchant..."
mongosh "$MONGO_URI" --eval '
db.merchants.insertOne({
  name: "Test Restaurant",
  email: "restaurant@example.com",
  phone: "+966501234567",
  businessType: "restaurant",
  address: {
    ar: "الرياض، المملكة العربية السعودية",
    en: "Riyadh, Saudi Arabia",
    location: {
      type: "Point",
      coordinates: [46.6753, 24.7136]
    },
    city: "Riyadh",
    district: "Al Olaya"
  },
  status: "active",
  settings: {
    autoAcceptOrders: true,
    maxDailyOrders: 50
  },
  createdAt: new Date(),
  updatedAt: new Date()
});
'

# Seed Sample Courier
echo "Creating sample courier..."
mongosh "$MONGO_URI" --eval '
db.couriers.insertOne({
  name: "Ahmed Ali",
  email: "ahmed@courier.com",
  phone: "+966501234568",
  vehicle: {
    type: "motorcycle",
    plateNumber: "ABC-1234",
    capacity: {
      orders: 10
    }
  },
  status: "available",
  location: {
    type: "Point",
    coordinates: [46.6753, 24.7136],
    lastUpdated: new Date()
  },
  shift: {
    start: "08:00",
    end: "17:00",
    workingDays: ["sunday", "monday", "tuesday", "wednesday", "thursday"]
  },
  stats: {
    totalDeliveries: 0,
    successfulDeliveries: 0,
    failedDeliveries: 0,
    averageRating: 0
  },
  createdAt: new Date(),
  updatedAt: new Date()
});
'

echo "Seeding completed successfully!"
