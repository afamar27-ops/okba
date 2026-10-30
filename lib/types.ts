export type Role = 'sourcer' | 'seller';

export const STATUSES = ['confirmed', 'purchased', 'shipped', 'arrived', 'delivered'] as const;
export type Status = (typeof STATUSES)[number];

export const STATUS_LABELS: Record<Status, string> = {
  confirmed: 'Confirmed',
  purchased: 'Purchased in China',
  shipped: 'Shipped',
  arrived: 'Arrived',
  delivered: 'Delivered',
};

export type Profile = { id: string; name: string; role: Role };

export type Client = { id: string; name: string; phone: string | null; owner: Role };

export type OrderItem = {
  id?: string;
  order_id?: string;
  name: string;
  qty_ordered: number;
  qty_received: number | null;
  unit_cost: number;
  unit_price: number;
};

export type Order = {
  id: string;
  client_id: string;
  title: string;
  status: Status;
  order_date: string;
  delivered_date: string | null;
  deposit: number;
  shipping_cost: number;
  other_cost: number;
  sourcer_share_pct: number;
  delivered_by: Role | null;
  notes: string | null;
};

export type OrderWithItems = Order & { order_items: OrderItem[]; clients: Client };

export type Charge = { id: string; month: string; label: string; amount: number; paid_by: Role };

export type Transfer = { id: string; date: string; from_role: Role; amount: number; note: string | null };
