const mongoose = require('mongoose');
const crypto = require('crypto');
require('dotenv').config();

const Merchant = require('../models/Merchant');
const Courier = require('../models/Courier');
const Order = require('../models/Order');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/najah-delivery';

async function seedDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    await Merchant.deleteMany({});
    await Courier.deleteMany({});
    await Order.deleteMany({});
    console.log('Cleared existing data');

    const merchants = await Merchant.insertMany([
      {
        name: 'Riyadh Electronics Store',
        email: 'contact@riyadh-electronics.sa',
        phone: '+966112345678',
        address: {
          ar: 'الرياض، حي العليا، شارع الملك فهد',
          en: 'Riyadh, Al Olaya District, King Fahd Road'
        },
        webhook_secret: crypto.randomBytes(32).toString('hex'),
        api_key: crypto.randomBytes(32).toString('hex'),
        active: true
      },
      {
        name: 'Jeddah Foods Market',
        email: 'orders@jeddah-foods.sa',
        phone: '+966122345678',
        address: {
          ar: 'جدة، حي الروضة، شارع فلسطين',
          en: 'Jeddah, Al Rawdah District, Palestine Street'
        },
        webhook_secret: crypto.randomBytes(32).toString('hex'),
        api_key: crypto.randomBytes(32).toString('hex'),
        active: true
      },
      {
        name: 'Dammam Pharmacy Plus',
        email: 'info@dammam-pharmacy.sa',
        phone: '+966132345678',
        address: {
          ar: 'الدمام، حي الفيصلية، شارع الظهران',
          en: 'Dammam, Al Faisaliyah District, Dhahran Street'
        },
        webhook_secret: crypto.randomBytes(32).toString('hex'),
        api_key: crypto.randomBytes(32).toString('hex'),
        active: true
      }
    ]);
    console.log(`Created ${merchants.length} merchants`);

    const couriers = await Courier.insertMany([
      // Riyadh Couriers
      {
        name: 'Ahmed Al-Qarni',
        email: 'ahmed.qarni@najahdelivery.sa',
        phone: '+966501234567',
        vehicle: 'motorcycle',
        status: 'available',
        currentLocation: { type: 'Point', coordinates: [46.6753, 24.7136] },
        shift: { start: '08:00', end: '16:00' },
        capacity: 15,
        merchantId: merchants[0]._id
      },
      {
        name: 'Mohammed Al-Otaibi',
        email: 'mohammed.otaibi@najahdelivery.sa',
        phone: '+966501234568',
        vehicle: 'car',
        status: 'available',
        currentLocation: { type: 'Point', coordinates: [46.6848, 24.7242] },
        shift: { start: '09:00', end: '17:00' },
        capacity: 20,
        merchantId: merchants[0]._id
      },
      {
        name: 'Khalid Al-Harbi',
        email: 'khalid.harbi@najahdelivery.sa',
        phone: '+966501234569',
        vehicle: 'van',
        status: 'offline',
        currentLocation: { type: 'Point', coordinates: [46.6923, 24.7301] },
        shift: { start: '07:00', end: '15:00' },
        capacity: 30,
        merchantId: merchants[0]._id
      },
      // Jeddah Couriers
      {
        name: 'Fahad Al-Malki',
        email: 'fahad.malki@najahdelivery.sa',
        phone: '+966501234570',
        vehicle: 'motorcycle',
        status: 'available',
        currentLocation: { type: 'Point', coordinates: [39.1925, 21.5433] },
        shift: { start: '08:00', end: '16:00' },
        capacity: 15,
        merchantId: merchants[1]._id
      },
      {
        name: 'Abdullah Al-Zahrani',
        email: 'abdullah.zahrani@najahdelivery.sa',
        phone: '+966501234571',
        vehicle: 'car',
        status: 'busy',
        currentLocation: { type: 'Point', coordinates: [39.2041, 21.5469] },
        shift: { start: '10:00', end: '18:00' },
        capacity: 20,
        merchantId: merchants[1]._id
      },
      {
        name: 'Salem Al-Ghamdi',
        email: 'salem.ghamdi@najahdelivery.sa',
        phone: '+966501234572',
        vehicle: 'motorcycle',
        status: 'available',
        currentLocation: { type: 'Point', coordinates: [39.1856, 21.5328] },
        shift: { start: '08:00', end: '16:00' },
        capacity: 15,
        merchantId: merchants[1]._id
      },
      {
        name: 'Omar Al-Shehri',
        email: 'omar.shehri@najahdelivery.sa',
        phone: '+966501234573',
        vehicle: 'bicycle',
        status: 'on_break',
        currentLocation: { type: 'Point', coordinates: [39.1978, 21.5512] },
        shift: { start: '12:00', end: '20:00' },
        capacity: 8,
        merchantId: merchants[1]._id
      },
      // Dammam Couriers
      {
        name: 'Saud Al-Dossary',
        email: 'saud.dossary@najahdelivery.sa',
        phone: '+966501234574',
        vehicle: 'car',
        status: 'available',
        currentLocation: { type: 'Point', coordinates: [50.1040, 26.4207] },
        shift: { start: '08:00', end: '16:00' },
        capacity: 20,
        merchantId: merchants[2]._id
      },
      {
        name: 'Nasser Al-Qahtani',
        email: 'nasser.qahtani@najahdelivery.sa',
        phone: '+966501234575',
        vehicle: 'motorcycle',
        status: 'available',
        currentLocation: { type: 'Point', coordinates: [50.0984, 26.4275] },
        shift: { start: '09:00', end: '17:00' },
        capacity: 15,
        merchantId: merchants[2]._id
      },
      {
        name: 'Turki Al-Shammari',
        email: 'turki.shammari@najahdelivery.sa',
        phone: '+966501234576',
        vehicle: 'van',
        status: 'offline',
        currentLocation: { type: 'Point', coordinates: [50.1123, 26.4156] },
        shift: { start: '07:00', end: '15:00' },
        capacity: 30,
        merchantId: merchants[2]._id
      }
    ]);
    console.log(`Created ${couriers.length} couriers`);

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const orders = await Order.insertMany([
      // Riyadh Electronics Orders
      {
        merchantId: merchants[0]._id,
        status: 'pending',
        address: {
          ar: 'الرياض، حي النخيل، شارع الأمير محمد بن عبدالعزيز',
          en: 'Riyadh, Al Nakheel District, Prince Mohammed Bin Abdulaziz Street',
          components: {
            street: 'Prince Mohammed Bin Abdulaziz Street',
            district: 'Al Nakheel',
            city: 'Riyadh',
            postal_code: '12381'
          },
          coordinates: { lat: 24.7453, lng: 46.6524 }
        },
        timeWindow: {
          start: new Date(today.setHours(9, 0, 0)),
          end: new Date(today.setHours(12, 0, 0))
        },
        priority: 3,
        items: [
          { name: 'Samsung Galaxy S23', quantity: 1, price: 3299 },
          { name: 'Wireless Charger', quantity: 1, price: 149 }
        ],
        totalAmount: 3448
      },
      {
        merchantId: merchants[0]._id,
        status: 'confirmed',
        address: {
          ar: 'الرياض، حي المروج، شارع الإمام سعود بن عبدالعزيز',
          en: 'Riyadh, Al Muruj District, Imam Saud Bin Abdulaziz Street',
          components: {
            street: 'Imam Saud Bin Abdulaziz Street',
            district: 'Al Muruj',
            city: 'Riyadh',
            postal_code: '11564'
          },
          coordinates: { lat: 24.6877, lng: 46.7219 }
        },
        timeWindow: {
          start: new Date(today.setHours(14, 0, 0)),
          end: new Date(today.setHours(17, 0, 0))
        },
        priority: 2,
        items: [
          { name: 'HP Laptop', quantity: 1, price: 2899 },
          { name: 'Laptop Bag', quantity: 1, price: 199 }
        ],
        totalAmount: 3098
      },
      {
        merchantId: merchants[0]._id,
        status: 'pending',
        address: {
          ar: 'الرياض، حي الملقا، شارع العروبة',
          en: 'Riyadh, Al Malqa District, Al Urubah Street',
          components: {
            street: 'Al Urubah Street',
            district: 'Al Malqa',
            city: 'Riyadh',
            postal_code: '13521'
          },
          coordinates: { lat: 24.7765, lng: 46.6389 }
        },
        timeWindow: {
          start: new Date(tomorrow.setHours(10, 0, 0)),
          end: new Date(tomorrow.setHours(13, 0, 0))
        },
        priority: 1,
        items: [
          { name: 'Sony Headphones', quantity: 2, price: 599 }
        ],
        totalAmount: 1198
      },
      {
        merchantId: merchants[0]._id,
        status: 'assigned',
        courierId: couriers[0]._id,
        address: {
          ar: 'الرياض، حي الياسمين، شارع الأمير سلطان',
          en: 'Riyadh, Al Yasmin District, Prince Sultan Street',
          components: {
            street: 'Prince Sultan Street',
            district: 'Al Yasmin',
            city: 'Riyadh',
            postal_code: '12832'
          },
          coordinates: { lat: 24.7142, lng: 46.6739 }
        },
        timeWindow: {
          start: new Date(today.setHours(15, 0, 0)),
          end: new Date(today.setHours(18, 0, 0))
        },
        priority: 4,
        items: [
          { name: 'Apple iPad Pro', quantity: 1, price: 4199 }
        ],
        totalAmount: 4199
      },
      {
        merchantId: merchants[0]._id,
        status: 'pending',
        address: {
          ar: 'الرياض، حي العقيق، شارع الملك عبدالله',
          en: 'Riyadh, Al Aqiq District, King Abdullah Street',
          components: {
            street: 'King Abdullah Street',
            district: 'Al Aqiq',
            city: 'Riyadh',
            postal_code: '12792'
          },
          coordinates: { lat: 24.8012, lng: 46.6231 }
        },
        timeWindow: {
          start: new Date(tomorrow.setHours(9, 0, 0)),
          end: new Date(tomorrow.setHours(11, 0, 0))
        },
        priority: 5,
        items: [
          { name: 'Gaming Console PS5', quantity: 1, price: 2299 },
          { name: 'Extra Controller', quantity: 2, price: 299 }
        ],
        totalAmount: 2897
      },
      // Jeddah Foods Market Orders
      {
        merchantId: merchants[1]._id,
        status: 'pending',
        address: {
          ar: 'جدة، حي الزهراء، شارع الأمير سلطان',
          en: 'Jeddah, Al Zahra District, Prince Sultan Street',
          components: {
            street: 'Prince Sultan Street',
            district: 'Al Zahra',
            city: 'Jeddah',
            postal_code: '23532'
          },
          coordinates: { lat: 21.5811, lng: 39.1534 }
        },
        timeWindow: {
          start: new Date(today.setHours(11, 0, 0)),
          end: new Date(today.setHours(13, 0, 0))
        },
        priority: 2,
        items: [
          { name: 'Fresh Vegetables Box', quantity: 1, price: 89 },
          { name: 'Organic Fruits Box', quantity: 1, price: 129 }
        ],
        totalAmount: 218
      },
      {
        merchantId: merchants[1]._id,
        status: 'assigned',
        courierId: couriers[4]._id,
        address: {
          ar: 'جدة، حي البساتين، شارع فلسطين',
          en: 'Jeddah, Al Basatin District, Palestine Street',
          components: {
            street: 'Palestine Street',
            district: 'Al Basatin',
            city: 'Jeddah',
            postal_code: '23719'
          },
          coordinates: { lat: 21.5469, lng: 39.2041 }
        },
        timeWindow: {
          start: new Date(today.setHours(14, 0, 0)),
          end: new Date(today.setHours(16, 0, 0))
        },
        priority: 3,
        items: [
          { name: 'Chicken (2kg)', quantity: 1, price: 45 },
          { name: 'Rice (5kg)', quantity: 1, price: 58 },
          { name: 'Cooking Oil', quantity: 2, price: 35 }
        ],
        totalAmount: 173
      },
      {
        merchantId: merchants[1]._id,
        status: 'pending',
        address: {
          ar: 'جدة، حي النعيم، شارع المدينة المنورة',
          en: 'Jeddah, Al Naeem District, Al Madinah Al Munawarah Street',
          components: {
            street: 'Al Madinah Al Munawarah Street',
            district: 'Al Naeem',
            city: 'Jeddah',
            postal_code: '23621'
          },
          coordinates: { lat: 21.6225, lng: 39.1568 }
        },
        timeWindow: {
          start: new Date(tomorrow.setHours(10, 0, 0)),
          end: new Date(tomorrow.setHours(12, 0, 0))
        },
        priority: 1,
        items: [
          { name: 'Dairy Products Pack', quantity: 1, price: 95 },
          { name: 'Fresh Bread', quantity: 3, price: 12 }
        ],
        totalAmount: 131
      },
      {
        merchantId: merchants[1]._id,
        status: 'pending',
        address: {
          ar: 'جدة، حي الشاطئ، شارع الكورنيش',
          en: 'Jeddah, Al Shati District, Corniche Street',
          components: {
            street: 'Corniche Street',
            district: 'Al Shati',
            city: 'Jeddah',
            postal_code: '23412'
          },
          coordinates: { lat: 21.5328, lng: 39.1856 }
        },
        timeWindow: {
          start: new Date(today.setHours(17, 0, 0)),
          end: new Date(today.setHours(19, 0, 0))
        },
        priority: 2,
        items: [
          { name: 'Seafood Mix (1kg)', quantity: 1, price: 125 }
        ],
        totalAmount: 125
      },
      {
        merchantId: merchants[1]._id,
        status: 'pending',
        address: {
          ar: 'جدة، حي الصفا، شارع التحلية',
          en: 'Jeddah, Al Safa District, Tahlia Street',
          components: {
            street: 'Tahlia Street',
            district: 'Al Safa',
            city: 'Jeddah',
            postal_code: '23451'
          },
          coordinates: { lat: 21.5625, lng: 39.1697 }
        },
        timeWindow: {
          start: new Date(tomorrow.setHours(15, 0, 0)),
          end: new Date(tomorrow.setHours(17, 0, 0))
        },
        priority: 1,
        items: [
          { name: 'Premium Meat Pack', quantity: 1, price: 189 },
          { name: 'Spices Set', quantity: 1, price: 45 }
        ],
        totalAmount: 234
      },
      {
        merchantId: merchants[1]._id,
        status: 'confirmed',
        address: {
          ar: 'جدة، حي المحمدية، شارع حراء',
          en: 'Jeddah, Al Muhammadiyah District, Hira Street',
          components: {
            street: 'Hira Street',
            district: 'Al Muhammadiyah',
            city: 'Jeddah',
            postal_code: '23623'
          },
          coordinates: { lat: 21.6134, lng: 39.1345 }
        },
        timeWindow: {
          start: new Date(today.setHours(12, 0, 0)),
          end: new Date(today.setHours(14, 0, 0))
        },
        priority: 4,
        items: [
          { name: 'Beverages Pack', quantity: 1, price: 78 },
          { name: 'Snacks Box', quantity: 2, price: 45 }
        ],
        totalAmount: 168
      },
      {
        merchantId: merchants[1]._id,
        status: 'pending',
        address: {
          ar: 'جدة، حي الحمراء، شارع الستين',
          en: 'Jeddah, Al Hamra District, Siteen Street',
          components: {
            street: 'Siteen Street',
            district: 'Al Hamra',
            city: 'Jeddah',
            postal_code: '23321'
          },
          coordinates: { lat: 21.5512, lng: 39.1978 }
        },
        timeWindow: {
          start: new Date(tomorrow.setHours(8, 0, 0)),
          end: new Date(tomorrow.setHours(10, 0, 0))
        },
        priority: 3,
        items: [
          { name: 'Breakfast Essentials', quantity: 1, price: 67 }
        ],
        totalAmount: 67
      },
      // Dammam Pharmacy Plus Orders
      {
        merchantId: merchants[2]._id,
        status: 'pending',
        address: {
          ar: 'الدمام، حي الشاطئ، شارع الأمير محمد بن فهد',
          en: 'Dammam, Al Shati District, Prince Mohammed Bin Fahd Street',
          components: {
            street: 'Prince Mohammed Bin Fahd Street',
            district: 'Al Shati',
            city: 'Dammam',
            postal_code: '32413'
          },
          coordinates: { lat: 26.4368, lng: 50.0891 }
        },
        timeWindow: {
          start: new Date(today.setHours(10, 0, 0)),
          end: new Date(today.setHours(12, 0, 0))
        },
        priority: 5,
        items: [
          { name: 'Prescription Medications', quantity: 1, price: 245 },
          { name: 'First Aid Kit', quantity: 1, price: 89 }
        ],
        totalAmount: 334
      },
      {
        merchantId: merchants[2]._id,
        status: 'assigned',
        courierId: couriers[7]._id,
        address: {
          ar: 'الدمام، حي الفيصلية، شارع الظهران',
          en: 'Dammam, Al Faisaliyah District, Dhahran Street',
          components: {
            street: 'Dhahran Street',
            district: 'Al Faisaliyah',
            city: 'Dammam',
            postal_code: '32272'
          },
          coordinates: { lat: 26.4207, lng: 50.1040 }
        },
        timeWindow: {
          start: new Date(today.setHours(13, 0, 0)),
          end: new Date(today.setHours(15, 0, 0))
        },
        priority: 4,
        items: [
          { name: 'Diabetes Medication', quantity: 2, price: 178 },
          { name: 'Blood Pressure Monitor', quantity: 1, price: 299 }
        ],
        totalAmount: 655
      },
      {
        merchantId: merchants[2]._id,
        status: 'pending',
        address: {
          ar: 'الدمام، حي الأمير محمد بن فهد، طريق الملك فهد',
          en: 'Dammam, Prince Mohammed Bin Fahd District, King Fahd Road',
          components: {
            street: 'King Fahd Road',
            district: 'Prince Mohammed Bin Fahd',
            city: 'Dammam',
            postal_code: '32256'
          },
          coordinates: { lat: 26.4456, lng: 50.0723 }
        },
        timeWindow: {
          start: new Date(tomorrow.setHours(9, 0, 0)),
          end: new Date(tomorrow.setHours(11, 0, 0))
        },
        priority: 3,
        items: [
          { name: 'Vitamins Pack', quantity: 1, price: 145 },
          { name: 'Pain Relief Cream', quantity: 2, price: 56 }
        ],
        totalAmount: 257
      },
      {
        merchantId: merchants[2]._id,
        status: 'pending',
        address: {
          ar: 'الدمام، حي المزروعية، شارع الخليج',
          en: 'Dammam, Al Mazruiyah District, Al Khaleej Street',
          components: {
            street: 'Al Khaleej Street',
            district: 'Al Mazruiyah',
            city: 'Dammam',
            postal_code: '32414'
          },
          coordinates: { lat: 26.4275, lng: 50.0984 }
        },
        timeWindow: {
          start: new Date(today.setHours(16, 0, 0)),
          end: new Date(today.setHours(18, 0, 0))
        },
        priority: 2,
        items: [
          { name: 'Antibiotics', quantity: 1, price: 89 },
          { name: 'Cough Syrup', quantity: 1, price: 45 }
        ],
        totalAmount: 134
      },
      {
        merchantId: merchants[2]._id,
        status: 'confirmed',
        address: {
          ar: 'الدمام، حي الطبيشي، شارع الأمير نايف',
          en: 'Dammam, Al Tubayshi District, Prince Naif Street',
          components: {
            street: 'Prince Naif Street',
            district: 'Al Tubayshi',
            city: 'Dammam',
            postal_code: '32247'
          },
          coordinates: { lat: 26.4512, lng: 50.1234 }
        },
        timeWindow: {
          start: new Date(tomorrow.setHours(14, 0, 0)),
          end: new Date(tomorrow.setHours(16, 0, 0))
        },
        priority: 1,
        items: [
          { name: 'Baby Care Products', quantity: 1, price: 178 },
          { name: 'Diapers Pack', quantity: 1, price: 129 }
        ],
        totalAmount: 307
      },
      {
        merchantId: merchants[2]._id,
        status: 'pending',
        address: {
          ar: 'الدمام، حي الفردوس، شارع الأمير محمد بن سعود',
          en: 'Dammam, Al Fardous District, Prince Mohammed Bin Saud Street',
          components: {
            street: 'Prince Mohammed Bin Saud Street',
            district: 'Al Fardous',
            city: 'Dammam',
            postal_code: '32245'
          },
          coordinates: { lat: 26.4156, lng: 50.1123 }
        },
        timeWindow: {
          start: new Date(today.setHours(11, 0, 0)),
          end: new Date(today.setHours(13, 0, 0))
        },
        priority: 2,
        items: [
          { name: 'Allergy Medications', quantity: 2, price: 67 },
          { name: 'Nasal Spray', quantity: 1, price: 43 }
        ],
        totalAmount: 177
      },
      {
        merchantId: merchants[2]._id,
        status: 'pending',
        address: {
          ar: 'الدمام، حي الضباب، شارع عثمان بن عفان',
          en: 'Dammam, Al Dhobab District, Othman Bin Affan Street',
          components: {
            street: 'Othman Bin Affan Street',
            district: 'Al Dhobab',
            city: 'Dammam',
            postal_code: '32241'
          },
          coordinates: { lat: 26.4189, lng: 50.0867 }
        },
        timeWindow: {
          start: new Date(tomorrow.setHours(12, 0, 0)),
          end: new Date(tomorrow.setHours(14, 0, 0))
        },
        priority: 3,
        items: [
          { name: 'Skincare Products', quantity: 1, price: 234 },
          { name: 'Sunscreen SPF 50', quantity: 1, price: 78 }
        ],
        totalAmount: 312
      }
    ]);
    console.log(`Created ${orders.length} orders`);

    console.log('\n===== Seed Data Summary =====');
    console.log(`Merchants: ${merchants.length}`);
    merchants.forEach(m => {
      console.log(`  - ${m.name} (${m.email})`);
      console.log(`    API Key: ${m.api_key}`);
      console.log(`    Webhook Secret: ${m.webhook_secret}`);
    });
    console.log(`\nCouriers: ${couriers.length}`);
    console.log(`Orders: ${orders.length}`);
    console.log('=============================\n');

    console.log('Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
