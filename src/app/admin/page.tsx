'use client';

import { Suspense, useState, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    setLoading(false);

    if (!res.ok) {
      setError('Incorrect username or password.');
      return;
    }

    const destination = searchParams.get('from') || '/admin';
    router.push(destination);
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-6">
      <div className="w-full max-w-sm rounded-2xl border border-sand bg-cream-card p-8">
        <p className="text-center font-serif text-2xl text-espresso">Journey Roasters</p>
        <p className="mt-1 text-center text-sm text-espresso-soft">Admin Sign In</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-roast-light">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 w-full rounded-lg border border-sand-dark bg-cream px-3 py-2 focus:border-roast focus:outline-none"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-roast-light">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-sand-dark bg-cream px-3 py-2 focus:border-roast focus:outline-none"
            />
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-espresso py-2.5 font-medium text-cream transition hover:bg-roast disabled:opacity-60"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
