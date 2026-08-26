'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createOrder } from '@/app/admin/(dashboard)/actions';
import type { FulfillmentMethod, GrindType, PaymentStatus } from '@/lib/types';

const SIZES = ['8 oz', '1 lb'];

interface ItemRow {
  product_id: string;
  product_name: string;
  size: string;
  quantity: number;
  grind_type: GrindType;
  price: number;
}

function emptyItem(products: { id: string; name: string }[]): ItemRow {
  const first = products[0];
  return {
    product_id: first?.id ?? '',
    product_name: first?.name ?? '',
    size: SIZES[1],
    quantity: 1,
    grind_type: 'whole_bean',
    price: 0,
  };
}

export default function NewOrderForm({ products }: { products: { id: string; name: string }[] }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [fulfillment, setFulfillment] = useState<FulfillmentMethod>('local_pickup');
  const [payment, setPayment] = useState<PaymentStatus>('unpaid');
  const [items, setItems] = useState<ItemRow[]>([emptyItem(products)]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function updateItem(index: number, patch: Partial<ItemRow>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  function addItem() {
    setItems((prev) => [...prev, emptyItem(products)]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!name.trim()) {
      setError('Customer name is required.');
      return;
    }
    if (items.length === 0) {
      setError('Add at least one product.');
      return;
    }

    setLoading(true);
    try {
      const result = await createOrder({
        customer: { name, email, phone, address, notes: customerNotes },
        items,
        fulfillment_method: fulfillment,
        payment_status: payment,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      router.push(`/admin/orders/${result.data.orderId}`);
    } catch (err) {
      setError(`Server error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <section className="rounded-xl border border-sand bg-cream-card p-5">
        <h2 className="mb-4 font-serif text-lg text-espresso">Customer</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name *">
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Email">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Phone">
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Address">
            <input value={address} onChange={(e) => setAddress(e.target.value)} className={inputCls} />
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Notes">
            <textarea value={customerNotes} onChange={(e) => setCustomerNotes(e.target.value)} className={inputCls} rows={2} />
          </Field>
        </div>
      </section>

      <section className="rounded-xl border border-sand bg-cream-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-lg text-espresso">Products</h2>
          <button type="button" onClick={addItem} className="text-sm text-roast hover:underline">
            + Add product
          </button>
        </div>
        <div className="space-y-4">
          {items.map((item, i) => (
            <div key={i} className="grid gap-3 rounded-lg border border-sand p-3 sm:grid-cols-6">
              <div className="sm:col-span-2">
                <label className={labelCls}>Product</label>
                <select
                  value={item.product_id}
                  onChange={(e) => {
                    const product = products.find((p) => p.id === e.target.value);
                    updateItem(i, { product_id: e.target.value, product_name: product?.name ?? '' });
                  }}
                  className={inputCls}
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Size</label>
                <select value={item.size} onChange={(e) => updateItem(i, { size: e.target.value })} className={inputCls}>
                  {SIZES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Qty</label>
                <input
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={(e) => updateItem(i, { quantity: Number(e.target.value) })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Grind</label>
                <select
                  value={item.grind_type}
                  onChange={(e) => updateItem(i, { grind_type: e.target.value as GrindType })}
                  className={inputCls}
                >
                  <option value="whole_bean">Whole Bean</option>
                  <option value="ground">Ground</option>
                </select>
              </div>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label className={labelCls}>Price</label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    value={item.price}
                    onChange={(e) => updateItem(i, { price: Number(e.target.value) })}
                    className={inputCls}
                  />
                </div>
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(i)}
                    className="rounded-lg border border-sand-dark px-2 py-2 text-xs text-danger hover:bg-sand"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-sand bg-cream-card p-5">
        <h2 className="mb-4 font-serif text-lg text-espresso">Fulfillment &amp; Payment</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Fulfillment Method">
            <select value={fulfillment} onChange={(e) => setFulfillment(e.target.value as FulfillmentMethod)} className={inputCls}>
              <option value="local_pickup">Local Pickup</option>
              <option value="local_delivery">Local Delivery</option>
              <option value="shipping">Shipping</option>
            </select>
          </Field>
          <Field label="Payment Status">
            <select value={payment} onChange={(e) => setPayment(e.target.value as PaymentStatus)} className={inputCls}>
              <option value="unpaid">Unpaid</option>
              <option value="paid">Paid</option>
              <option value="partial">Partial</option>
              <option value="refunded">Refunded</option>
            </select>
          </Field>
        </div>
      </section>

      {error && <p className="text-sm text-danger">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-espresso px-6 py-3 font-medium text-cream transition hover:bg-roast disabled:opacity-60"
      >
        {loading ? 'Creating…' : 'Create Order'}
      </button>
    </form>
  );
}

const inputCls =
  'mt-1 w-full rounded-lg border border-sand-dark bg-cream px-3 py-2 text-sm focus:border-roast focus:outline-none';
const labelCls = 'block text-xs font-medium uppercase tracking-wide text-roast-light';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  );
}
