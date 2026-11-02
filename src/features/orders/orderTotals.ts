/**
 * Order money, in whole rupees. Same formula as the server's `order_totals` view
 * (DATABASE.md §2.14): base = max(0, subtotal + extras − discount), tax = round(base × gst / 100),
 * total = base + tax, balance = 0 for cancelled orders, else max(0, total − paid).
 * Phase 6.1 extends this file with the order-number helpers.
 */
export interface OrderMoneyInput {
  discount: number;
  gstRate: number;
  cancelled: boolean;
  items: { qty: number; rate: number }[];
  extras: { amount: number }[];
  payments: { amount: number }[];
}

export interface OrderMoney {
  subtotal: number;
  extras: number;
  base: number;
  tax: number;
  total: number;
  paid: number;
  balance: number;
}

export function computeOrderMoney(o: OrderMoneyInput): OrderMoney {
  const subtotal = o.items.reduce((sum, i) => sum + i.qty * i.rate, 0);
  const extras = o.extras.reduce((sum, e) => sum + e.amount, 0);
  const base = Math.max(0, subtotal + extras - o.discount);
  const tax = Math.round((base * o.gstRate) / 100);
  const total = base + tax;
  const paid = o.payments.reduce((sum, p) => sum + p.amount, 0);
  return {
    subtotal,
    extras,
    base,
    tax,
    total,
    paid,
    balance: o.cancelled ? 0 : Math.max(0, total - paid),
  };
}
