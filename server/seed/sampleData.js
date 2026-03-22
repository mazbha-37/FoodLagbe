require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../src/config/db');

const User = require('../src/models/User');
const Restaurant = require('../src/models/Restaurant');
const Category = require('../src/models/Category');
const MenuItem = require('../src/models/MenuItem');
const Coupon = require('../src/models/Coupon');

// ─── Placeholder photo helper ─────────────────────────────────────────────────

const photo = (text) => ({
  url: `https://placehold.co/400x400/F97316/ffffff?text=${encodeURIComponent(text)}`,
  publicId: `placeholder_${text.replace(/\s+/g, '_').toLowerCase()}`,
});

// ─── Data ─────────────────────────────────────────────────────────────────────

const openingHours = Array.from({ length: 7 }, (_, i) => ({
  day: i,
  isOpen: i !== 5, // closed Friday
  openTime: '09:00',
  closeTime: '22:00',
}));

const RESTAURANTS_DATA = [
  {
    owner: {
      name: 'Rahim Uddin',
      email: 'rahim@kacchibhai.com',
      phone: '01711111111',
      password: 'Owner@1234',
    },
    restaurant: {
      name: 'Kacchi Bhai',
      description: 'Authentic Bangladeshi kacchi biryani and traditional rice dishes served fresh daily in the heart of Dhanmondi.',
      address: 'House 5, Road 2, Dhanmondi, Dhaka-1205',
      location: { type: 'Point', coordinates: [90.3742, 23.7461] },
      phone: '01711111111',
      cuisineTypes: ['Bangladeshi'],
      estimatedPrepTime: 30,
      coverPhoto: photo('Kacchi Bhai'),
      tradeLicensePhoto: photo('License KB'),
    },
    categories: [
      {
        name: 'Biryani & Rice',
        items: [
          { name: 'Kacchi Biryani', description: 'Slow-cooked mutton with fragrant basmati rice', price: 350 },
          { name: 'Morog Polao', description: 'Aromatic chicken polao with ghee', price: 300 },
          { name: 'Tehari', description: 'Spiced beef tehari with raita', price: 200 },
          { name: 'Beef Kala Bhuna Bhat', description: 'Steamed rice with rich kala bhuna', price: 250 },
          { name: 'Khichuri', description: 'Comfort rice-lentil dish with beef', price: 180 },
        ],
      },
      {
        name: 'Drinks & Sides',
        items: [
          { name: 'Borhani', description: 'Spiced yogurt drink with mint', price: 60 },
          { name: 'Firni', description: 'Traditional rice pudding dessert', price: 80 },
          { name: 'Salad', description: 'Fresh onion, cucumber and lemon', price: 30 },
          { name: 'Raita', description: 'Yogurt with spices', price: 40 },
        ],
      },
    ],
  },
  {
    owner: {
      name: 'Liu Wei',
      email: 'liu@dragonwok.com',
      phone: '01722222222',
      password: 'Owner@1234',
    },
    restaurant: {
      name: 'Dragon Wok',
      description: 'Authentic Chinese cuisine featuring classic stir-fries, dim sum, and noodle dishes prepared by a master chef from Beijing.',
      address: 'Level 2, Gulshan Avenue, Gulshan-1, Dhaka-1212',
      location: { type: 'Point', coordinates: [90.4078, 23.7925] },
      phone: '01722222222',
      cuisineTypes: ['Chinese'],
      estimatedPrepTime: 20,
      coverPhoto: photo('Dragon Wok'),
      tradeLicensePhoto: photo('License DW'),
    },
    categories: [
      {
        name: 'Starters',
        items: [
          { name: 'Spring Roll (6 pcs)', description: 'Crispy vegetable spring rolls with dipping sauce', price: 150 },
          { name: 'Chicken Wontons', description: 'Pan-fried wontons with chili oil', price: 180 },
          { name: 'Prawn Toast', description: 'Sesame prawn toast, golden fried', price: 200 },
          { name: 'Hot & Sour Soup', description: 'Spicy and tangy tofu mushroom soup', price: 120 },
        ],
      },
      {
        name: 'Noodles & Rice',
        items: [
          { name: 'Beef Chow Mein', description: 'Stir-fried noodles with tender beef strips', price: 220 },
          { name: 'Chicken Fried Rice', description: 'Classic wok-tossed fried rice', price: 180 },
          { name: 'Prawn Fried Rice', description: 'Wok fried rice with tiger prawns', price: 280 },
          { name: 'Hakka Noodles', description: 'Indo-Chinese hakka style noodles', price: 160 },
          { name: 'Szechuan Fried Rice', description: 'Spicy Szechuan fried rice', price: 200 },
        ],
      },
      {
        name: 'Main Course',
        items: [
          { name: 'Chili Chicken', description: 'Crispy chicken tossed in spicy sauce', price: 250 },
          { name: 'Sweet & Sour Pork', description: 'Classic Cantonese sweet and sour preparation', price: 270 },
          { name: 'Kung Pao Chicken', description: 'Spicy stir-fry with peanuts and chilies', price: 260 },
          { name: 'Garlic Butter Prawns', description: 'Tiger prawns in aromatic garlic butter sauce', price: 380 },
          { name: 'Mapo Tofu', description: 'Silken tofu in spicy bean sauce', price: 190 },
          { name: 'Mongolian Beef', description: 'Tender beef in savory hoisin sauce', price: 290 },
        ],
      },
    ],
  },
  {
    owner: {
      name: 'Farhan Hossain',
      email: 'farhan@pizzaplanet.com',
      phone: '01733333333',
      password: 'Owner@1234',
    },
    restaurant: {
      name: 'Pizza Planet',
      description: 'Hand-tossed artisan pizzas and gourmet burgers made with fresh local ingredients and Italian imported cheese.',
      address: 'Shop 3, Banani DOHS, Road 11, Banani, Dhaka-1213',
      location: { type: 'Point', coordinates: [90.4066, 23.7937] },
      phone: '01733333333',
      cuisineTypes: ['Italian', 'Fast Food'],
      estimatedPrepTime: 25,
      coverPhoto: photo('Pizza Planet'),
      tradeLicensePhoto: photo('License PP'),
    },
    categories: [
      {
        name: 'Pizzas',
        items: [
          { name: 'Margherita', description: 'San Marzano tomatoes, fresh mozzarella, basil', price: 380 },
          { name: 'BBQ Chicken Pizza', description: 'Smoked chicken, red onion, BBQ sauce', price: 480 },
          { name: 'Beef Pepperoni', description: 'Loaded with beef pepperoni and mozzarella', price: 520 },
          { name: 'Veggie Supreme', description: 'Bell peppers, olives, mushrooms, onions', price: 420 },
          { name: 'Four Cheese', description: 'Mozzarella, cheddar, parmesan, gouda', price: 550 },
        ],
      },
      {
        name: 'Burgers',
        items: [
          { name: 'Classic Beef Burger', description: 'Angus beef patty with lettuce, tomato, cheese', price: 280 },
          { name: 'Crispy Chicken Burger', description: 'Crispy fried chicken fillet with coleslaw', price: 250 },
          { name: 'Double Smash Burger', description: 'Double smash patties with special sauce', price: 380 },
          { name: 'Mushroom Swiss Burger', description: 'Beef patty with sautéed mushrooms and Swiss cheese', price: 320 },
        ],
      },
      {
        name: 'Pasta & Sides',
        items: [
          { name: 'Spaghetti Bolognese', description: 'Classic beef ragù with al dente spaghetti', price: 320 },
          { name: 'Penne Arrabbiata', description: 'Spicy tomato sauce with penne pasta', price: 280 },
          { name: 'Garlic Bread (4 pcs)', description: 'Crispy garlic butter toasted bread', price: 120 },
          { name: 'Loaded Fries', description: 'Fries topped with cheese sauce and jalapeños', price: 160 },
        ],
      },
      {
        name: 'Desserts & Drinks',
        items: [
          { name: 'Tiramisu', description: 'Classic Italian coffee dessert', price: 180 },
          { name: 'Nutella Calzone', description: 'Warm folded pizza filled with Nutella', price: 220 },
          { name: 'Soft Drink (350ml)', description: 'Coke, Sprite or Fanta', price: 60 },
          { name: 'Fresh Lemonade', description: 'Freshly squeezed lemonade with mint', price: 80 },
        ],
      },
    ],
  },
];

