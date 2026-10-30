import type { Charge, OrderItem, OrderWithItems, Role, Transfer } from './types';

export function formatDZD(n: number): string {
  const rounded = Math.round(n);
  const s = Math.abs(rounded).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${rounded < 0 ? '-' : ''}${s} DA`;
}

export function monthKey(date: string): string {
  return date.slice(0, 7); // "2026-10"
}

// Before the goods arrive we assume everything ordered will be received.
const received = (item: OrderItem) => item.qty_received ?? item.qty_ordered;

export function orderTotals(order: OrderWithItems) {
  const items = order.order_items;
  const itemsCost = items.reduce((s, i) => s + i.qty_ordered * i.unit_cost, 0);
  const cost = itemsCost + Number(order.shipping_cost) + Number(order.other_cost);
  // The client only pays for the pieces that actually arrived.
  const revenue = items.reduce((s, i) => s + received(i) * i.unit_price, 0);
  const lostPieces = items.reduce((s, i) => s + Math.max(0, i.qty_ordered - received(i)), 0);
  const lostValue = items.reduce((s, i) => s + Math.max(0, i.qty_ordered - received(i)) * i.unit_cost, 0);
  const profit = revenue - cost;
  const sourcerPct = order.clients.owner === 'seller' ? 50 : Number(order.sourcer_share_pct);
  const sourcerProfit = (profit * sourcerPct) / 100;
  const deposit = Number(order.deposit);
  return {
    cost,
    revenue,
    profit,
    lostPieces,
    lostValue,
    sourcerPct,
    sourcerProfit,
    sellerProfit: profit - sourcerProfit,
    deposit,
    remaining: revenue - deposit,
  };
}

export type MonthSummary = {
  month: string;
  orders: number;
  revenue: number;
  profit: number;
  lostValue: number;
  charges: number;
  netProfit: number;
  sourcerNet: number;
  sellerNet: number;
};

// Profit counts in the month the order was delivered. Charges are split 50/50.
export function monthlySummaries(orders: OrderWithItems[], charges: Charge[]): MonthSummary[] {
  const map = new Map<string, MonthSummary>();
  const get = (month: string) => {
    let m = map.get(month);
    if (!m) {
      m = { month, orders: 0, revenue: 0, profit: 0, lostValue: 0, charges: 0, netProfit: 0, sourcerNet: 0, sellerNet: 0 };
      map.set(month, m);
    }
    return m;
  };
  for (const o of orders) {
    if (o.status !== 'delivered' || !o.delivered_date) continue;
    const t = orderTotals(o);
    const m = get(monthKey(o.delivered_date));
    m.orders++;
    m.revenue += t.revenue;
    m.profit += t.profit;
    m.lostValue += t.lostValue;
    m.sourcerNet += t.sourcerProfit;
    m.sellerNet += t.sellerProfit;
  }
  for (const c of charges) {
    const m = get(monthKey(c.month));
    m.charges += Number(c.amount);
    m.sourcerNet -= Number(c.amount) / 2;
    m.sellerNet -= Number(c.amount) / 2;
  }
  for (const m of map.values()) m.netProfit = m.profit - m.charges;
  return [...map.values()].sort((a, b) => b.month.localeCompare(a.month));
}

/**
 * Who owes whom. The sourcer pays for the goods and shipping.
 * The seller keeps every deposit, and whoever delivers keeps the rest of the client's payment.
 * Returns a positive number when the seller owes the sourcer, negative the other way round.
 */
export function balance(orders: OrderWithItems[], charges: Charge[], transfers: Transfer[]) {
  let sellerOwes = 0;
  let openSpent = 0;
  let openDeposits = 0;
  for (const o of orders) {
    const t = orderTotals(o);
    if (o.status === 'delivered') {
      // Seller should end up with exactly their profit share; anything above that belongs to the sourcer.
      const sellerHeld = t.deposit + (o.delivered_by === 'seller' ? t.remaining : 0);
      sellerOwes += sellerHeld - t.sellerProfit;
    } else {
      // Deposits of open orders go to the sourcer, who already paid for the goods.
      sellerOwes += t.deposit;
      openSpent += t.cost;
      openDeposits += t.deposit;
    }
  }
  for (const c of charges) {
    const half = Number(c.amount) / 2;
    sellerOwes += c.paid_by === 'sourcer' ? half : -half;
  }
  for (const tr of transfers) {
    sellerOwes += tr.from_role === 'seller' ? -Number(tr.amount) : Number(tr.amount);
  }
  return { sellerOwes, openSpent, openDeposits };
}

export const otherRole = (r: Role): Role => (r === 'sourcer' ? 'seller' : 'sourcer');
