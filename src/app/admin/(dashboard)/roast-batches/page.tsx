import { getServiceClient } from '@/lib/supabase/server';
import RoastBatchManager from '@/components/admin/RoastBatchManager';

export default async function RoastBatchesPage() {
  const supabase = getServiceClient();
  const [{ data: batches }, { data: products }, { data: greenCoffee }] = await Promise.all([
    supabase
      .from('roast_batches')
      .select('*, product:products(name)')
      .order('roast_date', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase.from('products').select('id, name').eq('active', true).order('name'),
    supabase.from('green_coffee_inventory').select('id, name, current_weight_g').order('name'),
  ]);

  const rows = (batches ?? []).map((b) => ({
    ...b,
    product_name: Array.isArray(b.product) ? b.product[0]?.name : b.product?.name,
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-2xl text-espresso">Roast Batches</h1>
        <p className="text-sm text-espresso-soft">Every roast batch and the green coffee it used.</p>
      </div>
      <RoastBatchManager batches={rows} products={products ?? []} greenCoffee={greenCoffee ?? []} />
    </div>
  );
}

export const dynamic = 'force-dynamic';
