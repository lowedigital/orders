'use server';

import { revalidatePath } from 'next/cache';
import { getServiceClient } from '@/lib/supabase/server';
import { defaultMessageFor, nextStatus, previousStatus } from '@/lib/orderStatus';
import type {
  FulfillmentMethod,
  GrindType,
  NoteType,
  OrderStatus,
  PaymentStatus,
} from '@/lib/types';

type ActionResult<T = undefined> = { success: true; data: T } | { success: false; error: string };

// ---------------------------------------------------------------------------
// ORDERS
// ---------------------------------------------------------------------------

export interface CreateOrderInput {
  customer: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    notes?: string;
  };
  items: Array<{
    product_id: string;
    product_name: string;
    size: string;
    quantity: number;
    grind_type: GrindType;
    price: number;
  }>;
  fulfillment_method: FulfillmentMethod;
  payment_status: PaymentStatus;
}

export async function createOrder(input: CreateOrderInput): Promise<ActionResult<{ orderId: string; orderNumber: string }>> {
  if (!input.customer.name?.trim()) return { success: false, error: 'Customer name is required.' };
  if (!input.items.length) return { success: false, error: 'At least one product is required.' };

  const supabase = getServiceClient();

  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .insert({
      name: input.customer.name.trim(),
      email: input.customer.email?.trim() || null,
      phone: input.customer.phone?.trim() || null,
      address: input.customer.address?.trim() || null,
      notes: input.customer.notes?.trim() || null,
    })
    .select('id')
    .single();

  if (customerError || !customer) {
    return { success: false, error: customerError?.message || 'Failed to create customer.' };
  }

  const { data: orderNumberData, error: orderNumberError } = await supabase.rpc('generate_order_number');
  if (orderNumberError || !orderNumberData) {
    return { success: false, error: orderNumberError?.message || 'Failed to generate order number.' };
  }
  const orderNumber = orderNumberData as string;

  const total = input.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      order_number: orderNumber,
      customer_id: customer.id,
      status: 'order_received',
      fulfillment_method: input.fulfillment_method,
      payment_status: input.payment_status,
      total,
    })
    .select('id')
    .single();

  if (orderError || !order) {
    return { success: false, error: orderError?.message || 'Failed to create order.' };
  }

  const { error: itemsError } = await supabase.from('order_items').insert(
    input.items.map((item) => ({
      order_id: order.id,
      product_id: item.product_id || null,
      product_name: item.product_name,
      size: item.size,
      quantity: item.quantity,
      grind_type: item.grind_type,
      price: item.price,
    }))
  );

  if (itemsError) {
    return { success: false, error: itemsError.message };
  }

  await supabase.from('tracking_events').insert({
    order_id: order.id,
    status: 'order_received',
    public_message: defaultMessageFor('order_received', input.fulfillment_method),
    created_by: 'admin',
  });

  revalidatePath('/admin/orders');
  revalidatePath('/admin');
  return { success: true, data: { orderId: order.id, orderNumber } };
}

export async function advanceOrderStatus(
  orderId: string,
  customMessage?: string
): Promise<ActionResult> {
  const supabase = getServiceClient();
  const { data: order, error } = await supabase
    .from('orders')
    .select('id, status, fulfillment_method')
    .eq('id', orderId)
    .single();

  if (error || !order) return { success: false, error: 'Order not found.' };

  const next = nextStatus(order.status as OrderStatus);
  if (!next) return { success: false, error: 'Order is already at the final step.' };

  const message = customMessage?.trim() || defaultMessageFor(next, order.fulfillment_method as FulfillmentMethod);

  const { error: updateError } = await supabase.from('orders').update({ status: next }).eq('id', orderId);
  if (updateError) return { success: false, error: updateError.message };

  await supabase.from('tracking_events').insert({
    order_id: orderId,
    status: next,
    public_message: message,
    created_by: 'admin',
  });

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath('/admin/orders');
  revalidatePath('/admin');
  return { success: true, data: undefined };
}

export async function reverseOrderStatus(orderId: string): Promise<ActionResult> {
  const supabase = getServiceClient();
  const { data: order, error } = await supabase
    .from('orders')
    .select('id, status')
    .eq('id', orderId)
    .single();

  if (error || !order) return { success: false, error: 'Order not found.' };

  const currentStatus = order.status as OrderStatus;
  const prev = previousStatus(currentStatus);
  if (!prev) return { success: false, error: 'Order is already at the first step.' };

  // Remove the tracking event(s) that marked arrival at the status we're
  // leaving, so the public timeline stays consistent with actual state.
  await supabase.from('tracking_events').delete().eq('order_id', orderId).eq('status', currentStatus);

  const { error: updateError } = await supabase.from('orders').update({ status: prev }).eq('id', orderId);
  if (updateError) return { success: false, error: updateError.message };

  await supabase.from('order_notes').insert({
    order_id: orderId,
    note_type: 'internal',
    content: `Status reversed from "${currentStatus}" back to "${prev}" by admin.`,
    created_by: 'admin',
  });

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath('/admin/orders');
  revalidatePath('/admin');
  return { success: true, data: undefined };
}

