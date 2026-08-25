'use client';

import { useState, FormEvent } from 'react';
import TrackingTimeline from './TrackingTimeline';
import { formatDate, labelize } from '@/lib/format';
import { STATUS_META } from '@/lib/orderStatus';
import type { PublicTrackingResult } from '@/lib/types';

type ViewState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'result'; order: PublicTrackingResult };

export default function TrackOrderSection() {
  const [orderNumber, setOrderNumber] = useState('');
  const [state, setState] = useState<ViewState>({ kind: 'idle' });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!orderNumber.trim()) return;
    setState({ kind: 'loading' });

    try {
      const res = await fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_number: orderNumber.trim() }),
      });

      if (res.status === 404) {
        setState({
          kind: 'error',
          message: "Double-check your order number and try again.",
        });
        return;
      }

      if (!res.ok) {
        setState({ kind: 'error', message: 'Something went wrong. Please try again in a moment.' });
        return;
      }

      const data = await res.json();
      setState({ kind: 'result', order: data.order });
    } catch {
      setState({ kind: 'error', message: 'Something went wrong. Please try again in a moment.' });
    }
  }

  return (
    <section className="w-full">
      <div className="mx-auto max-w-xl text-center">
        <h1 className="font-serif text-4xl sm:text-5xl text-espresso">Track Your Journey</h1>
        <p className="mt-3 text-espresso-soft">Enter your order number to see where your coffee is.</p>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            placeholder="JR-2026-001"
            className="w-full flex-1 rounded-full border border-sand-dark bg-cream-card px-5 py-3.5 text-center text-espresso placeholder:text-sand-dark focus:border-roast focus:outline-none focus:ring-2 focus:ring-gold-soft sm:text-left"
            autoCapitalize="characters"
          />
          <button
            type="submit"
            disabled={state.kind === 'loading'}
            className="shrink-0 rounded-full bg-espresso px-7 py-3.5 font-medium text-cream transition hover:bg-roast disabled:opacity-60"
          >
            {state.kind === 'loading' ? 'Tracking…' : 'Track Order'}
          </button>
        </form>
      </div>

      <div className="mx-auto mt-10 max-w-2xl">
        {state.kind === 'error' && (
          <div className="rounded-2xl border border-sand bg-cream-card p-8 text-center">
            <p className="font-serif text-2xl text-espresso">Order not found</p>
            <p className="mt-2 text-espresso-soft">{state.message}</p>
          </div>
        )}

        {state.kind === 'result' && (
          <div className="space-y-6">
            <div className="text-center">
              <p className="text-sm uppercase tracking-wide text-roast-light">Order {state.order.order_number}</p>
              <h2 className="mt-1 font-serif text-2xl text-espresso">
                {state.order.items.map((item, i) => (
                  <span key={i}>
                    {i > 0 && <span className="text-espresso-soft"> · </span>}
                    {item.product_name} — {item.size}
                    {item.quantity > 1 ? ` ×${item.quantity}` : ''}
                  </span>
                ))}
              </h2>
              <p className="mt-1 text-sm text-espresso-soft">
                Order placed {formatDate(state.order.order_date)} · {labelize(state.order.fulfillment_method)}
              </p>
              <p className="mt-1 text-xs uppercase tracking-wide text-roast-light">
                Status: {STATUS_META[state.order.status]?.label ?? state.order.status}
              </p>
            </div>

            <TrackingTimeline order={state.order} />
          </div>
        )}
      </div>
    </section>
  );
}
