// Core domain types shared across the app.

export type OrderStatus =
  | 'order_received'
  | 'confirmed'
  | 'awaiting_roast'
  | 'roasting'
  | 'cooling'
  | 'packaging'
  | 'ready'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export type PaymentStatus = 'paid' | 'unpaid' | 'partial' | 'refunded';

export type FulfillmentMethod = 'local_pickup' | 'local_delivery' | 'shipping';

export type GrindType = 'whole_bean' | 'ground';

export type NoteType = 'internal' | 'public';

export interface Product {
  id: string;
  name: string;
  description: string | null;
  origin: string | null;
  roast_level: string | null;
  active: boolean;
  created_at: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  size: string;
  quantity: number;
  grind_type: GrindType;
  price: number;
}

export interface TrackingEvent {
  id: string;
  order_id: string;
  status: OrderStatus;
  public_message: string;
  timestamp: string;
  created_by: string | null;
}

export interface OrderNote {
  id: string;
  order_id: string;
  note_type: NoteType;
  content: string;
  created_by: string | null;
  created_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  status: OrderStatus;
  order_date: string;
  fulfillment_method: FulfillmentMethod;
  payment_status: PaymentStatus;
  total: number;
  roast_batch_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderWithRelations extends Order {
  customer: Customer;
  items: OrderItem[];
  events: TrackingEvent[];
  notes: OrderNote[];
}

export interface GreenCoffeeLot {
  id: string;
  name: string;
  origin: string | null;
  region: string | null;
  process: string | null;
  supplier: string | null;
  current_weight_g: number;
  reorder_threshold_g: number;
  cost_per_lb: number;
  created_at: string;
  updated_at: string;
}

export interface PackagingItem {
  id: string;
  name: string;
  category: string | null;
  current_quantity: number;
  reorder_threshold: number;
  created_at: string;
  updated_at: string;
}

export interface InventoryTransaction {
  id: string;
  inventory_type: 'green_coffee' | 'packaging';
  inventory_id: string;
  change_amount: number;
  reason: string;
  related_roast_batch_id: string | null;
  created_by: string | null;
  created_at: string;
}

export interface RoastBatch {
  id: string;
  batch_id: string;
  product_id: string | null;
  green_coffee_id: string | null;
  green_weight_g: number;
  roasted_weight_g: number | null;
  roast_date: string;
  roast_notes: string | null;
  first_crack: string | null;
  end_temp_f: number | null;
  created_at: string;
}

// Public tracking payload — the ONLY shape ever returned to anonymous users.
// Mirrors get_public_order_tracking() in supabase/migrations/0001_init.sql.
export interface PublicTrackingResult {
  order_number: string;
  status: OrderStatus;
  order_date: string;
  fulfillment_method: FulfillmentMethod;
  items: Array<{
    product_name: string;
    size: string;
    quantity: number;
    grind_type: GrindType;
  }>;
  events: Array<{
    status: OrderStatus;
    public_message: string;
    timestamp: string;
  }>;
  public_notes: Array<{
    content: string;
    created_at: string;
  }>;
}
