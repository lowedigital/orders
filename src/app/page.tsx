import TrackOrderSection from '@/components/TrackOrderSection';

const PRODUCTS = [
  { name: 'FIRST LIGHT', origin: 'Colombia', roast: 'Medium Roast' },
  { name: 'SUMMIT', origin: 'Papua New Guinea', roast: 'Light Roast' },
  { name: 'JOURNEY ROAST', origin: 'Brazil / Guatemala', roast: 'Dark Roast' },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-sand">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
          <span className="font-serif text-xl tracking-wide text-espresso">Journey Roasters</span>
          <nav className="text-sm text-espresso-soft">
            <span className="rounded-full border border-sand-dark px-3 py-1">Small-batch coffee, roasted to order</span>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-6 py-16 sm:py-24">
          <TrackOrderSection />
        </div>

        <div className="border-t border-sand bg-cream-card/60">
          <div className="mx-auto max-w-5xl px-6 py-16">
            <p className="text-center text-xs font-semibold uppercase tracking-widest text-roast-light">
              Our Coffees
            </p>
            <div className="mt-8 grid gap-6 sm:grid-cols-3">
              {PRODUCTS.map((p) => (
                <div key={p.name} className="rounded-2xl border border-sand bg-cream p-6 text-center">
                  <p className="font-serif text-lg text-espresso">{p.name}</p>
                  <p className="mt-1 text-sm text-espresso-soft">{p.roast}</p>
                  <p className="mt-1 text-xs uppercase tracking-wide text-roast-light">{p.origin}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-sand">
        <div className="mx-auto max-w-5xl px-6 py-8 text-center text-xs text-espresso-soft">
          © {new Date().getFullYear()} Journey Roasters. Roasted with care.
        </div>
      </footer>
    </div>
  );
}
