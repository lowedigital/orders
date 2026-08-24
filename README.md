# Journey Roasters — Order Tracking System

A full order tracking system for Journey Roasters: a public, no-login USPS-style
tracking page for customers, and a private admin dashboard for running the
fulfillment pipeline, inventory, and roast batches. Built with Next.js
(App Router, TypeScript), Tailwind CSS, and Supabase (Postgres + RLS).

## 1. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com) (or use an existing one).
2. Open **SQL Editor** in your project, paste the entire contents of
   `supabase/migrations/0001_init.sql`, and run it. This creates every table,
   enables Row Level Security, creates the `get_public_order_tracking()` RPC
   the public page uses, and seeds the three products, three green coffee
   lots, and packaging items described in the spec.
3. Go to **Settings → API** and copy:
   - **Project URL**
   - **anon / public** key
   - **service_role** key (keep this secret — server-only)

## 2. Configure environment variables

Copy `.env.example` to `.env.local` and fill in the values from Supabase, plus
your admin credentials:

```bash
cp .env.example .env.local
```

```
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin
ADMIN_SESSION_SECRET=<run: openssl rand -base64 32>
```

**Change `ADMIN_USERNAME`/`ADMIN_PASSWORD` away from the `admin`/`admin`
defaults before this goes anywhere near the public internet**, and set a real
random `ADMIN_SESSION_SECRET`. All three are read from the environment only —
no code changes needed to rotate them.

## 3. Run it

```bash
npm install
npm run dev
```

- Public tracking page: `http://localhost:3000`
- Admin sign-in: `http://localhost:3000/admin/login` (not linked from the
  public site — bookmark it)

## How it's organized

```
src/
  app/
    page.tsx                  Public tracking homepage
    api/track/route.ts        Public tracking endpoint (calls the RPC only)
    api/admin/login|logout    Admin session endpoints
    admin/login/page.tsx      Admin sign-in (outside the dashboard layout)
    admin/(dashboard)/        Everything behind the admin session cookie:
      page.tsx                  overview: pipeline counts, alerts, revenue
      orders/                   list (sortable/filterable), detail, new-order
      inventory/                green coffee + packaging, low-stock alerts
      roast-batches/            batch creation + inventory deduction
      customers/                read-only customer list
      actions.ts                every admin mutation (Server Actions)
    middleware.ts              Gates /admin/* and /api/admin/* on the session
  components/                  Public + admin UI components
  lib/
    supabase/server.ts         service_role client — SERVER-ONLY, bypasses RLS
    supabase/public.ts         anon client — used only to call the public RPC
    auth.ts                    signed-cookie admin session (Web Crypto HMAC)
    orderStatus.ts             the 9-step pipeline + cancelled, labels/messages
supabase/migrations/0001_init.sql   full schema, RLS, RPC, seed data
```

## How the security model works

- **Every table has Row Level Security enabled with no policies for
  `anon`/`authenticated`.** A browser using the anon key gets zero rows from
  any direct table query — full stop.
- The **only** way anonymous visitors get data is
  `get_public_order_tracking(order_number)`, a `SECURITY DEFINER` Postgres
  function that looks up the order and hand-picks exactly: order number,
  product name/size/qty/grind, order date, fulfillment method, status, the
  public tracking events, and public notes. It never touches customer PII,
  payment status, cost, internal notes, or other orders. `EXEC` on this
  function (and on `generate_order_number()`, used only for creating orders)
  is explicitly granted only to the roles that should have it.
- The **admin dashboard never uses Supabase Auth** — it authenticates with a
  simple, signed session cookie (HMAC-SHA256 over a JSON payload, verified in
  `middleware.ts`) checked against `ADMIN_USERNAME`/`ADMIN_PASSWORD`. All
  admin reads/writes go through the `service_role` key from Server Actions/
  Route Handlers only — that key is never sent to the browser.
- Every order status change writes a permanent, timestamped `tracking_events`
  row — the public timeline is built entirely from this table, never
  hard-coded. Reversing a status removes the event for the status being left
  (so the public timeline never shows a step the order isn't actually at) and
  logs the correction as an internal note.
- Every roast batch creation deducts the green coffee it used and writes a
  row to `inventory_transactions` — inventory never changes silently.

## Deploying

This is a stock Next.js App Router project — deploy to Vercel (or any
Next.js-compatible host) and set the same environment variables from step 2
in the project's dashboard.
