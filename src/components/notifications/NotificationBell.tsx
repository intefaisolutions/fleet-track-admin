import { useEffect, useRef, useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';

function typeLabel(type: string) {
  return type
    .split('_')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
}

function timeAgo(iso?: string) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function NotificationBell() {
  const { items, unreadCount, loading, refresh, markRead, markAllRead } =
    useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100"
        aria-label={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ''}`}
        onClick={() => {
          setOpen((v) => !v);
          if (!open) void refresh();
        }}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-[min(100vw-2rem,22rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div>
              <p className="text-sm font-bold text-slate-900">Notifications</p>
              <p className="text-xs text-slate-500">
                {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
              </p>
            </div>
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-fleet-600 hover:bg-fleet-50"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            ) : null}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading && items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-400">
                Loading…
              </p>
            ) : items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-400">
                No notifications yet
              </p>
            ) : (
              items.map((n) => (
                <button
                  key={n._id}
                  type="button"
                  onClick={() => {
                    if (!n.isRead) void markRead(n._id);
                  }}
                  className={`block w-full border-b border-slate-50 px-4 py-3 text-left transition hover:bg-slate-50 ${
                    n.isRead ? 'bg-white' : 'bg-sky-50/60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">
                      {n.title}
                    </p>
                    {!n.isRead ? (
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-fleet-500" />
                    ) : null}
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-xs text-slate-600">
                    {n.message}
                  </p>
                  <p className="mt-1.5 text-[11px] text-slate-400">
                    {typeLabel(n.type)} · {timeAgo(n.createdAt)}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
