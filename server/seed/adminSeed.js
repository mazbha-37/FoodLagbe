require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const connectDB = require('../src/config/db');

const seedAdmin = async () => {
  await connectDB();

  const existing = await User.findOne({ email: process.env.ADMIN_EMAIL });
  if (existing) {
    console.log('Admin already exists');
    await mongoose.disconnect();
    process.exit(0);
  }

  await User.create({
    name: 'Super Admin',
    email: process.env.ADMIN_EMAIL,
    phone: '+8801700000000',
    password: process.env.ADMIN_PASSWORD,
    role: 'admin',
  });

  console.log(`Admin created: ${process.env.ADMIN_EMAIL}`);
  await mongoose.disconnect();
  process.exit(0);
};

seedAdmin().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
