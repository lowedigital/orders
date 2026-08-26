'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  adjustGreenCoffeeLot,
  adjustPackagingItem,
  createGreenCoffeeLot,
  createPackagingItem,
} from '@/app/admin/(dashboard)/actions';
import { formatWeightFromGrams } from '@/lib/format';
import type { GreenCoffeeLot, PackagingItem } from '@/lib/types';

export default function InventoryManager({
  greenCoffee,
  packaging,
}: {
  greenCoffee: GreenCoffeeLot[];
  packaging: PackagingItem[];
}) {
  return (
    <div className="space-y-10">
      <GreenCoffeeSection lots={greenCoffee} />
      <PackagingSection items={packaging} />
    </div>
  );
}

function GreenCoffeeSection({ lots }: { lots: GreenCoffeeLot[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    origin: '',
    region: '',
    process: '',
    supplier: '',
    current_weight_g: 0,
    reorder_threshold_g: 0,
    cost_per_lb: 0,
  });
  const [error, setError] = useState('');

  function submitNewLot() {
    setError('');
    startTransition(async () => {
      try {
        const result = await createGreenCoffeeLot(form);
        if (!result.success) setError(result.error);
        else {
          setShowForm(false);
          setForm({ name: '', origin: '', region: '', process: '', supplier: '', current_weight_g: 0, reorder_threshold_g: 0, cost_per_lb: 0 });
          router.refresh();
        }
      } catch {
        setError('Could not reach the database. Check your Supabase environment variables.');
      }
    });
  }

  function adjust(id: string) {
    const amountStr = window.prompt('Change amount in grams (use a negative number to deduct):', '0');
    if (amountStr === null) return;
    const amount = Number(amountStr);
    if (Number.isNaN(amount) || amount === 0) return;
    const reason = window.prompt('Reason for this adjustment:') || 'Manual adjustment';
    startTransition(async () => {
      try {
        const result = await adjustGreenCoffeeLot(id, amount, reason);
        if (!result.success) setError(result.error);
        else router.refresh();
      } catch {
        setError('Could not reach the database. Check your Supabase environment variables.');
      }
    });
  }

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-serif text-lg text-espresso">Green Coffee</h2>
        <button onClick={() => setShowForm((s) => !s)} className="text-sm text-roast hover:underline">
          {showForm ? 'Cancel' : '+ Add lot'}
        </button>
      </div>

      {error && <p className="mb-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

      {showForm && (
        <div className="mb-4 grid gap-3 rounded-xl border border-sand bg-cream-card p-4 sm:grid-cols-4">
          <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
          <input placeholder="Origin" value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })} className={inputCls} />
          <input placeholder="Region" value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} className={inputCls} />
          <input placeholder="Process" value={form.process} onChange={(e) => setForm({ ...form, process: e.target.value })} className={inputCls} />
          <input placeholder="Supplier" value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} className={inputCls} />
          <input
            type="number"
            placeholder="Current weight (g)"
            value={form.current_weight_g}
            onChange={(e) => setForm({ ...form, current_weight_g: Number(e.target.value) })}
            className={inputCls}
          />
          <input
            type="number"
            placeholder="Reorder threshold (g)"
            value={form.reorder_threshold_g}
            onChange={(e) => setForm({ ...form, reorder_threshold_g: Number(e.target.value) })}
            className={inputCls}
          />
          <input
            type="number"
            step="0.01"
            placeholder="Cost per lb"
            value={form.cost_per_lb}
            onChange={(e) => setForm({ ...form, cost_per_lb: Number(e.target.value) })}
            className={inputCls}
          />
          <button
            disabled={isPending || !form.name}
            onClick={submitNewLot}
            className="rounded-lg bg-espresso px-4 py-2 text-sm font-medium text-cream hover:bg-roast disabled:opacity-60 sm:col-span-4"
          >
            Save Lot
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-sand bg-cream-card">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead>
            <tr className="border-b border-sand text-xs uppercase tracking-wide text-roast-light">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Origin</th>
              <th className="px-4 py-3">Current</th>
              <th className="px-4 py-3">Threshold</th>
              <th className="px-4 py-3">Cost/lb</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {lots.map((lot) => {
              const low = Number(lot.current_weight_g) < Number(lot.reorder_threshold_g);
              return (
                <tr key={lot.id} className="border-b border-sand last:border-0">
                  <td className="px-4 py-3">
                    {lot.name}
                    {low && <span className="ml-2 rounded-full bg-danger/10 px-2 py-0.5 text-xs font-semibold text-danger">LOW STOCK</span>}
                  </td>
                  <td className="px-4 py-3">{[lot.origin, lot.region].filter(Boolean).join(', ')}</td>
                  <td className="px-4 py-3">{formatWeightFromGrams(Number(lot.current_weight_g))}</td>
                  <td className="px-4 py-3">{formatWeightFromGrams(Number(lot.reorder_threshold_g))}</td>
                  <td className="px-4 py-3">${Number(lot.cost_per_lb).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => adjust(lot.id)} className="text-sm text-roast hover:underline">
                      Adjust
                    </button>
                  </td>
                </tr>
              );
            })}
            {lots.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-espresso-soft">
                  No green coffee lots yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function PackagingSection({ items }: { items: PackagingItem[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', category: '', current_quantity: 0, reorder_threshold: 0 });
  const [error, setError] = useState('');

  function submitNewItem() {
    setError('');
    startTransition(async () => {
      try {
        const result = await createPackagingItem(form);
        if (!result.success) setError(result.error);
        else {
          setShowForm(false);
          setForm({ name: '', category: '', current_quantity: 0, reorder_threshold: 0 });
          router.refresh();
        }
      } catch {
        setError('Could not reach the database. Check your Supabase environment variables.');
      }
    });
  }

  function adjust(id: string) {
    const amountStr = window.prompt('Change amount (use a negative number to deduct):', '0');
    if (amountStr === null) return;
    const amount = Number(amountStr);
    if (Number.isNaN(amount) || amount === 0) return;
    const reason = window.prompt('Reason for this adjustment:') || 'Manual adjustment';
    startTransition(async () => {
      try {
        const result = await adjustPackagingItem(id, amount, reason);
        if (!result.success) setError(result.error);
        else router.refresh();
      } catch {
        setError('Could not reach the database. Check your Supabase environment variables.');
      }
    });
  }

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-serif text-lg text-espresso">Packaging</h2>
        <button onClick={() => setShowForm((s) => !s)} className="text-sm text-roast hover:underline">
          {showForm ? 'Cancel' : '+ Add item'}
        </button>
      </div>

      {error && <p className="mb-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

      {showForm && (
        <div className="mb-4 grid gap-3 rounded-xl border border-sand bg-cream-card p-4 sm:grid-cols-4">
          <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
          <input placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputCls} />
          <input
            type="number"
            placeholder="Current quantity"
            value={form.current_quantity}
            onChange={(e) => setForm({ ...form, current_quantity: Number(e.target.value) })}
            className={inputCls}
          />
          <input
            type="number"
            placeholder="Reorder threshold"
            value={form.reorder_threshold}
            onChange={(e) => setForm({ ...form, reorder_threshold: Number(e.target.value) })}
            className={inputCls}
          />
          <button
            disabled={isPending || !form.name}
            onClick={submitNewItem}
            className="rounded-lg bg-espresso px-4 py-2 text-sm font-medium text-cream hover:bg-roast disabled:opacity-60 sm:col-span-4"
          >
            Save Item
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-sand bg-cream-card">
        <table className="w-full min-w-[500px] text-left text-sm">
          <thead>
            <tr className="border-b border-sand text-xs uppercase tracking-wide text-roast-light">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Current</th>
              <th className="px-4 py-3">Threshold</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const low = item.current_quantity < item.reorder_threshold;
              return (
                <tr key={item.id} className="border-b border-sand last:border-0">
                  <td className="px-4 py-3">
                    {item.name}
                    {low && <span className="ml-2 rounded-full bg-danger/10 px-2 py-0.5 text-xs font-semibold text-danger">LOW STOCK</span>}
                  </td>
                  <td className="px-4 py-3">{item.current_quantity}</td>
                  <td className="px-4 py-3">{item.reorder_threshold}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => adjust(item.id)} className="text-sm text-roast hover:underline">
                      Adjust
                    </button>
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-espresso-soft">
                  No packaging items yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

const inputCls = 'rounded-lg border border-sand-dark bg-cream px-3 py-2 text-sm focus:border-roast focus:outline-none';
