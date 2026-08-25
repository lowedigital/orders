-- Journey Roasters Order Tracking System
-- Initial schema, RLS policies, and public tracking RPC.

-- ============================================================================
-- EXTENSIONS
-- ============================================================================
create extension if not exists "pgcrypto";

-- ============================================================================
-- PRODUCTS
-- ============================================================================
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  origin text,
  roast_level text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- CUSTOMERS
-- ============================================================================
create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  address text,
  notes text,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- ORDER NUMBER SEQUENCE
-- ============================================================================
create table if not exists order_number_counters (
  year int primary key,
  last_number int not null default 0
);

create or replace function generate_order_number()
returns text
language plpgsql
as $$
declare
  yr int := extract(year from now());
  next_num int;
begin
  insert into order_number_counters (year, last_number)
  values (yr, 1)
  on conflict (year)
  do update set last_number = order_number_counters.last_number + 1
  returning last_number into next_num;

  return 'JR-' || yr || '-' || lpad(next_num::text, 3, '0');
end;
$$;

-- Admin-only: called from the server (service_role) when creating an order.
-- Not exposed to anon/authenticated to prevent number-burning abuse.
revoke all on function generate_order_number() from public;
grant execute on function generate_order_number() to service_role;

-- ============================================================================
-- ROAST BATCHES (referenced by orders)
-- ============================================================================
create table if not exists roast_batches (
  id uuid primary key default gen_random_uuid(),
  batch_id text not null unique,
  product_id uuid references products(id),
  green_coffee_id uuid,
  green_weight_g numeric not null,
  roasted_weight_g numeric,
  roast_date date not null default current_date,
  roast_notes text,
  first_crack text,
  end_temp_f numeric,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- ORDERS
-- ============================================================================
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_id uuid not null references customers(id) on delete restrict,
  status text not null default 'order_received' check (status in (
    'order_received', 'confirmed', 'awaiting_roast', 'roasting', 'cooling',
    'packaging', 'ready', 'out_for_delivery', 'delivered', 'cancelled'
  )),
  order_date timestamptz not null default now(),
  fulfillment_method text not null check (fulfillment_method in ('local_pickup', 'local_delivery', 'shipping')),
  payment_status text not null default 'unpaid' check (payment_status in ('paid', 'unpaid', 'partial', 'refunded')),
  total numeric not null default 0,
  roast_batch_id uuid references roast_batches(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_orders_order_number on orders(order_number);
create index if not exists idx_orders_status on orders(status);
create index if not exists idx_orders_customer on orders(customer_id);

-- ============================================================================
-- ORDER ITEMS
-- ============================================================================
create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id),
  product_name text not null,
  size text not null,
  quantity int not null default 1,
  grind_type text not null default 'whole_bean' check (grind_type in ('whole_bean', 'ground')),
  price numeric not null default 0
);

create index if not exists idx_order_items_order on order_items(order_id);

-- ============================================================================
-- TRACKING EVENTS (public timeline)
-- ============================================================================
create table if not exists tracking_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  status text not null,
  public_message text not null,
  timestamp timestamptz not null default now(),
  created_by text
);

create index if not exists idx_tracking_events_order on tracking_events(order_id);

-- ============================================================================
-- ORDER NOTES (internal vs public, ad-hoc, not tied to a status change)
-- ============================================================================
create table if not exists order_notes (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  note_type text not null check (note_type in ('internal', 'public')),
  content text not null,
  created_by text,
  created_at timestamptz not null default now()
);

create index if not exists idx_order_notes_order on order_notes(order_id);

