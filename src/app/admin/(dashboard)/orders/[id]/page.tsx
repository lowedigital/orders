import { notFound } from 'next/navigation';
import { getServiceClient } from '@/lib/supabase/server';
import OrderDetail from '@/components/admin/OrderDetail';

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getServiceClient();

  const [{ data: order }, { data: batches }] = await Promise.all([
    supabase
      .from('orders')
      .select(
        `*, customer:customers(*), items:order_items(*), events:tracking_events(*), notes:order_notes(*)`
      )
      .eq('id', id)
      .single(),
    supabase.from('roast_batches').select('id, batch_id').order('roast_date', { ascending: false }),
  ]);

  if (!order) notFound();

  const customer = Array.isArray(order.customer) ? order.customer[0] : order.customer;
  const events = (order.events ?? []).sort(
    (a: { timestamp: string }, b: { timestamp: string }) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  const notes = (order.notes ?? []).sort(
    (a: { created_at: string }, b: { created_at: string }) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <OrderDetail
      order={{ ...order, customer, events, notes, items: order.items ?? [] }}
      roastBatches={batches ?? []}
    />
  );
}

export const dynamic = 'force-dynamic';