export async function cancelOrder(orderId: string, reason?: string): Promise<ActionResult> {
  const supabase = getServiceClient();

  const { error: updateError } = await supabase.from('orders').update({ status: 'cancelled' }).eq('id', orderId);
  if (updateError) return { success: false, error: updateError.message };

  await supabase.from('tracking_events').insert({
    order_id: orderId,
    status: 'cancelled',
    public_message: 'This order has been cancelled.',
    created_by: 'admin',
  });

  if (reason?.trim()) {
    await supabase.from('order_notes').insert({
      order_id: orderId,
      note_type: 'internal',
      content: `Cancellation reason: ${reason.trim()}`,
      created_by: 'admin',
    });
  }

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath('/admin/orders');
  revalidatePath('/admin');
  return { success: true, data: undefined };
}

export async function setOrderStatus(orderId: string, status: OrderStatus, message?: string): Promise<ActionResult> {
  const supabase = getServiceClient();
  const { data: order } = await supabase.from('orders').select('fulfillment_method').eq('id', orderId).single();
  if (!order) return { success: false, error: 'Order not found.' };

  const { error: updateError } = await supabase.from('orders').update({ status }).eq('id', orderId);
  if (updateError) return { success: false, error: updateError.message };

  await supabase.from('tracking_events').insert({
    order_id: orderId,
    status,
    public_message: message?.trim() || defaultMessageFor(status, order.fulfillment_method as FulfillmentMethod),
    created_by: 'admin',
  });

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath('/admin/orders');
  revalidatePath('/admin');
  return { success: true, data: undefined };
}

export async function updateOrderPaymentStatus(orderId: string, paymentStatus: PaymentStatus): Promise<ActionResult> {
  const supabase = getServiceClient();
  const { error } = await supabase.from('orders').update({ payment_status: paymentStatus }).eq('id', orderId);
  if (error) return { success: false, error: error.message };
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath('/admin/orders');
  return { success: true, data: undefined };
}

export async function associateOrderWithBatch(orderId: string, roastBatchId: string | null): Promise<ActionResult> {
  const supabase = getServiceClient();
  const { error } = await supabase.from('orders').update({ roast_batch_id: roastBatchId }).eq('id', orderId);
  if (error) return { success: false, error: error.message };
  revalidatePath(`/admin/orders/${orderId}`);
  return { success: true, data: undefined };
}

export async function addOrderNote(orderId: string, noteType: NoteType, content: string): Promise<ActionResult> {
  if (!content.trim()) return { success: false, error: 'Note cannot be empty.' };
  const supabase = getServiceClient();
  const { error } = await supabase.from('order_notes').insert({
    order_id: orderId,
    note_type: noteType,
    content: content.trim(),
    created_by: 'admin',
  });
  if (error) return { success: false, error: error.message };
  revalidatePath(`/admin/orders/${orderId}`);
  return { success: true, data: undefined };
}

// ---------------------------------------------------------------------------
// INVENTORY
// ---------------------------------------------------------------------------

export interface CreateGreenCoffeeInput {
  name: string;
  origin?: string;
  region?: string;
  process?: string;
  supplier?: string;
  current_weight_g: number;
  reorder_threshold_g: number;
  cost_per_lb: number;
}

export async function createGreenCoffeeLot(input: CreateGreenCoffeeInput): Promise<ActionResult> {
  const supabase = getServiceClient();
  const { error } = await supabase.from('green_coffee_inventory').insert(input);
  if (error) return { success: false, error: error.message };
  revalidatePath('/admin/inventory');
  return { success: true, data: undefined };
}

export async function adjustGreenCoffeeLot(id: string, changeAmountG: number, reason: string): Promise<ActionResult> {
  const supabase = getServiceClient();
  const { data: lot, error: fetchError } = await supabase
    .from('green_coffee_inventory')
    .select('current_weight_g')
    .eq('id', id)
    .single();
  if (fetchError || !lot) return { success: false, error: 'Lot not found.' };

  const newWeight = Number(lot.current_weight_g) + changeAmountG;
  if (newWeight < 0) return { success: false, error: 'Adjustment would result in negative inventory.' };

  const { error: updateError } = await supabase
    .from('green_coffee_inventory')
    .update({ current_weight_g: newWeight })
    .eq('id', id);
  if (updateError) return { success: false, error: updateError.message };

  await supabase.from('inventory_transactions').insert({
    inventory_type: 'green_coffee',
    inventory_id: id,
    change_amount: changeAmountG,
    reason: reason || 'Manual adjustment',
    created_by: 'admin',
  });

  revalidatePath('/admin/inventory');
  return { success: true, data: undefined };
}

