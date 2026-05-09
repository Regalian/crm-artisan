export interface LineItem {
  quantity: number;
  unit_price: number;
}

/**
 * Calculate the total for a quote from its line items.
 * Each line item total is quantity × unit_price, rounded to 2dp.
 * Returns the grand total rounded to 2dp.
 */
export function calculateQuoteTotal(items: LineItem[]): number {
  const total = items.reduce((sum, item) => {
    const lineTotal = item.quantity * item.unit_price;
    return sum + Math.round(lineTotal * 100) / 100;
  }, 0);

  return Math.round(total * 100) / 100;
}

/**
 * Format a number as GBP currency string.
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(amount);
}