const CUSTOMERS = [
  { name: 'Anika Rahman', email: 'anika@example.com', phone: '01811111111', password: 'Customer@1234', role: 'customer' },
  { name: 'Sabbir Ahmed', email: 'sabbir@example.com', phone: '01822222222', password: 'Customer@1234', role: 'customer' },
];

const RIDERS = [
  {
    name: 'Sumon Mia',
    email: 'sumon@riders.com',
    phone: '01911111111',
    password: 'Rider@1234',
    role: 'rider',
    isAvailable: true,
    currentLocation: { type: 'Point', coordinates: [90.3742, 23.7461] },
  },
  {
    name: 'Karim Driver',
    email: 'karim@riders.com',
    phone: '01922222222',
    password: 'Rider@1234',
    role: 'rider',
    isAvailable: true,
    currentLocation: { type: 'Point', coordinates: [90.4078, 23.7925] },
  },
];

const COUPONS = [
  {
    code: 'WELCOME50',
    discountType: 'flat',
    discountValue: 50,
    minimumOrderAmount: 200,
    perUserLimit: 1,
    validFrom: new Date(),
    validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    isActive: true,
  },
  {
    code: 'SAVE20',
    discountType: 'percentage',
    discountValue: 20,
    minimumOrderAmount: 500,
    maximumDiscountAmount: 150,
    perUserLimit: 3,
    validFrom: new Date(),
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    isActive: true,
  },
  {
    code: 'FREEDEL',
    discountType: 'flat',
    discountValue: 80,
    minimumOrderAmount: 300,
    perUserLimit: 2,
    validFrom: new Date(),
    validUntil: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    isActive: true,
  },
];

