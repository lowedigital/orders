import Link from 'next/link';
import LogoutButton from '@/components/admin/LogoutButton';

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/orders', label: 'Orders' },
  { href: '/admin/orders/new', label: 'New Order' },
  { href: '/admin/inventory', label: 'Inventory' },
  { href: '/admin/roast-batches', label: 'Roast Batches' },
  { href: '/admin/customers', label: 'Customers' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-cream">
      <div className="flex min-h-screen flex-col md:flex-row">
        <aside className="border-b border-sand bg-cream-card md:w-56 md:shrink-0 md:border-b-0 md:border-r">
          <div className="px-5 py-5">
            <p className="font-serif text-lg text-espresso">Journey Roasters</p>
            <p className="text-xs uppercase tracking-wide text-roast-light">Admin</p>
          </div>
          <nav className="flex flex-wrap gap-1 px-3 pb-4 md:flex-col">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-2 text-sm text-espresso-soft transition hover:bg-sand hover:text-espresso"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="px-3 pb-5 md:mt-auto">
            <LogoutButton />
          </div>
        </aside>

        <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
