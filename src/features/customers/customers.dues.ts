import { computeOrderMoney } from '@/features/orders/orderTotals';

interface OrderRow {
  id: string;
  customerId: string;
  discount: number;
  gstRate: number;
  cancelledAt: string | null;
  status: 'received' | 'ready' | 'delivered';
}

export interface CustomerOrderStats {
  /** Orders ever placed (not deleted, cancelled ones included). */
  orders: number;
  /** Orders still in progress: received or ready, not cancelled. */
  active: number;
  /** Rupees still to collect across the customer's orders. */
  due: number;
}

function groupBy<T>(rows: T[], key: (r: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const r of rows) {
    const k = key(r);
    const list = map.get(k);
    if (list) list.push(r);
    else map.set(k, [r]);
  }
  return map;
}

/** Orders, active orders and dues per customer id (S14 "Has dues", S21 stats line). */
export function computeCustomerStats(
  orders: OrderRow[],
  items: { orderId: string; qty: number; rate: number }[],
  extras: { orderId: string; amount: number }[],
  payments: { orderId: string; amount: number }[],
): Map<string, CustomerOrderStats> {
  const itemsBy = groupBy(items, (i) => i.orderId);
  const extrasBy = groupBy(extras, (e) => e.orderId);
  const paymentsBy = groupBy(payments, (p) => p.orderId);
  const stats = new Map<string, CustomerOrderStats>();

  for (const o of orders) {
    const s = stats.get(o.customerId) ?? { orders: 0, active: 0, due: 0 };
    const cancelled = o.cancelledAt !== null;
    s.orders += 1;
    if (!cancelled && o.status !== 'delivered') s.active += 1;
    s.due += computeOrderMoney({
      discount: o.discount,
      gstRate: o.gstRate,
      cancelled,
      items: itemsBy.get(o.id) ?? [],
      extras: extrasBy.get(o.id) ?? [],
      payments: paymentsBy.get(o.id) ?? [],
    }).balance;
    stats.set(o.customerId, s);
  }
  return stats;
}
