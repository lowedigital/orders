import Link from 'next/link';
import { getServiceClient } from '@/lib/supabase/server';
import { formatCurrency } from '@/lib/format';
import type { OrderStatus } from '@/lib/types';

const ORDER_GROUPS: { label: string; statuses: OrderStatus[] }[] = [
  { label: 'New', statuses: ['order_received', 'confirmed'] },
  { label: 'Awaiting Roast', statuses: ['awaiting_roast'] },
  { label: 'Roasting', statuses: ['roasting', 'cooling'] },
  { label: 'Packaging', statuses: ['packaging'] },
  { label: 'Ready', statuses: ['ready', 'out_for_delivery'] },
  { label: 'Delivered', statuses: ['delivered'] },
];

export default async function AdminDashboardPage() {
  const supabase = getServiceClient();

  const [{ data: orders }, { data: greenCoffee }, { data: packaging }] = await Promise.all([
    supabase.from('orders').select('id, status, total, payment_status, order_date, created_at'),
    supabase.from('green_coffee_inventory').select('id, name, current_weight_g, reorder_threshold_g'),
    supabase.from('packaging_inventory').select('id, name, current_quantity, reorder_threshold'),
  ]);

  const allOrders = orders ?? [];

  const now = new Date();
  const monthOrders = allOrders.filter((o) => {
    const d = new Date(o.order_date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && o.status !== 'cancelled';
  });
  const revenueThisMonth = monthOrders.reduce((sum, o) => sum + Number(o.total), 0);
  const avgOrderValue = monthOrders.length ? revenueThisMonth / monthOrders.length : 0;

  const lowGreenCoffee = (greenCoffee ?? []).filter((g) => Number(g.current_weight_g) < Number(g.reorder_threshold_g));
  const lowPackaging = (packaging ?? []).filter((p) => Number(p.current_quantity) < Number(p.reorder_threshold));
  const awaitingAction = allOrders.filter((o) =>
    ['order_received', 'confirmed', 'ready'].includes(o.status)
  ).length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-2xl text-espresso">Dashboard</h1>
        <p className="text-sm text-espresso-soft">An overview of orders, inventory, and revenue.</p>
      </div>

      {/* Revenue */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Revenue This Month" value={formatCurrency(revenueThisMonth)} />
        <StatCard label="Orders This Month" value={String(monthOrders.length)} />
        <StatCard label="Average Order Value" value={formatCurrency(avgOrderValue)} />
      </div>

      {/* Orders pipeline */}
      <div>
        <h2 className="mb-3 font-serif text-lg text-espresso">Orders</h2>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {ORDER_GROUPS.map((group) => {
            const count = allOrders.filter((o) => group.statuses.includes(o.status as OrderStatus)).length;
            return (
              <Link
                key={group.label}
                href={`/admin/orders?status=${group.statuses[0]}`}
                className="rounded-xl border border-sand bg-cream-card p-4 text-center transition hover:border-roast"
              >
                <p className="text-2xl font-semibold text-espresso">{count}</p>
                <p className="mt-1 text-xs uppercase tracking-wide text-roast-light">{group.label}</p>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Alerts */}
      <div>
        <h2 className="mb-3 font-serif text-lg text-espresso">Alerts</h2>
        <div className="space-y-2">
          {awaitingAction > 0 && (
            <AlertRow text={`${awaitingAction} order${awaitingAction === 1 ? '' : 's'} awaiting action`} href="/admin/orders" />
          )}
          {lowGreenCoffee.map((g) => (
            <AlertRow key={g.id} text={`LOW STOCK — ${g.name} (green coffee)`} href="/admin/inventory" />
          ))}
          {lowPackaging.map((p) => (
            <AlertRow key={p.id} text={`LOW STOCK — ${p.name} (packaging)`} href="/admin/inventory" />
          ))}
          {awaitingAction === 0 && lowGreenCoffee.length === 0 && lowPackaging.length === 0 && (
            <p className="text-sm text-espresso-soft">No alerts right now — everything looks on track.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-sand bg-cream-card p-5">
      <p className="text-xs uppercase tracking-wide text-roast-light">{label}</p>
      <p className="mt-1 font-serif text-2xl text-espresso">{value}</p>
    </div>
  );
}

function AlertRow({ text, href }: { text: string; href: string }) {
  return (
    <Link
      href={href}
      className="block rounded-lg border border-gold-soft bg-gold-soft/30 px-4 py-2.5 text-sm text-espresso transition hover:bg-gold-soft/50"
    >
      {text}
    </Link>
  );
}

export const dynamic = 'force-dynamic';