export interface CreatePackagingInput {
  name: string;
  category?: string;
  current_quantity: number;
  reorder_threshold: number;
}

export async function createPackagingItem(input: CreatePackagingInput): Promise<ActionResult> {
  const supabase = getServiceClient();
  const { error } = await supabase.from('packaging_inventory').insert(input);
  if (error) return { success: false, error: error.message };
  revalidatePath('/admin/inventory');
  return { success: true, data: undefined };
}

export async function adjustPackagingItem(id: string, changeAmount: number, reason: string): Promise<ActionResult> {
  const supabase = getServiceClient();
  const { data: item, error: fetchError } = await supabase
    .from('packaging_inventory')
    .select('current_quantity')
    .eq('id', id)
    .single();
  if (fetchError || !item) return { success: false, error: 'Item not found.' };

  const newQuantity = Number(item.current_quantity) + changeAmount;
  if (newQuantity < 0) return { success: false, error: 'Adjustment would result in negative inventory.' };

  const { error: updateError } = await supabase
    .from('packaging_inventory')
    .update({ current_quantity: newQuantity })
    .eq('id', id);
  if (updateError) return { success: false, error: updateError.message };

  await supabase.from('inventory_transactions').insert({
    inventory_type: 'packaging',
    inventory_id: id,
    change_amount: changeAmount,
    reason: reason || 'Manual adjustment',
    created_by: 'admin',
  });

  revalidatePath('/admin/inventory');
  return { success: true, data: undefined };
}

// ---------------------------------------------------------------------------
// ROAST BATCHES
// ---------------------------------------------------------------------------

export interface CreateRoastBatchInput {
  product_id: string;
  product_code: string; // e.g. "FL", "SU", "JR" — used to build the batch id
  green_coffee_id: string;
  green_weight_g: number;
  roasted_weight_g?: number;
  roast_date: string; // yyyy-mm-dd
  roast_notes?: string;
  first_crack?: string;
  end_temp_f?: number;
}

export async function createRoastBatch(input: CreateRoastBatchInput): Promise<ActionResult<{ batchId: string }>> {
  const supabase = getServiceClient();

  // Deduct green coffee inventory first (never silently — always recorded).
  const { data: lot, error: lotError } = await supabase
    .from('green_coffee_inventory')
    .select('current_weight_g')
    .eq('id', input.green_coffee_id)
    .single();
  if (lotError || !lot) return { success: false, error: 'Green coffee lot not found.' };

  const newWeight = Number(lot.current_weight_g) - input.green_weight_g;
  if (newWeight < 0) return { success: false, error: 'Not enough green coffee in stock for this batch.' };

  const dateObj = new Date(input.roast_date + 'T00:00:00Z');
  const yy = String(dateObj.getUTCFullYear()).slice(-2);
  const mm = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dateObj.getUTCDate()).padStart(2, '0');
  const datePart = `${yy}${mm}${dd}`;

  const { count } = await supabase
    .from('roast_batches')
    .select('id', { count: 'exact', head: true })
    .like('batch_id', `${input.product_code}-${datePart}-%`);

  const seq = String((count ?? 0) + 1).padStart(2, '0');
  const batchId = `${input.product_code}-${datePart}-${seq}`;

  const { data: batch, error: batchError } = await supabase
    .from('roast_batches')
    .insert({
      batch_id: batchId,
      product_id: input.product_id,
      green_coffee_id: input.green_coffee_id,
      green_weight_g: input.green_weight_g,
      roasted_weight_g: input.roasted_weight_g ?? null,
      roast_date: input.roast_date,
      roast_notes: input.roast_notes ?? null,
      first_crack: input.first_crack ?? null,
      end_temp_f: input.end_temp_f ?? null,
    })
    .select('id')
    .single();

  if (batchError || !batch) return { success: false, error: batchError?.message || 'Failed to create batch.' };

  await supabase.from('green_coffee_inventory').update({ current_weight_g: newWeight }).eq('id', input.green_coffee_id);

  await supabase.from('inventory_transactions').insert({
    inventory_type: 'green_coffee',
    inventory_id: input.green_coffee_id,
    change_amount: -input.green_weight_g,
    reason: `Roast batch ${batchId}`,
    related_roast_batch_id: batch.id,
    created_by: 'admin',
  });

  revalidatePath('/admin/roast-batches');
  revalidatePath('/admin/inventory');
  return { success: true, data: { batchId } };
}
