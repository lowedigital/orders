import { Check } from 'lucide-react';
import { ACTIVE_STATUS_FLOW, STATUS_META, statusIndex } from '@/lib/orderStatus';
import { formatDateTime } from '@/lib/format';
import type { OrderStatus, PublicTrackingResult } from '@/lib/types';

interface Props {
  order: PublicTrackingResult;
}

export default function TrackingTimeline({ order }: Props) {
  if (order.status === 'cancelled') {
    return (
      <div className="rounded-2xl border border-sand bg-cream-card p-8 text-center">
        <p className="font-serif text-2xl text-danger">Order Cancelled</p>
        <p className="mt-2 text-espresso-soft">
          This order has been cancelled. If you believe this is a mistake, please reach out to us.
        </p>
        <div className="mt-8 text-left">
          <EventLog events={order.events} />
        </div>
      </div>
    );
  }

  const currentIdx = statusIndex(order.status as OrderStatus);

  return (
    <div className="rounded-2xl border border-sand bg-cream-card p-6 sm:p-10">
      {order.status === 'delivered' && (
        <div className="mb-8 rounded-xl bg-gold-soft/50 p-5 text-center">
          <p className="font-serif text-2xl text-espresso">Delivered</p>
          <p className="mt-1 text-espresso-soft">We hope you enjoy your coffee!</p>
        </div>
      )}

      <ol className="relative">
        {ACTIVE_STATUS_FLOW.map((step, idx) => {
          const isCompleted = idx < currentIdx || order.status === 'delivered';
          const isCurrent = idx === currentIdx && order.status !== 'delivered';
          const isFuture = idx > currentIdx;
          const event = findEventForStatus(order, step);
          const isLast = idx === ACTIVE_STATUS_FLOW.length - 1;

          return (
            <li key={step} className="relative flex gap-4 pb-10 last:pb-0">
              {!isLast && (
                <span
                  aria-hidden
                  className={`absolute left-[15px] top-8 h-full w-[2px] ${
                    isCompleted ? 'bg-roast' : 'bg-sand-dark'
                  }`}
                />
              )}

              <span
                className={[
                  'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2',
                  isCompleted
                    ? 'border-roast bg-roast text-cream'
                    : isCurrent
                      ? 'border-gold bg-gold text-espresso shadow-[0_0_0_5px_var(--color-gold-soft)]'
                      : 'border-sand-dark bg-cream text-sand-dark',
                ].join(' ')}
              >
                {isCompleted ? (
                  <Check size={16} strokeWidth={3} />
                ) : (
                  <span className={`h-2.5 w-2.5 rounded-full ${isCurrent ? 'bg-espresso' : 'bg-sand-dark'}`} />
                )}
              </span>

              <div className={isFuture ? 'opacity-45' : ''}>
                <p
                  className={[
                    'font-medium',
                    isCurrent ? 'text-lg text-espresso' : 'text-espresso',
                  ].join(' ')}
                >
                  {STATUS_META[step].label}
                  {isCurrent && (
                    <span className="ml-2 rounded-full bg-gold px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-espresso">
                      In progress
                    </span>
                  )}
                </p>
                <p className="mt-0.5 text-sm text-espresso-soft">
                  {event?.public_message ?? STATUS_META[step].defaultPublicMessage}
                </p>
                {event && (
                  <p className="mt-1 text-xs uppercase tracking-wide text-roast-light">
                    {formatDateTime(event.timestamp)}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {order.public_notes.length > 0 && (
        <div className="mt-4 border-t border-sand pt-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-roast-light">
            Updates from the roastery
          </p>
          <div className="space-y-3">
            {order.public_notes.map((note, i) => (
              <div key={i} className="rounded-lg bg-cream p-3 text-sm">
                <p className="text-espresso-soft">{note.content}</p>
                <p className="mt-1 text-xs text-roast-light">{formatDateTime(note.created_at)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function findEventForStatus(order: PublicTrackingResult, status: OrderStatus) {
  const matches = order.events.filter((e) => e.status === status);
  return matches[matches.length - 1];
}

function EventLog({ events }: { events: PublicTrackingResult['events'] }) {
  if (events.length === 0) return null;
  return (
    <div className="space-y-3">
      {events.map((e, i) => (
        <div key={i} className="text-sm">
          <p className="font-medium text-espresso">{STATUS_META[e.status]?.label ?? e.status}</p>
          <p className="text-espresso-soft">{e.public_message}</p>
          <p className="text-xs text-roast-light">{formatDateTime(e.timestamp)}</p>
        </div>
      ))}
    </div>
  );
}
