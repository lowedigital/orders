import { getServiceClient } from '@/lib/supabase/server';
import OrdersTable, { type OrderRow } from '@/components/admin/OrdersTable';

export default async function AdminOrdersPage() {
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from('orders')
    .select(
      `id, order_number, status, payment_status, fulfillment_method, order_date, total,
       customer:customers ( name ),
       items:order_items ( product_name, quantity )`
    )
    .order('order_date', { ascending: false });

  const rows: OrderRow[] = (data ?? []).map((o) => {
    const customer = Array.isArray(o.customer) ? o.customer[0] : o.customer;
    return {
      id: o.id,
      order_number: o.order_number,
      customer_name: customer?.name ?? 'Unknown',
      products: (o.items ?? []).map((i) => `${i.product_name}${i.quantity > 1 ? ` ×${i.quantity}` : ''}`).join(', '),
      quantity: (o.items ?? []).reduce((sum, i) => sum + i.quantity, 0),
      order_date: o.order_date,
      status: o.status,
      payment_status: o.payment_status,
      fulfillment_method: o.fulfillment_method,
      total: Number(o.total),
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-espresso">Orders</h1>
        <p className="text-sm text-espresso-soft">{error ? 'Failed to load orders.' : `${rows.length} total orders.`}</p>
      </div>
      <OrdersTable rows={rows} />
    </div>
  );
}

export const dynamic = 'force-dynamic';
