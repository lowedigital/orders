import Link from 'next/link';
import { getServiceClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/format';

export default async function CustomersPage() {
  const supabase = getServiceClient();
  const { data: customers } = await supabase
    .from('customers')
    .select('*, orders:orders(id, order_number)')
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-espresso">Customers</h1>
        <p className="text-sm text-espresso-soft">{customers?.length ?? 0} customers on file.</p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-sand bg-cream-card">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead>
            <tr className="border-b border-sand text-xs uppercase tracking-wide text-roast-light">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Since</th>
              <th className="px-4 py-3">Orders</th>
            </tr>
          </thead>
          <tbody>
            {(customers ?? []).map((c) => (
              <tr key={c.id} className="border-b border-sand last:border-0">
                <td className="px-4 py-3">{c.name}</td>
                <td className="px-4 py-3">{c.email || '—'}</td>
                <td className="px-4 py-3">{c.phone || '—'}</td>
                <td className="px-4 py-3">{formatDate(c.created_at)}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    {(c.orders ?? []).map((o: { id: string; order_number: string }) => (
                      <Link key={o.id} href={`/admin/orders/${o.id}`} className="text-roast hover:underline">
                        {o.order_number}
                      </Link>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
            {(customers ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-espresso-soft">
                  No customers yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export const dynamic = 'force-dynamic';
