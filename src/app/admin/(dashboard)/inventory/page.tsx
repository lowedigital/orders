import { getServiceClient } from '@/lib/supabase/server';
import InventoryManager from '@/components/admin/InventoryManager';

export default async function InventoryPage() {
  const supabase = getServiceClient();
  const [{ data: greenCoffee }, { data: packaging }] = await Promise.all([
    supabase.from('green_coffee_inventory').select('*').order('name'),
    supabase.from('packaging_inventory').select('*').order('name'),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-2xl text-espresso">Inventory</h1>
        <p className="text-sm text-espresso-soft">Green coffee and packaging stock, with reorder alerts.</p>
      </div>
      <InventoryManager greenCoffee={greenCoffee ?? []} packaging={packaging ?? []} />
    </div>
  );
}

export const dynamic = 'force-dynamic';