-- ============================================================================
-- GREEN COFFEE INVENTORY
-- ============================================================================
create table if not exists green_coffee_inventory (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  origin text,
  region text,
  process text,
  supplier text,
  current_weight_g numeric not null default 0,
  reorder_threshold_g numeric not null default 0,
  cost_per_lb numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table roast_batches
  add constraint roast_batches_green_coffee_fk
  foreign key (green_coffee_id) references green_coffee_inventory(id);

-- ============================================================================
-- PACKAGING INVENTORY
-- ============================================================================
create table if not exists packaging_inventory (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  current_quantity int not null default 0,
  reorder_threshold int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- INVENTORY TRANSACTIONS (audit trail, never silently change inventory)
-- ============================================================================
create table if not exists inventory_transactions (
  id uuid primary key default gen_random_uuid(),
  inventory_type text not null check (inventory_type in ('green_coffee', 'packaging')),
  inventory_id uuid not null,
  change_amount numeric not null,
  reason text not null,
  related_roast_batch_id uuid references roast_batches(id),
  created_by text,
  created_at timestamptz not null default now()
);

create index if not exists idx_inventory_tx_inventory on inventory_transactions(inventory_type, inventory_id);

-- ============================================================================
-- updated_at triggers
-- ============================================================================
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_orders_updated_at on orders;
create trigger trg_orders_updated_at before update on orders
  for each row execute function set_updated_at();

drop trigger if exists trg_green_coffee_updated_at on green_coffee_inventory;
create trigger trg_green_coffee_updated_at before update on green_coffee_inventory
  for each row execute function set_updated_at();

drop trigger if exists trg_packaging_updated_at on packaging_inventory;
create trigger trg_packaging_updated_at before update on packaging_inventory
  for each row execute function set_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY — deny-by-default for every table.
-- Admin operations use the service_role key server-side only, which bypasses
-- RLS entirely. Public (anon) access is granted ONLY through the
-- get_public_order_tracking() SECURITY DEFINER function below.
-- ============================================================================
alter table products enable row level security;
alter table customers enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table tracking_events enable row level security;
alter table order_notes enable row level security;
alter table green_coffee_inventory enable row level security;
alter table packaging_inventory enable row level security;
alter table inventory_transactions enable row level security;
alter table roast_batches enable row level security;
alter table order_number_counters enable row level security;

-- No policies are created for anon/authenticated roles on any table above,
-- which means (with RLS enabled) anonymous/browser clients get zero rows
-- from direct table access. All public reads go through the RPC below.

-- ============================================================================
-- PUBLIC TRACKING RPC
-- Accepts an order number, returns ONLY safe public fields + the public
-- timeline + public notes. Never returns customer PII, payment info,
-- internal notes, cost/profit data, or other orders.
-- ============================================================================
create or replace function get_public_order_tracking(p_order_number text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order orders%rowtype;
  v_items json;
  v_events json;
  v_notes json;
  v_result json;
begin
  select * into v_order
  from orders
  where order_number = upper(trim(p_order_number))
  limit 1;

  if not found then
    return null;
  end if;

  select coalesce(json_agg(json_build_object(
    'product_name', oi.product_name,
    'size', oi.size,
    'quantity', oi.quantity,
    'grind_type', oi.grind_type
  )), '[]'::json)
  into v_items
  from order_items oi
  where oi.order_id = v_order.id;

  select coalesce(json_agg(json_build_object(
    'status', te.status,
    'public_message', te.public_message,
    'timestamp', te.timestamp
  ) order by te.timestamp asc), '[]'::json)
  into v_events
  from tracking_events te
  where te.order_id = v_order.id;

  select coalesce(json_agg(json_build_object(
    'content', n.content,
    'created_at', n.created_at
  ) order by n.created_at asc), '[]'::json)
  into v_notes
  from order_notes n
  where n.order_id = v_order.id and n.note_type = 'public';

  v_result := json_build_object(
    'order_number', v_order.order_number,
    'status', v_order.status,
    'order_date', v_order.order_date,
    'fulfillment_method', v_order.fulfillment_method,
    'items', v_items,
    'events', v_events,
    'public_notes', v_notes
  );

  return v_result;
end;
$$;

-- Lock the function down, then grant execute only to anon + authenticated.
revoke all on function get_public_order_tracking(text) from public;
grant execute on function get_public_order_tracking(text) to anon, authenticated;

-- ============================================================================
-- SEED DATA
-- ============================================================================
insert into products (name, description, origin, roast_level, active)
values
  ('FIRST LIGHT', 'A bright, balanced medium roast.', 'Colombia', 'Medium', true),
  ('SUMMIT', 'A vibrant, floral light roast.', 'Papua New Guinea', 'Light', true),
  ('JOURNEY ROAST', 'A bold, rich dark roast blend.', 'Brazil/Guatemala', 'Dark', true)
on conflict do nothing;

insert into green_coffee_inventory (name, origin, region, process, supplier, current_weight_g, reorder_threshold_g, cost_per_lb)
values
  ('Colombia Huila', 'Colombia', 'Huila', 'Washed', 'Huila Cooperative', 9071.85, 4535.92, 6.50),  -- ~20 lb
  ('Brazil', 'Brazil', 'Cerrado', 'Natural', 'Cerrado Direct Trade', 13607.77, 4535.92, 5.25),      -- ~30 lb
  ('Papua New Guinea', 'Papua New Guinea', 'Eastern Highlands', 'Washed', 'PNG Highlands Coop', 6803.89, 3175.15, 7.75) -- ~15 lb
on conflict do nothing;

insert into packaging_inventory (name, category, current_quantity, reorder_threshold)
values
  ('8 oz bags', 'bags', 500, 100),
  ('1 lb bags', 'bags', 500, 100),
  ('Labels', 'labels', 1000, 200),
  ('Shipping mailers', 'shipping', 250, 50)
on conflict do nothing;
