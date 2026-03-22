/**
 * Calculate delivery fee based on distance.
 * @param {number} distanceKm
 * @returns {number} fee in BDT
 */
const calculateDeliveryFee = (distanceKm) => {
  if (distanceKm <= 2) return 30;
  if (distanceKm <= 5) return 50;
  if (distanceKm <= 10) return 80;
  return 120;
};

module.exports = { calculateDeliveryFee };
