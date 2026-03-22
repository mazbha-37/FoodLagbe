export const formatCurrency = (amount) => {
  if (typeof amount !== 'number') return '৳0';
  return `৳${amount.toLocaleString('en-BD')}`;
};
