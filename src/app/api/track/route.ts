import { NextRequest, NextResponse } from 'next/server';
import { getPublicClient } from '@/lib/supabase/public';
import type { PublicTrackingResult } from '@/lib/types';

// Public, unauthenticated endpoint. Accepts { order_number } and returns
// ONLY what get_public_order_tracking() hands back — no customer PII, no
// payment info, no internal notes, no other orders. See
// supabase/migrations/0001_init.sql for the full guarantee.
export async function POST(request: NextRequest) {
  let body: { order_number?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }

  const orderNumber = (body.order_number || '').trim();
  if (!orderNumber) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }

  const supabase = getPublicClient();
  const { data, error } = await supabase.rpc('get_public_order_tracking', {
    p_order_number: orderNumber,
  });

  if (error) {
    console.error('get_public_order_tracking error:', error.message);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }

  if (!data) {
    // Deliberately generic — do not reveal whether a similar order exists.
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ order: data as PublicTrackingResult });
}
