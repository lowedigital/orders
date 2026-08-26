'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createRoastBatch } from '@/app/admin/(dashboard)/actions';
import { formatDate, formatWeightFromGrams, productCode } from '@/lib/format';
import type { RoastBatch } from '@/lib/types';

interface Row extends RoastBatch {
  product_name?: string;
}

export default function RoastBatchManager({
  batches,
  products,
  greenCoffee,
}: {
  batches: Row[];
  products: { id: string; name: string }[];
  greenCoffee: { id: string; name: string; current_weight_g: number }[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    product_id: products[0]?.id ?? '',
    green_coffee_id: greenCoffee[0]?.id ?? '',
    green_weight_g: 0,
    roasted_weight_g: 0,
    roast_date: new Date().toISOString().slice(0, 10),
    roast_notes: '',
    first_crack: '',
    end_temp_f: 0,
  });

  const selectedProduct = products.find((p) => p.id === form.product_id);

  function submit() {
    setError('');
    if (!form.product_id || !form.green_coffee_id || form.green_weight_g <= 0) {
      setError('Product, green coffee, and a green weight are required.');
      return;
    }
    startTransition(async () => {
      try {
        const result = await createRoastBatch({
          ...form,
          product_code: productCode(selectedProduct?.name ?? 'XX'),
          roasted_weight_g: form.roasted_weight_g || undefined,
          end_temp_f: form.end_temp_f || undefined,
        });
        if (!result.success) {
          setError(result.error);
          return;
        }
        setShowForm(false);
        router.refresh();
      } catch {
        setError('Could not reach the database. Check your Supabase environment variables.');
      }
    });
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-serif text-lg text-espresso">All Batches</h2>
        <button onClick={() => setShowForm((s) => !s)} className="text-sm text-roast hover:underline">
          {showForm ? 'Cancel' : '+ New batch'}
        </button>
      </div>

      {error && <p className="mb-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

      {showForm && (
        <div className="mb-6 grid gap-3 rounded-xl border border-sand bg-cream-card p-4 sm:grid-cols-3">
          <div>
            <label className={labelCls}>Product</label>
            <select value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })} className={inputCls}>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Green Coffee</label>
            <select
              value={form.green_coffee_id}
              onChange={(e) => setForm({ ...form, green_coffee_id: e.target.value })}
              className={inputCls}
            >
              {greenCoffee.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({formatWeightFromGrams(Number(g.current_weight_g))} on hand)
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Roast Date</label>
            <input
              type="date"
              value={form.roast_date}
              onChange={(e) => setForm({ ...form, roast_date: e.target.value })}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Green Weight (g)</label>
            <input
              type="number"
              value={form.green_weight_g}
              onChange={(e) => setForm({ ...form, green_weight_g: Number(e.target.value) })}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Roasted Weight (g)</label>
            <input
              type="number"
              value={form.roasted_weight_g}
              onChange={(e) => setForm({ ...form, roasted_weight_g: Number(e.target.value) })}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>End Temp (°F)</label>
            <input
              type="number"
              value={form.end_temp_f}
              onChange={(e) => setForm({ ...form, end_temp_f: Number(e.target.value) })}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>First Crack</label>
            <input
              placeholder="e.g. 9:42"
              value={form.first_crack}
              onChange={(e) => setForm({ ...form, first_crack: e.target.value })}
              className={inputCls}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Roast Notes</label>
            <input
              value={form.roast_notes}
              onChange={(e) => setForm({ ...form, roast_notes: e.target.value })}
              className={inputCls}
            />
          </div>

          <p className="text-xs text-espresso-soft sm:col-span-3">
            Batch ID will be generated as{' '}
            <span className="font-mono">
              {productCode(selectedProduct?.name ?? 'XX')}-{form.roast_date.replace(/-/g, '').slice(2)}-01
            </span>{' '}
            (sequence increments automatically if more than one batch that day).
          </p>

          <button
            disabled={isPending}
            onClick={submit}
            className="rounded-lg bg-espresso px-4 py-2 text-sm font-medium text-cream hover:bg-roast disabled:opacity-60 sm:col-span-3"
          >
            {isPending ? 'Saving…' : 'Create Batch'}
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-sand bg-cream-card">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead>
            <tr className="border-b border-sand text-xs uppercase tracking-wide text-roast-light">
              <th className="px-4 py-3">Batch ID</th>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Roast Date</th>
              <th className="px-4 py-3">Green Wt</th>
              <th className="px-4 py-3">Roasted Wt</th>
              <th className="px-4 py-3">First Crack</th>
              <th className="px-4 py-3">End Temp</th>
            </tr>
          </thead>
          <tbody>
            {batches.map((b) => (
              <tr key={b.id} className="border-b border-sand last:border-0">
                <td className="px-4 py-3 font-mono">{b.batch_id}</td>
                <td className="px-4 py-3">{b.product_name}</td>
                <td className="px-4 py-3">{formatDate(b.roast_date)}</td>
                <td className="px-4 py-3">{formatWeightFromGrams(Number(b.green_weight_g))}</td>
                <td className="px-4 py-3">{b.roasted_weight_g ? formatWeightFromGrams(Number(b.roasted_weight_g)) : '—'}</td>
                <td className="px-4 py-3">{b.first_crack || '—'}</td>
                <td className="px-4 py-3">{b.end_temp_f ? `${b.end_temp_f}°F` : '—'}</td>
              </tr>
            ))}
            {batches.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-espresso-soft">
                  No roast batches yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const inputCls = 'mt-1 w-full rounded-lg border border-sand-dark bg-cream px-3 py-2 text-sm focus:border-roast focus:outline-none';
const labelCls = 'block text-xs font-medium uppercase tracking-wide text-roast-light';
