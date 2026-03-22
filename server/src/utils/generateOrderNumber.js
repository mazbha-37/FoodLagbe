const generateOrderNumber = async () => {
  const Order = require('../models/Order');
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

  const generate = () =>
    Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');

  let orderNumber;
  let exists = true;

  while (exists) {
    orderNumber = generate();
    exists = await Order.exists({ orderNumber });
  }

  return orderNumber;
};

module.exports = generateOrderNumber;
