import type { FulfillmentMethod, OrderStatus } from './types';

// The fixed, linear fulfillment pipeline (cancelled is a side-state, not a step).
export const ACTIVE_STATUS_FLOW: OrderStatus[] = [
  'order_received',
  'confirmed',
  'awaiting_roast',
  'roasting',
  'cooling',
  'packaging',
  'ready',
  'out_for_delivery',
  'delivered',
];

export const ALL_STATUSES: OrderStatus[] = [...ACTIVE_STATUS_FLOW, 'cancelled'];

interface StatusMeta {
  label: string;
  /** Default message shown to the customer on the public timeline. */
  defaultPublicMessage: string;
  /** Label for the admin "advance" button when THIS status is current. */
  advanceButtonLabel: string;
}

export const STATUS_META: Record<OrderStatus, StatusMeta> = {
  order_received: {
    label: 'Order Received',
    defaultPublicMessage: "Your order has been received.",
    advanceButtonLabel: 'CONFIRM ORDER',
  },
  confirmed: {
    label: 'Confirmed',
    defaultPublicMessage: 'Your order has been confirmed.',
    advanceButtonLabel: 'QUEUE FOR ROAST',
  },
  awaiting_roast: {
    label: 'Awaiting Roast',
    defaultPublicMessage: 'Your coffee is queued and waiting to be roasted.',
    advanceButtonLabel: 'START ROASTING',
  },
  roasting: {
    label: 'Roasting',
    defaultPublicMessage: 'Your coffee is currently being roasted.',
    advanceButtonLabel: 'MARK AS ROASTED',
  },
  cooling: {
    label: 'Cooling',
    defaultPublicMessage: 'Your coffee is cooling after roasting.',
    advanceButtonLabel: 'MARK AS COOLED',
  },
  packaging: {
    label: 'Packaging',
    defaultPublicMessage: 'Your coffee is being packaged and prepared.',
    advanceButtonLabel: 'MARK AS PACKAGED',
  },
  ready: {
    label: 'Ready',
    defaultPublicMessage: 'Your order is ready for pickup/delivery.',
    advanceButtonLabel: 'ADVANCE ORDER',
  },
  out_for_delivery: {
    label: 'Out for Delivery',
    defaultPublicMessage: 'Your order is on its way.',
    advanceButtonLabel: 'MARK AS DELIVERED',
  },
  delivered: {
    label: 'Delivered',
    defaultPublicMessage: 'Enjoy your coffee!',
    advanceButtonLabel: 'DELIVERED',
  },
  cancelled: {
    label: 'Cancelled',
    defaultPublicMessage: 'This order has been cancelled.',
    advanceButtonLabel: 'CANCELLED',
  },
};

/** Fulfillment-aware label + message overrides for the "ready" step's advance button. */
export function readyAdvanceLabel(fulfillment: FulfillmentMethod): string {
  if (fulfillment === 'local_pickup') return 'MARK AS PICKED UP';
  if (fulfillment === 'local_delivery') return 'MARK OUT FOR DELIVERY';
  return 'MARK AS SHIPPED';
}

export function readyAdvanceMessage(fulfillment: FulfillmentMethod): string {
  if (fulfillment === 'local_pickup') return 'Your order has been picked up.';
  if (fulfillment === 'local_delivery') return 'Your order is out for delivery.';
  return 'Your order has shipped.';
}

export function statusIndex(status: OrderStatus): number {
  return ACTIVE_STATUS_FLOW.indexOf(status);
}

export function nextStatus(status: OrderStatus): OrderStatus | null {
  const idx = statusIndex(status);
  if (idx === -1 || idx === ACTIVE_STATUS_FLOW.length - 1) return null;
  return ACTIVE_STATUS_FLOW[idx + 1];
}

export function previousStatus(status: OrderStatus): OrderStatus | null {
  const idx = statusIndex(status);
  if (idx <= 0) return null;
  return ACTIVE_STATUS_FLOW[idx - 1];
}

export function defaultMessageFor(status: OrderStatus, fulfillment: FulfillmentMethod): string {
  if (status === 'out_for_delivery') return readyAdvanceMessage(fulfillment);
  return STATUS_META[status].defaultPublicMessage;
}

export function advanceLabelFor(status: OrderStatus, fulfillment: FulfillmentMethod): string {
  if (status === 'ready') return readyAdvanceLabel(fulfillment);
  return STATUS_META[status].advanceButtonLabel;
}
