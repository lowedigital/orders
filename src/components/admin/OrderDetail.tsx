'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  advanceOrderStatus,
  reverseOrderStatus,
  cancelOrder,
  setOrderStatus,
  updateOrderPaymentStatus,
  associateOrderWithBatch,
  addOrderNote,
} from '@/app/admin/(dashboard)/actions';
import { ACTIVE_STATUS_FLOW, ALL_STATUSES, STATUS_META, advanceLabelFor, statusIndex } from '@/lib/orderStatus';
import { formatCurrency, formatDate, formatDateTime, labelize } from '@/lib/format';
import type {
  Customer,
  NoteType,
  Order,
  OrderItem,
  OrderNote,
  OrderStatus,
  PaymentStatus,
  TrackingEvent,
} from '@/lib/types';

interface FullOrder extends Order {
  customer: Customer;
  items: OrderItem[];
  events: TrackingEvent[];
  notes: OrderNote[];
}

export default function OrderDetail({
  order,
  roastBatches,
}: {
  order: FullOrder;
  roastBatches: { id: string; batch_id: string }[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [noteType, setNoteType] = useState<NoteType>('public');
  const [noteContent, setNoteContent] = useState('');

  function refresh() {
    router.refresh();
  }

  function run(action: () => Promise<{ success: boolean; error?: string }>) {
    setError('');
    startTransition(async () => {
      const result = await action();
      if (!result.success) setError(result.error || 'Something went wrong.');
      else refresh();
    });
  }

  const isCancelled = order.status === 'cancelled';
  const isFinal = order.status === 'delivered';
  const canReverse = !isCancelled && statusIndex(order.status) > 0;
  const canAdvance = !isCancelled && !isFinal;

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <p className="text-sm uppercase tracking-wide text-roast-light">Order</p>
        <h1 className="font-serif text-3xl text-espresso">{order.order_number}</h1>
        <p className="mt-1 text-espresso-soft">
          {order.items.map((i) => `${i.product_name} — ${i.size}${i.quantity > 1 ? ` ×${i.quantity}` : ''}`).join(', ')}
        </p>
        <p className="mt-1 text-sm text-espresso-soft">Customer: {order.customer?.name}</p>
      </div>

      {error && <p className="rounded-lg bg-danger/10 px-4 py-2 text-sm text-danger">{error}</p>}

      {/* Status pipeline */}
      <section className="rounded-xl border border-sand bg-cream-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-roast-light">Status</p>
            <p className="font-serif text-xl text-espresso">{STATUS_META[order.status]?.label}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canReverse && (
              <button
                disabled={isPending}
                onClick={() => run(() => reverseOrderStatus(order.id))}
                className="rounded-lg border border-sand-dark px-4 py-2 text-sm text-espresso-soft transition hover:bg-sand disabled:opacity-60"
              >
                ← Reverse
              </button>
            )}
            {canAdvance && (
              <button
                disabled={isPending}
                onClick={() => run(() => advanceOrderStatus(order.id))}
                className="rounded-lg bg-espresso px-5 py-2 text-sm font-medium text-cream transition hover:bg-roast disabled:opacity-60"
              >
                {advanceLabelFor(order.status, order.fulfillment_method)}
              </button>
            )}
            {!isCancelled && (
              <button
                disabled={isPending}
                onClick={() => {
                  const reason = window.prompt('Reason for cancelling (optional):') || undefined;
                  run(() => cancelOrder(order.id, reason));
                }}
                className="rounded-lg border border-danger px-4 py-2 text-sm text-danger transition hover:bg-danger/10 disabled:opacity-60"
              >
                Cancel Order
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 text-xs text-espresso-soft">
          <span>Jump to any status:</span>
          <select
            disabled={isPending}
            value={order.status}
            onChange={(e) => run(() => setOrderStatus(order.id, e.target.value as OrderStatus))}
            className="rounded-lg border border-sand-dark bg-cream px-2 py-1"
          >
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_META[s].label}
              </option>
            ))}
          </select>
        </div>

        <ol className="mt-6 flex flex-wrap gap-2">
          {ACTIVE_STATUS_FLOW.map((s, idx) => {
            const done = idx <= statusIndex(order.status) && !isCancelled;
            return (
              <li
                key={s}
                className={`rounded-full px-3 py-1 text-xs ${
                  done ? 'bg-roast text-cream' : 'bg-sand text-espresso-soft'
                }`}
              >
                {STATUS_META[s].label}
              </li>
            );
          })}
        </ol>
      </section>

      {/* Order info grid */}
      <div className="grid gap-6 sm:grid-cols-2">
        <section className="rounded-xl border border-sand bg-cream-card p-5">
          <h2 className="mb-3 font-serif text-lg text-espresso">Customer</h2>
          <dl className="space-y-1 text-sm">
            <Row label="Name" value={order.customer?.name} />
            <Row label="Email" value={order.customer?.email} />
            <Row label="Phone" value={order.customer?.phone} />
            <Row label="Address" value={order.customer?.address} />
            {order.customer?.notes && <Row label="Notes" value={order.customer.notes} />}
          </dl>
        </section>

        <section className="rounded-xl border border-sand bg-cream-card p-5">
          <h2 className="mb-3 font-serif text-lg text-espresso">Order Info</h2>
          <dl className="space-y-1 text-sm">
            <Row label="Order Date" value={formatDate(order.order_date)} />
            <Row label="Fulfillment" value={labelize(order.fulfillment_method)} />
            <Row label="Total" value={formatCurrency(order.total)} />
            <div className="flex justify-between py-1">
              <dt className="text-espresso-soft">Payment</dt>
              <dd>
                <select
                  disabled={isPending}
                  value={order.payment_status}
                  onChange={(e) => run(() => updateOrderPaymentStatus(order.id, e.target.value as PaymentStatus))}
                  className="rounded-lg border border-sand-dark bg-cream px-2 py-1 text-sm"
                >
                  {(['unpaid', 'paid', 'partial', 'refunded'] as PaymentStatus[]).map((p) => (
                    <option key={p} value={p}>
                      {labelize(p)}
                    </option>
                  ))}
                </select>
              </dd>
            </div>
            <div className="flex justify-between py-1">
              <dt className="text-espresso-soft">Roast Batch</dt>
              <dd>
                <select
                  disabled={isPending}
                  value={order.roast_batch_id ?? ''}
                  onChange={(e) => run(() => associateOrderWithBatch(order.id, e.target.value || null))}
                  className="rounded-lg border border-sand-dark bg-cream px-2 py-1 text-sm"
                >
                  <option value="">Not assigned</option>
                  {roastBatches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.batch_id}
                    </option>
                  ))}
                </select>
              </dd>
            </div>
          </dl>
        </section>
      </div>

      {/* Items */}
      <section className="rounded-xl border border-sand bg-cream-card p-5">
        <h2 className="mb-3 font-serif text-lg text-espresso">Items</h2>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-roast-light">
              <th className="py-1">Product</th>
              <th className="py-1">Size</th>
              <th className="py-1">Grind</th>
              <th className="py-1">Qty</th>
              <th className="py-1">Price</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id} className="border-t border-sand">
                <td className="py-2">{item.product_name}</td>
                <td className="py-2">{item.size}</td>
                <td className="py-2">{labelize(item.grind_type)}</td>
                <td className="py-2">{item.quantity}</td>
                <td className="py-2">{formatCurrency(item.price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Notes */}
      <section className="rounded-xl border border-sand bg-cream-card p-5">
        <h2 className="mb-3 font-serif text-lg text-espresso">Notes</h2>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row">
          <select
            value={noteType}
            onChange={(e) => setNoteType(e.target.value as NoteType)}
            className="rounded-lg border border-sand-dark bg-cream px-2 py-2 text-sm"
          >
            <option value="public">Public Tracking Note</option>
            <option value="internal">Internal Note</option>
          </select>
          <input
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            placeholder="Write a note…"
            className="flex-1 rounded-lg border border-sand-dark bg-cream px-3 py-2 text-sm focus:border-roast focus:outline-none"
          />
          <button
            disabled={isPending || !noteContent.trim()}
            onClick={() =>
              run(async () => {
                const result = await addOrderNote(order.id, noteType, noteContent);
                if (result.success) setNoteContent('');
                return result;
              })
            }
            className="rounded-lg bg-espresso px-4 py-2 text-sm font-medium text-cream transition hover:bg-roast disabled:opacity-60"
          >
            Add Note
          </button>
        </div>

        <div className="space-y-2">
          {order.notes.length === 0 && <p className="text-sm text-espresso-soft">No notes yet.</p>}
          {order.notes.map((n) => (
            <div key={n.id} className="rounded-lg border border-sand p-3 text-sm">
              <div className="flex items-center justify-between">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs uppercase tracking-wide ${
                    n.note_type === 'public' ? 'bg-gold-soft text-espresso' : 'bg-sand text-espresso-soft'
                  }`}
                >
                  {n.note_type === 'public' ? 'Public' : 'Internal'}
                </span>
                <span className="text-xs text-roast-light">{formatDateTime(n.created_at)}</span>
              </div>
              <p className="mt-2 text-espresso-soft">{n.content}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Tracking events */}
      <section className="rounded-xl border border-sand bg-cream-card p-5">
        <h2 className="mb-3 font-serif text-lg text-espresso">Tracking Timeline (public)</h2>
        <div className="space-y-3">
          {order.events.map((e) => (
            <div key={e.id} className="border-l-2 border-sand-dark pl-3 text-sm">
              <p className="font-medium text-espresso">{STATUS_META[e.status]?.label ?? e.status}</p>
              <p className="text-espresso-soft">{e.public_message}</p>
              <p className="text-xs text-roast-light">{formatDateTime(e.timestamp)}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4 py-1">
      <dt className="shrink-0 text-espresso-soft">{label}</dt>
      <dd className="text-right text-espresso">{value}</dd>
    </div>
  );
}
