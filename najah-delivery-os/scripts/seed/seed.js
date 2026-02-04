/**
 * Seed Script for Najah Delivery OS
 * 
 * This script populates the MongoDB database with sample data for:
 * - 3 Merchants (Riyadh, Jeddah, Dammam)
 * - 10 Couriers with shifts across KSA cities
 * - 20+ Orders with Arabic/English addresses
 * - Sample route plans
 * 
 * Usage:
 *   node scripts/seed/seed.js
 *   or via Docker: docker compose exec express-api node scripts/seed/seed.js
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
require('dotenv').config();

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://admin:admin123@localhost:27017/najah-delivery?authSource=admin';

// Define minimal schemas (inline for seed script)
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  role: { type: String, enum: ['admin', 'merchant', 'ops', 'driver', 'customer'], required: true },
  phone: String,
  createdAt: { type: Date, default: Date.now }
});

const MerchantSchema = new mongoose.Schema({
  name: { type: String, required: true },
  name_ar: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  api_key: { type: String, unique: true },
  webhook_url: String,
  webhook_secret: String,
  address: {
    street: String,
    street_ar: String,
    city: String,
    city_ar: String,
    district: String,
    district_ar: String,
    postal_code: String,
    country: { type: String, default: 'SA' }
  },
  geo: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [46.6753, 24.7136] } // [lng, lat]
  },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  createdAt: { type: Date, default: Date.now }
});
MerchantSchema.index({ geo: '2dsphere' });

const CourierSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  vehicle_type: { type: String, enum: ['bike', 'car', 'van', 'truck'], required: true },
  vehicle_plate: String,
  license_number: String,
  current_location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [46.6753, 24.7136] }
  },
  shift: {
    start_time: String,
    end_time: String,
    days: [String]
  },
  capacity: { type: Number, default: 10 },
  status: { type: String, enum: ['available', 'busy', 'offline'], default: 'available' },
  createdAt: { type: Date, default: Date.now }
});
CourierSchema.index({ current_location: '2dsphere' });

const OrderSchema = new mongoose.Schema({
  merchant: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant' },
  order_number: { type: String, required: true, unique: true },
  customer: {
    name: String,
    name_ar: String,
    phone: String,
    email: String
  },
  items: [{
    name: String,
    name_ar: String,
    quantity: Number,
    price: Number,
    sku: String
  }],
  delivery_address: {
    street: String,
    street_ar: String,
    building: String,
    floor: String,
    apartment: String,
    city: String,
    city_ar: String,
    district: String,
    district_ar: String,
    postal_code: String,
    country: { type: String, default: 'SA' },
    notes: String,
    notes_ar: String,
    geo: {
      type: { type: String, enum: ['Point'] },
      coordinates: [Number]
    }
  },
  pickup_address: {
    street: String,
    street_ar: String,
    city: String,
    city_ar: String,
    geo: {
      type: { type: String, enum: ['Point'] },
      coordinates: [Number]
    }
  },
  status: { 
    type: String, 
    enum: ['pending', 'confirmed', 'normalized', 'assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled'],
    default: 'pending'
  },
  priority: { type: String, enum: ['standard', 'express', 'same_day'], default: 'standard' },
  total_amount: Number,
  delivery_fee: Number,
  time_window: {
    start: Date,
    end: Date
  },
  createdAt: { type: Date, default: Date.now }
});
OrderSchema.index({ 'delivery_address.geo': '2dsphere' });

const RoutePlanSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  courier: { type: mongoose.Schema.Types.ObjectId, ref: 'Courier' },
  orders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order' }],
  route_sequence: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order' }],
  metrics: {
    total_distance_km: Number,
    estimated_duration_min: Number,
    total_orders: Number,
    completed_orders: Number
  },
  status: { type: String, enum: ['planned', 'in_progress', 'completed', 'cancelled'], default: 'planned' },
  createdAt: { type: Date, default: Date.now }
});

// Register models
const User = mongoose.model('User', UserSchema);
const Merchant = mongoose.model('Merchant', MerchantSchema);
const Courier = mongoose.model('Courier', CourierSchema);
const Order = mongoose.model('Order', OrderSchema);
const RoutePlan = mongoose.model('RoutePlan', RoutePlanSchema);

// Sample data
const RIYADH_CENTER = [46.6753, 24.7136];
const JEDDAH_CENTER = [39.1925, 21.5433];
const DAMMAM_CENTER = [50.0982, 26.4207];

async function seedDatabase() {
  console.log('🌱 Starting database seed...\n');

  try {
    // Connect to MongoDB
    console.log(`📡 Connecting to MongoDB: ${MONGODB_URI.replace(/\/\/.*@/, '//***@')}`);
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await User.deleteMany({});
    await Merchant.deleteMany({});
    await Courier.deleteMany({});
    await Order.deleteMany({});
    await RoutePlan.deleteMany({});
    console.log('✅ Cleared existing data\n');

    // Create users
    console.log('👤 Creating users...');
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const adminUser = await User.create({
      email: 'admin@najah.sa',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      phone: '+966501234567'
    });

    const merchantUser = await User.create({
      email: 'merchant@najah.sa',
      password: hashedPassword,
      firstName: 'Merchant',
      lastName: 'User',
      role: 'merchant',
      phone: '+966501234568'
    });

    const driverUser = await User.create({
      email: 'driver@najah.sa',
      password: hashedPassword,
      firstName: 'Driver',
      lastName: 'User',
      role: 'driver',
      phone: '+966501234569'
    });

    console.log(`✅ Created ${3} users\n`);

    // Create merchants
    console.log('🏪 Creating merchants...');
    const merchants = await Merchant.insertMany([
      {
        name: 'Riyadh Electronics Store',
        name_ar: 'متجر إلكترونيات الرياض',
        email: 'info@riyadhelectronics.sa',
        phone: '+966112345678',
        api_key: crypto.randomBytes(32).toString('hex'),
        webhook_secret: crypto.randomBytes(16).toString('hex'),
        address: {
          street: 'King Fahd Road',
          street_ar: 'طريق الملك فهد',
          city: 'Riyadh',
          city_ar: 'الرياض',
          district: 'Olaya',
          district_ar: 'العليا',
          postal_code: '11564',
          country: 'SA'
        },
        geo: {
          type: 'Point',
          coordinates: RIYADH_CENTER
        }
      },
      {
        name: 'Jeddah Foods Market',
        name_ar: 'سوق أغذية جدة',
        email: 'contact@jeddahfoods.sa',
        phone: '+966122345678',
        api_key: crypto.randomBytes(32).toString('hex'),
        webhook_secret: crypto.randomBytes(16).toString('hex'),
        address: {
          street: 'Palestine Street',
          street_ar: 'شارع فلسطين',
          city: 'Jeddah',
          city_ar: 'جدة',
          district: 'Al Zahra',
          district_ar: 'الزهراء',
          postal_code: '23442',
          country: 'SA'
        },
        geo: {
          type: 'Point',
          coordinates: JEDDAH_CENTER
        }
      },
      {
        name: 'Dammam Pharmacy Plus',
        name_ar: 'صيدلية الدمام بلس',
        email: 'hello@dammampharmacy.sa',
        phone: '+966132345678',
        api_key: crypto.randomBytes(32).toString('hex'),
        webhook_secret: crypto.randomBytes(16).toString('hex'),
        address: {
          street: 'King Saud Road',
          street_ar: 'طريق الملك سعود',
          city: 'Dammam',
          city_ar: 'الدمام',
          district: 'Al Faisaliyah',
          district_ar: 'الفيصلية',
          postal_code: '32241',
          country: 'SA'
        },
        geo: {
          type: 'Point',
          coordinates: DAMMAM_CENTER
        }
      }
    ]);
    console.log(`✅ Created ${merchants.length} merchants\n`);

    // Create couriers
    console.log('🚗 Creating couriers...');
    const couriers = await Courier.insertMany([
      {
        firstName: 'Ahmed',
        lastName: 'Al-Rashid',
        phone: '+966501111111',
        email: 'ahmed.rashid@najah.sa',
        vehicle_type: 'car',
        vehicle_plate: 'ABC 1234',
        license_number: 'DL123456',
        current_location: { type: 'Point', coordinates: [46.6753, 24.7136] },
        shift: { start_time: '08:00', end_time: '16:00', days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'] },
        capacity: 15,
        status: 'available'
      },
      {
        firstName: 'Mohammed',
        lastName: 'Al-Zahrani',
        phone: '+966501111112',
        email: 'mohammed.zahrani@najah.sa',
        vehicle_type: 'van',
        vehicle_plate: 'DEF 5678',
        license_number: 'DL123457',
        current_location: { type: 'Point', coordinates: [46.6800, 24.7200] },
        shift: { start_time: '09:00', end_time: '17:00', days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'] },
        capacity: 25,
        status: 'available'
      },
      {
        firstName: 'Khalid',
        lastName: 'Al-Mutairi',
        phone: '+966501111113',
        email: 'khalid.mutairi@najah.sa',
        vehicle_type: 'bike',
        vehicle_plate: 'GHI 9012',
        license_number: 'DL123458',
        current_location: { type: 'Point', coordinates: [46.6700, 24.7100] },
        shift: { start_time: '10:00', end_time: '18:00', days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'] },
        capacity: 5,
        status: 'available'
      },
      {
        firstName: 'Fahad',
        lastName: 'Al-Otaibi',
        phone: '+966501111114',
        email: 'fahad.otaibi@najah.sa',
        vehicle_type: 'car',
        vehicle_plate: 'JKL 3456',
        license_number: 'DL123459',
        current_location: { type: 'Point', coordinates: [39.1925, 21.5433] },
        shift: { start_time: '08:00', end_time: '16:00', days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'] },
        capacity: 15,
        status: 'available'
      },
      {
        firstName: 'Salem',
        lastName: 'Al-Ghamdi',
        phone: '+966501111115',
        email: 'salem.ghamdi@najah.sa',
        vehicle_type: 'van',
        vehicle_plate: 'MNO 7890',
        license_number: 'DL123460',
        current_location: { type: 'Point', coordinates: [39.2000, 21.5500] },
        shift: { start_time: '09:00', end_time: '17:00', days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'] },
        capacity: 25,
        status: 'available'
      },
      {
        firstName: 'Abdulrahman',
        lastName: 'Al-Harbi',
        phone: '+966501111116',
        email: 'abdulrahman.harbi@najah.sa',
        vehicle_type: 'car',
        vehicle_plate: 'PQR 1234',
        license_number: 'DL123461',
        current_location: { type: 'Point', coordinates: [50.0982, 26.4207] },
        shift: { start_time: '08:00', end_time: '16:00', days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'] },
        capacity: 15,
        status: 'available'
      },
      {
        firstName: 'Turki',
        lastName: 'Al-Shamrani',
        phone: '+966501111117',
        email: 'turki.shamrani@najah.sa',
        vehicle_type: 'bike',
        vehicle_plate: 'STU 5678',
        license_number: 'DL123462',
        current_location: { type: 'Point', coordinates: [50.1000, 26.4300] },
        shift: { start_time: '10:00', end_time: '18:00', days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'] },
        capacity: 5,
        status: 'available'
      },
      {
        firstName: 'Nasser',
        lastName: 'Al-Qahtani',
        phone: '+966501111118',
        email: 'nasser.qahtani@najah.sa',
        vehicle_type: 'van',
        vehicle_plate: 'VWX 9012',
        license_number: 'DL123463',
        current_location: { type: 'Point', coordinates: [46.6600, 24.7000] },
        shift: { start_time: '07:00', end_time: '15:00', days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'] },
        capacity: 25,
        status: 'available'
      },
      {
        firstName: 'Saud',
        lastName: 'Al-Dosari',
        phone: '+966501111119',
        email: 'saud.dosari@najah.sa',
        vehicle_type: 'truck',
        vehicle_plate: 'YZA 3456',
        license_number: 'DL123464',
        current_location: { type: 'Point', coordinates: [39.1800, 21.5300] },
        shift: { start_time: '06:00', end_time: '14:00', days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'] },
        capacity: 40,
        status: 'available'
      },
      {
        firstName: 'Faisal',
        lastName: 'Al-Shehri',
        phone: '+966501111120',
        email: 'faisal.shehri@najah.sa',
        vehicle_type: 'car',
        vehicle_plate: 'BCD 7890',
        license_number: 'DL123465',
        current_location: { type: 'Point', coordinates: [50.0900, 26.4100] },
        shift: { start_time: '11:00', end_time: '19:00', days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'] },
        capacity: 15,
        status: 'available'
      }
    ]);
    console.log(`✅ Created ${couriers.length} couriers\n`);

    // Create orders
    console.log('📦 Creating orders...');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);

    const orders = await Order.insertMany([
      // Riyadh orders
      {
        merchant: merchants[0]._id,
        order_number: 'ORD-RYD-001',
        customer: { name: 'Khalid Al-Mansour', name_ar: 'خالد المنصور', phone: '+966502222221', email: 'khalid@email.com' },
        items: [{ name: 'Laptop Dell XPS', name_ar: 'لابتوب ديل إكس بي إس', quantity: 1, price: 4500, sku: 'LAPTOP-001' }],
        delivery_address: {
          street: 'King Abdullah Road',
          street_ar: 'طريق الملك عبدالله',
          building: '123',
          floor: '3',
          apartment: '301',
          city: 'Riyadh',
          city_ar: 'الرياض',
          district: 'Al Malqa',
          district_ar: 'الملقا',
          postal_code: '13521',
          country: 'SA',
          notes: 'Please call upon arrival',
          notes_ar: 'يرجى الاتصال عند الوصول',
          geo: { type: 'Point', coordinates: [46.6400, 24.7700] }
        },
        pickup_address: {
          street: 'King Fahd Road',
          street_ar: 'طريق الملك فهد',
          city: 'Riyadh',
          city_ar: 'الرياض',
          geo: { type: 'Point', coordinates: RIYADH_CENTER }
        },
        status: 'confirmed',
        priority: 'express',
        total_amount: 4500,
        delivery_fee: 25,
        time_window: { start: tomorrow, end: new Date(tomorrow.getTime() + 4 * 60 * 60 * 1000) }
      },
      {
        merchant: merchants[0]._id,
        order_number: 'ORD-RYD-002',
        customer: { name: 'Fatima Al-Subaie', name_ar: 'فاطمة السبيعي', phone: '+966502222222', email: 'fatima@email.com' },
        items: [{ name: 'Smartphone Samsung Galaxy', name_ar: 'هاتف ذكي سامسونج جالاكسي', quantity: 1, price: 2800, sku: 'PHONE-001' }],
        delivery_address: {
          street: 'Northern Ring Road',
          street_ar: 'طريق الدائري الشمالي',
          building: '456',
          city: 'Riyadh',
          city_ar: 'الرياض',
          district: 'Al Narjis',
          district_ar: 'النرجس',
          postal_code: '13325',
          country: 'SA',
          geo: { type: 'Point', coordinates: [46.6100, 24.8100] }
        },
        pickup_address: {
          street: 'King Fahd Road',
          street_ar: 'طريق الملك فهد',
          city: 'Riyadh',
          city_ar: 'الرياض',
          geo: { type: 'Point', coordinates: RIYADH_CENTER }
        },
        status: 'confirmed',
        priority: 'standard',
        total_amount: 2800,
        delivery_fee: 20,
        time_window: { start: tomorrow, end: new Date(tomorrow.getTime() + 6 * 60 * 60 * 1000) }
      },
      {
        merchant: merchants[0]._id,
        order_number: 'ORD-RYD-003',
        customer: { name: 'Abdullah Al-Harbi', name_ar: 'عبدالله الحربي', phone: '+966502222223' },
        items: [{ name: 'Wireless Headphones Sony', name_ar: 'سماعات لاسلكية سوني', quantity: 2, price: 450, sku: 'AUDIO-001' }],
        delivery_address: {
          street: 'Makkah Road',
          street_ar: 'طريق مكة',
          building: '789',
          city: 'Riyadh',
          city_ar: 'الرياض',
          district: 'Al Suwaidi',
          district_ar: 'السويدي',
          postal_code: '12790',
          country: 'SA',
          geo: { type: 'Point', coordinates: [46.7000, 24.6500] }
        },
        pickup_address: {
          street: 'King Fahd Road',
          street_ar: 'طريق الملك فهد',
          city: 'Riyadh',
          city_ar: 'الرياض',
          geo: { type: 'Point', coordinates: RIYADH_CENTER }
        },
        status: 'confirmed',
        priority: 'standard',
        total_amount: 900,
        delivery_fee: 20,
        time_window: { start: tomorrow, end: new Date(tomorrow.getTime() + 6 * 60 * 60 * 1000) }
      },
      {
        merchant: merchants[0]._id,
        order_number: 'ORD-RYD-004',
        customer: { name: 'Sara Al-Mutairi', name_ar: 'سارة المطيري', phone: '+966502222224' },
        items: [{ name: 'Gaming Console PS5', name_ar: 'جهاز ألعاب بلايستيشن ٥', quantity: 1, price: 2200, sku: 'GAMING-001' }],
        delivery_address: {
          street: 'King Khalid Road',
          street_ar: 'طريق الملك خالد',
          building: '234',
          city: 'Riyadh',
          city_ar: 'الرياض',
          district: 'Al Aqiq',
          district_ar: 'العقيق',
          postal_code: '13511',
          country: 'SA',
          geo: { type: 'Point', coordinates: [46.6200, 24.7400] }
        },
        pickup_address: {
          street: 'King Fahd Road',
          street_ar: 'طريق الملك فهد',
          city: 'Riyadh',
          city_ar: 'الرياض',
          geo: { type: 'Point', coordinates: RIYADH_CENTER }
        },
        status: 'confirmed',
        priority: 'same_day',
        total_amount: 2200,
        delivery_fee: 30,
        time_window: { start: tomorrow, end: new Date(tomorrow.getTime() + 3 * 60 * 60 * 1000) }
      },
      {
        merchant: merchants[0]._id,
        order_number: 'ORD-RYD-005',
        customer: { name: 'Omar Al-Qahtani', name_ar: 'عمر القحطاني', phone: '+966502222225' },
        items: [{ name: 'Smart Watch Apple', name_ar: 'ساعة ذكية أبل', quantity: 1, price: 1800, sku: 'WATCH-001' }],
        delivery_address: {
          street: 'Eastern Ring Road',
          street_ar: 'طريق الدائري الشرقي',
          building: '567',
          city: 'Riyadh',
          city_ar: 'الرياض',
          district: 'Al Yasmin',
          district_ar: 'الياسمين',
          postal_code: '13326',
          country: 'SA',
          geo: { type: 'Point', coordinates: [46.7500, 24.7300] }
        },
        pickup_address: {
          street: 'King Fahd Road',
          street_ar: 'طريق الملك فهد',
          city: 'Riyadh',
          city_ar: 'الرياض',
          geo: { type: 'Point', coordinates: RIYADH_CENTER }
        },
        status: 'confirmed',
        priority: 'standard',
        total_amount: 1800,
        delivery_fee: 20,
        time_window: { start: tomorrow, end: new Date(tomorrow.getTime() + 6 * 60 * 60 * 1000) }
      },
      // Jeddah orders
      {
        merchant: merchants[1]._id,
        order_number: 'ORD-JED-001',
        customer: { name: 'Layla Al-Ghamdi', name_ar: 'ليلى الغامدي', phone: '+966503333331' },
        items: [
          { name: 'Fresh Vegetables Box', name_ar: 'صندوق خضروات طازجة', quantity: 1, price: 120, sku: 'VEG-001' },
          { name: 'Fruits Basket', name_ar: 'سلة فواكه', quantity: 1, price: 150, sku: 'FRUIT-001' }
        ],
        delivery_address: {
          street: 'Prince Mohammed Bin Abdulaziz Street',
          street_ar: 'شارع الأمير محمد بن عبدالعزيز',
          building: '890',
          city: 'Jeddah',
          city_ar: 'جدة',
          district: 'Al Rawdah',
          district_ar: 'الروضة',
          postal_code: '23432',
          country: 'SA',
          geo: { type: 'Point', coordinates: [39.1700, 21.5700] }
        },
        pickup_address: {
          street: 'Palestine Street',
          street_ar: 'شارع فلسطين',
          city: 'Jeddah',
          city_ar: 'جدة',
          geo: { type: 'Point', coordinates: JEDDAH_CENTER }
        },
        status: 'confirmed',
        priority: 'express',
        total_amount: 270,
        delivery_fee: 25,
        time_window: { start: tomorrow, end: new Date(tomorrow.getTime() + 3 * 60 * 60 * 1000) }
      },
      {
        merchant: merchants[1]._id,
        order_number: 'ORD-JED-002',
        customer: { name: 'Yousef Al-Zahrani', name_ar: 'يوسف الزهراني', phone: '+966503333332' },
        items: [
          { name: 'Rice 10kg', name_ar: 'أرز ١٠ كيلو', quantity: 2, price: 80, sku: 'RICE-001' },
          { name: 'Cooking Oil 2L', name_ar: 'زيت طبخ ٢ لتر', quantity: 3, price: 35, sku: 'OIL-001' }
        ],
        delivery_address: {
          street: 'Tahlia Street',
          street_ar: 'شارع التحلية',
          building: '321',
          city: 'Jeddah',
          city_ar: 'جدة',
          district: 'Al Hamra',
          district_ar: 'الحمراء',
          postal_code: '23323',
          country: 'SA',
          geo: { type: 'Point', coordinates: [39.1500, 21.5600] }
        },
        pickup_address: {
          street: 'Palestine Street',
          street_ar: 'شارع فلسطين',
          city: 'Jeddah',
          city_ar: 'جدة',
          geo: { type: 'Point', coordinates: JEDDAH_CENTER }
        },
        status: 'confirmed',
        priority: 'standard',
        total_amount: 265,
        delivery_fee: 20,
        time_window: { start: tomorrow, end: new Date(tomorrow.getTime() + 6 * 60 * 60 * 1000) }
      },
      {
        merchant: merchants[1]._id,
        order_number: 'ORD-JED-003',
        customer: { name: 'Maha Al-Shehri', name_ar: 'مها الشهري', phone: '+966503333333' },
        items: [
          { name: 'Chicken 2kg', name_ar: 'دجاج ٢ كيلو', quantity: 1, price: 45, sku: 'MEAT-001' },
          { name: 'Fresh Bread', name_ar: 'خبز طازج', quantity: 5, price: 5, sku: 'BREAD-001' }
        ],
        delivery_address: {
          street: 'Corniche Road',
          street_ar: 'طريق الكورنيش',
          building: '654',
          city: 'Jeddah',
          city_ar: 'جدة',
          district: 'Al Shatea',
          district_ar: 'الشاطئ',
          postal_code: '23511',
          country: 'SA',
          geo: { type: 'Point', coordinates: [39.1100, 21.5200] }
        },
        pickup_address: {
          street: 'Palestine Street',
          street_ar: 'شارع فلسطين',
          city: 'Jeddah',
          city_ar: 'جدة',
          geo: { type: 'Point', coordinates: JEDDAH_CENTER }
        },
        status: 'confirmed',
        priority: 'standard',
        total_amount: 70,
        delivery_fee: 15,
        time_window: { start: tomorrow, end: new Date(tomorrow.getTime() + 6 * 60 * 60 * 1000) }
      },
      {
        merchant: merchants[1]._id,
        order_number: 'ORD-JED-004',
        customer: { name: 'Hassan Al-Otaibi', name_ar: 'حسن العتيبي', phone: '+966503333334' },
        items: [
          { name: 'Dairy Products Pack', name_ar: 'حزمة منتجات الألبان', quantity: 1, price: 95, sku: 'DAIRY-001' }
        ],
        delivery_address: {
          street: 'Madinah Road',
          street_ar: 'طريق المدينة',
          building: '147',
          city: 'Jeddah',
          city_ar: 'جدة',
          district: 'Al Naeem',
          district_ar: 'النعيم',
          postal_code: '23621',
          country: 'SA',
          geo: { type: 'Point', coordinates: [39.2200, 21.5900] }
        },
        pickup_address: {
          street: 'Palestine Street',
          street_ar: 'شارع فلسطين',
          city: 'Jeddah',
          city_ar: 'جدة',
          geo: { type: 'Point', coordinates: JEDDAH_CENTER }
        },
        status: 'confirmed',
        priority: 'standard',
        total_amount: 95,
        delivery_fee: 20,
        time_window: { start: tomorrow, end: new Date(tomorrow.getTime() + 6 * 60 * 60 * 1000) }
      },
      {
        merchant: merchants[1]._id,
        order_number: 'ORD-JED-005',
        customer: { name: 'Nora Al-Dossary', name_ar: 'نورة الدوسري', phone: '+966503333335' },
        items: [
          { name: 'Snacks Variety Pack', name_ar: 'حزمة وجبات خفيفة متنوعة', quantity: 2, price: 60, sku: 'SNACK-001' }
        ],
        delivery_address: {
          street: 'King Abdulaziz Road',
          street_ar: 'طريق الملك عبدالعزيز',
          building: '258',
          city: 'Jeddah',
          city_ar: 'جدة',
          district: 'Al Salamah',
          district_ar: 'السلامة',
          postal_code: '23525',
          country: 'SA',
          geo: { type: 'Point', coordinates: [39.2000, 21.5500] }
        },
        pickup_address: {
          street: 'Palestine Street',
          street_ar: 'شارع فلسطين',
          city: 'Jeddah',
          city_ar: 'جدة',
          geo: { type: 'Point', coordinates: JEDDAH_CENTER }
        },
        status: 'confirmed',
        priority: 'standard',
        total_amount: 120,
        delivery_fee: 20,
        time_window: { start: tomorrow, end: new Date(tomorrow.getTime() + 6 * 60 * 60 * 1000) }
      },
      // Dammam orders
      {
        merchant: merchants[2]._id,
        order_number: 'ORD-DAM-001',
        customer: { name: 'Ibrahim Al-Shamrani', name_ar: 'إبراهيم الشمراني', phone: '+966504444441' },
        items: [
          { name: 'Blood Pressure Monitor', name_ar: 'جهاز قياس ضغط الدم', quantity: 1, price: 280, sku: 'MED-001' },
          { name: 'First Aid Kit', name_ar: 'حقيبة إسعافات أولية', quantity: 1, price: 120, sku: 'MED-002' }
        ],
        delivery_address: {
          street: 'King Faisal Road',
          street_ar: 'طريق الملك فيصل',
          building: '369',
          city: 'Dammam',
          city_ar: 'الدمام',
          district: 'Al Faisaliyah',
          district_ar: 'الفيصلية',
          postal_code: '32241',
          country: 'SA',
          geo: { type: 'Point', coordinates: [50.1100, 26.4300] }
        },
        pickup_address: {
          street: 'King Saud Road',
          street_ar: 'طريق الملك سعود',
          city: 'Dammam',
          city_ar: 'الدمام',
          geo: { type: 'Point', coordinates: DAMMAM_CENTER }
        },
        status: 'confirmed',
        priority: 'express',
        total_amount: 400,
        delivery_fee: 25,
        time_window: { start: tomorrow, end: new Date(tomorrow.getTime() + 3 * 60 * 60 * 1000) }
      },
      {
        merchant: merchants[2]._id,
        order_number: 'ORD-DAM-002',
        customer: { name: 'Aisha Al-Harbi', name_ar: 'عائشة الحربي', phone: '+966504444442' },
        items: [
          { name: 'Vitamin D Supplements', name_ar: 'مكملات فيتامين د', quantity: 2, price: 85, sku: 'SUPP-001' },
          { name: 'Omega-3 Capsules', name_ar: 'كبسولات أوميغا ٣', quantity: 1, price: 120, sku: 'SUPP-002' }
        ],
        delivery_address: {
          street: 'Dhahran Street',
          street_ar: 'شارع الظهران',
          building: '741',
          city: 'Dammam',
          city_ar: 'الدمام',
          district: 'Al Mazruiyah',
          district_ar: 'المزروعية',
          postal_code: '32414',
          country: 'SA',
          geo: { type: 'Point', coordinates: [50.0800, 26.4100] }
        },
        pickup_address: {
          street: 'King Saud Road',
          street_ar: 'طريق الملك سعود',
          city: 'Dammam',
          city_ar: 'الدمام',
          geo: { type: 'Point', coordinates: DAMMAM_CENTER }
        },
        status: 'confirmed',
        priority: 'standard',
        total_amount: 290,
        delivery_fee: 20,
        time_window: { start: tomorrow, end: new Date(tomorrow.getTime() + 6 * 60 * 60 * 1000) }
      },
      {
        merchant: merchants[2]._id,
        order_number: 'ORD-DAM-003',
        customer: { name: 'Mansour Al-Qahtani', name_ar: 'منصور القحطاني', phone: '+966504444443' },
        items: [
          { name: 'Pain Relief Medication', name_ar: 'دواء مسكن للألم', quantity: 3, price: 45, sku: 'MED-003' }
        ],
        delivery_address: {
          street: 'Al Khobar Highway',
          street_ar: 'طريق الخبر السريع',
          building: '852',
          city: 'Dammam',
          city_ar: 'الدمام',
          district: 'Al Shati',
          district_ar: 'الشاطئ',
          postal_code: '32612',
          country: 'SA',
          geo: { type: 'Point', coordinates: [50.1500, 26.4500] }
        },
        pickup_address: {
          street: 'King Saud Road',
          street_ar: 'طريق الملك سعود',
          city: 'Dammam',
          city_ar: 'الدمام',
          geo: { type: 'Point', coordinates: DAMMAM_CENTER }
        },
        status: 'confirmed',
        priority: 'standard',
        total_amount: 135,
        delivery_fee: 20,
        time_window: { start: tomorrow, end: new Date(tomorrow.getTime() + 6 * 60 * 60 * 1000) }
      },
      {
        merchant: merchants[2]._id,
        order_number: 'ORD-DAM-004',
        customer: { name: 'Fatimah Al-Mutairi', name_ar: 'فاطمة المطيري', phone: '+966504444444' },
        items: [
          { name: 'Digital Thermometer', name_ar: 'ميزان حرارة رقمي', quantity: 2, price: 75, sku: 'MED-004' },
          { name: 'Face Masks Pack', name_ar: 'حزمة كمامات', quantity: 1, price: 30, sku: 'MED-005' }
        ],
        delivery_address: {
          street: 'Prince Naif Street',
          street_ar: 'شارع الأمير نايف',
          building: '963',
          city: 'Dammam',
          city_ar: 'الدمام',
          district: 'Al Adamah',
          district_ar: 'الأضامة',
          postal_code: '32256',
          country: 'SA',
          geo: { type: 'Point', coordinates: [50.0600, 26.3900] }
        },
        pickup_address: {
          street: 'King Saud Road',
          street_ar: 'طريق الملك سعود',
          city: 'Dammam',
          city_ar: 'الدمام',
          geo: { type: 'Point', coordinates: DAMMAM_CENTER }
        },
        status: 'confirmed',
        priority: 'standard',
        total_amount: 180,
        delivery_fee: 20,
        time_window: { start: tomorrow, end: new Date(tomorrow.getTime() + 6 * 60 * 60 * 1000) }
      },
      {
        merchant: merchants[2]._id,
        order_number: 'ORD-DAM-005',
        customer: { name: 'Tariq Al-Ghamdi', name_ar: 'طارق الغامدي', phone: '+966504444445' },
        items: [
          { name: 'Blood Glucose Meter', name_ar: 'جهاز قياس السكر', quantity: 1, price: 350, sku: 'MED-006' }
        ],
        delivery_address: {
          street: 'Imam Ali Ibn Abi Talib Street',
          street_ar: 'شارع الإمام علي بن أبي طالب',
          building: '159',
          city: 'Dammam',
          city_ar: 'الدمام',
          district: 'Al Jalawiyah',
          district_ar: 'الجلوية',
          postal_code: '32245',
          country: 'SA',
          geo: { type: 'Point', coordinates: [50.1200, 26.4400] }
        },
        pickup_address: {
          street: 'King Saud Road',
          street_ar: 'طريق الملك سعود',
          city: 'Dammam',
          city_ar: 'الدمام',
          geo: { type: 'Point', coordinates: DAMMAM_CENTER }
        },
        status: 'confirmed',
        priority: 'standard',
        total_amount: 350,
        delivery_fee: 20,
        time_window: { start: tomorrow, end: new Date(tomorrow.getTime() + 6 * 60 * 60 * 1000) }
      }
    ]);
    console.log(`✅ Created ${orders.length} orders\n`);

    // Create sample route plans
    console.log('🗺️  Creating route plans...');
    const routePlans = await RoutePlan.insertMany([
      {
        date: tomorrow,
        courier: couriers[0]._id,
        orders: [orders[0]._id, orders[1]._id, orders[2]._id],
        route_sequence: [orders[0]._id, orders[2]._id, orders[1]._id],
        metrics: {
          total_distance_km: 35.2,
          estimated_duration_min: 95,
          total_orders: 3,
          completed_orders: 0
        },
        status: 'planned'
      },
      {
        date: tomorrow,
        courier: couriers[3]._id,
        orders: [orders[5]._id, orders[6]._id, orders[7]._id],
        route_sequence: [orders[5]._id, orders[7]._id, orders[6]._id],
        metrics: {
          total_distance_km: 28.7,
          estimated_duration_min: 75,
          total_orders: 3,
          completed_orders: 0
        },
        status: 'planned'
      },
      {
        date: tomorrow,
        courier: couriers[5]._id,
        orders: [orders[10]._id, orders[11]._id],
        route_sequence: [orders[10]._id, orders[11]._id],
        metrics: {
          total_distance_km: 18.3,
          estimated_duration_min: 50,
          total_orders: 2,
          completed_orders: 0
        },
        status: 'planned'
      }
    ]);
    console.log(`✅ Created ${routePlans.length} route plans\n`);

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('🎉 SEED COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log(`\n📊 Summary:`);
    console.log(`   - Users: 3`);
    console.log(`   - Merchants: ${merchants.length}`);
    console.log(`   - Couriers: ${couriers.length}`);
    console.log(`   - Orders: ${orders.length}`);
    console.log(`   - Route Plans: ${routePlans.length}`);
    
    console.log(`\n🔐 Test Credentials:`);
    console.log(`   Admin:    admin@najah.sa / password123`);
    console.log(`   Merchant: merchant@najah.sa / password123`);
    console.log(`   Driver:   driver@najah.sa / password123`);
    
    console.log(`\n🏪 Merchants:`);
    merchants.forEach((m, i) => {
      console.log(`   ${i + 1}. ${m.name} (${m.city})`);
      console.log(`      API Key: ${m.api_key.substring(0, 16)}...`);
    });
    
    console.log(`\n🚗 Couriers (${couriers.length} total):`);
    const couriersByCityCount = {
      Riyadh: couriers.filter(c => c.current_location.coordinates[0] > 46 && c.current_location.coordinates[0] < 47).length,
      Jeddah: couriers.filter(c => c.current_location.coordinates[0] > 39 && c.current_location.coordinates[0] < 40).length,
      Dammam: couriers.filter(c => c.current_location.coordinates[0] > 50 && c.current_location.coordinates[0] < 51).length
    };
    console.log(`   Riyadh: ${couriersByCityCount.Riyadh}, Jeddah: ${couriersByCityCount.Jeddah}, Dammam: ${couriersByCityCount.Dammam}`);
    
    console.log(`\n📦 Orders by City:`);
    const ordersByCity = {
      Riyadh: orders.filter(o => o.order_number.includes('RYD')).length,
      Jeddah: orders.filter(o => o.order_number.includes('JED')).length,
      Dammam: orders.filter(o => o.order_number.includes('DAM')).length
    };
    console.log(`   Riyadh: ${ordersByCity.Riyadh}, Jeddah: ${ordersByCity.Jeddah}, Dammam: ${ordersByCity.Dammam}`);
    
    console.log(`\n✅ All data seeded successfully!`);
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('📡 Disconnected from MongoDB');
  }
}

// Run the seed function
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };
