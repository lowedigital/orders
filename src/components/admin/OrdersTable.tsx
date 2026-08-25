'use client';

import { useMemo, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { STATUS_META } from '@/lib/orderStatus';
import { formatCurrency, formatDate, labelize } from '@/lib/format';
import type { FulfillmentMethod, OrderStatus, PaymentStatus } from '@/lib/types';

export interface OrderRow {
  id: string;
  order_number: string;
  customer_name: string;
  products: string;
  quantity: number;
  order_date: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  fulfillment_method: FulfillmentMethod;
  total: number;
}

type SortKey = 'order_number' | 'customer_name' | 'order_date' | 'status' | 'payment_status' | 'total';

function TableInner({ rows }: { rows: OrderRow[] }) {
  const searchParams = useSearchParams();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('status') || 'all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [fulfillmentFilter, setFulfillmentFilter] = useState<string>('all');
  const [sortKey, setSortKey] = useState<SortKey>('order_date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  const filtered = useMemo(() => {
    let result = rows;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (r) => r.order_number.toLowerCase().includes(q) || r.customer_name.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'all') result = result.filter((r) => r.status === statusFilter);
    if (paymentFilter !== 'all') result = result.filter((r) => r.payment_status === paymentFilter);
    if (fulfillmentFilter !== 'all') result = result.filter((r) => r.fulfillment_method === fulfillmentFilter);

    const sorted = [...result].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === 'number' && typeof bv === 'number') return av - bv;
      return String(av).localeCompare(String(bv));
    });
    if (sortDir === 'desc') sorted.reverse();
    return sorted;
  }, [rows, search, statusFilter, paymentFilter, fulfillmentFilter, sortKey, sortDir]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search order # or customer…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-sand-dark bg-cream-card px-3 py-2 text-sm focus:border-roast focus:outline-none"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-sand-dark bg-cream-card px-3 py-2 text-sm focus:border-roast focus:outline-none"
        >
          <option value="all">All statuses</option>
          {Object.entries(STATUS_META).map(([key, meta]) => (
            <option key={key} value={key}>
              {meta.label}
            </option>
          ))}
        </select>
        <select
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value)}
          className="rounded-lg border border-sand-dark bg-cream-card px-3 py-2 text-sm focus:border-roast focus:outline-none"
        >
          <option value="all">All payment statuses</option>
          {(['paid', 'unpaid', 'partial', 'refunded'] as PaymentStatus[]).map((p) => (
            <option key={p} value={p}>
              {labelize(p)}
            </option>
          ))}
        </select>
        <select
          value={fulfillmentFilter}
          onChange={(e) => setFulfillmentFilter(e.target.value)}
          className="rounded-lg border border-sand-dark bg-cream-card px-3 py-2 text-sm focus:border-roast focus:outline-none"
        >
          <option value="all">All fulfillment methods</option>
          {(['local_pickup', 'local_delivery', 'shipping'] as FulfillmentMethod[]).map((f) => (
            <option key={f} value={f}>
              {labelize(f)}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-sand bg-cream-card">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead>
            <tr className="border-b border-sand text-xs uppercase tracking-wide text-roast-light">
              <Th label="Order #" onClick={() => toggleSort('order_number')} active={sortKey === 'order_number'} dir={sortDir} />
              <Th label="Customer" onClick={() => toggleSort('customer_name')} active={sortKey === 'customer_name'} dir={sortDir} />
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Qty</th>
              <Th label="Date" onClick={() => toggleSort('order_date')} active={sortKey === 'order_date'} dir={sortDir} />
              <Th label="Status" onClick={() => toggleSort('status')} active={sortKey === 'status'} dir={sortDir} />
              <Th label="Payment" onClick={() => toggleSort('payment_status')} active={sortKey === 'payment_status'} dir={sortDir} />
              <th className="px-4 py-3">Fulfillment</th>
              <Th label="Total" onClick={() => toggleSort('total')} active={sortKey === 'total'} dir={sortDir} />
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.id} className="border-b border-sand last:border-0 hover:bg-cream">
                <td className="px-4 py-3">
                  <Link href={`/admin/orders/${row.id}`} className="font-medium text-roast hover:underline">
                    {row.order_number}
                  </Link>
                </td>
                <td className="px-4 py-3">{row.customer_name}</td>
                <td className="px-4 py-3">{row.products}</td>
                <td className="px-4 py-3">{row.quantity}</td>
                <td className="px-4 py-3">{formatDate(row.order_date)}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-sand px-2 py-1 text-xs">{STATUS_META[row.status]?.label ?? row.status}</span>
                </td>
                <td className="px-4 py-3">{labelize(row.payment_status)}</td>
                <td className="px-4 py-3">{labelize(row.fulfillment_method)}</td>
                <td className="px-4 py-3">{formatCurrency(row.total)}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-espresso-soft">
                  No orders match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ label, onClick, active, dir }: { label: string; onClick: () => void; active: boolean; dir: 'asc' | 'desc' }) {
  return (
    <th className="px-4 py-3">
      <button onClick={onClick} className="flex items-center gap-1 hover:text-espresso">
        {label}
        {active && <span>{dir === 'asc' ? '↑' : '↓'}</span>}
      </button>
    </th>
  );
}

export default function OrdersTable({ rows }: { rows: OrderRow[] }) {
  return (
    <Suspense>
      <TableInner rows={rows} />
    </Suspense>
  );
}
