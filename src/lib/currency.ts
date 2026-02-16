export function formatCurrency(amount: number, currency = 'USD') {
  // Use a try-catch block to handle unsupported currency codes gracefully.
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch (error) {
    // If the currency code is invalid, default to USD with a warning.
    console.warn(`Invalid or unsupported currency code: ${currency}. Defaulting to USD.`);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }
}
