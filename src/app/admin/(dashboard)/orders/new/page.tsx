import { getServiceClient } from '@/lib/supabase/server';
import NewOrderForm from '@/components/admin/NewOrderForm';

export default async function NewOrderPage() {
  const supabase = getServiceClient();
  const { data: products } = await supabase.from('products').select('id, name').eq('active', true).order('name');

  return (
    <div className="max-w-3xl">
      <h1 className="font-serif text-2xl text-espresso">Create Order</h1>
      <p className="text-sm text-espresso-soft">Order numbers are generated automatically.</p>
      <div className="mt-6">
        <NewOrderForm products={products ?? []} />
      </div>
    </div>
  );
}

export const dynamic = 'force-dynamic';
