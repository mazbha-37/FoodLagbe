const stripe = require('../config/stripe');

const createCheckoutSession = async (order, lineItems) => {
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    currency: 'bdt',
    line_items: lineItems.map((item) => ({
      price_data: {
        currency: 'bdt',
        product_data: { name: item.name },
        unit_amount: Math.round(item.price * 100), // convert to paisa
      },
      quantity: item.quantity,
    })),
    success_url: `${process.env.CLIENT_URL}/orders/${order._id}?payment=success`,
    cancel_url: `${process.env.CLIENT_URL}/checkout?payment=cancelled`,
    metadata: { orderId: order._id.toString() },
  });

  return session;
};

const createRefund = async (stripeSessionId) => {
  const session = await stripe.checkout.sessions.retrieve(stripeSessionId);
  const paymentIntentId = session.payment_intent;
  const refund = await stripe.refunds.create({ payment_intent: paymentIntentId });
  return refund;
};

module.exports = { createCheckoutSession, createRefund };