// ─── Seed ─────────────────────────────────────────────────────────────────────

const seed = async () => {
  await connectDB();
  console.log('\n🌱 Starting seed...\n');

  // Clear everything except admin
  const admin = await User.findOne({ role: 'admin' });
  await User.deleteMany({ role: { $ne: 'admin' } });
  await Restaurant.deleteMany({});
  await Category.deleteMany({});
  await MenuItem.deleteMany({});
  await Coupon.deleteMany({});
  console.log('✓ Cleared existing data (kept admin)');

  // Customers — use create() to trigger pre-save password hashing hook
  const customers = [];
  for (const c of CUSTOMERS) customers.push(await User.create(c));
  console.log(`✓ Created ${customers.length} customers`);

  // Riders — use create() to trigger pre-save password hashing hook
  const riders = [];
  for (const r of RIDERS) riders.push(await User.create(r));
  console.log(`✓ Created ${riders.length} riders`);

  // Coupons
  await Coupon.insertMany(COUPONS);
  console.log(`✓ Created ${COUPONS.length} coupons`);

  // Restaurants, categories, items
  let totalCategories = 0;
  let totalItems = 0;

  for (const data of RESTAURANTS_DATA) {
    // Owner
    const owner = await User.create({ ...data.owner, role: 'restaurant_owner' });

    // Restaurant
    const restaurant = await Restaurant.create({
      ownerId: owner._id,
      ...data.restaurant,
      openingHours,
      applicationStatus: 'approved',
      commissionRate: 15,
    });

    // Categories & items
    for (let ci = 0; ci < data.categories.length; ci++) {
      const catData = data.categories[ci];
      const category = await Category.create({
        restaurantId: restaurant._id,
        name: catData.name,
        sortOrder: ci,
      });
      totalCategories++;

      for (let ii = 0; ii < catData.items.length; ii++) {
        const itemData = catData.items[ii];
        await MenuItem.create({
          restaurantId: restaurant._id,
          categoryId: category._id,
          name: itemData.name,
          description: itemData.description,
          price: itemData.price,
          photo: photo(itemData.name),
          isAvailable: true,
          sortOrder: ii,
        });
        totalItems++;
      }
    }

    console.log(`✓ Created "${restaurant.name}" with ${data.categories.length} categories`);
  }

  console.log(`\n✅ Seed complete!`);
  console.log(`   Restaurants : ${RESTAURANTS_DATA.length}`);
  console.log(`   Categories  : ${totalCategories}`);
  console.log(`   Menu Items  : ${totalItems}`);
  console.log(`   Customers   : ${customers.length}`);
  console.log(`   Riders      : ${riders.length}`);
  console.log(`   Coupons     : ${COUPONS.length}`);
  if (admin) console.log(`   Admin       : ${admin.email} (preserved)`);

  await mongoose.disconnect();
  process.exit(0);
};

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
