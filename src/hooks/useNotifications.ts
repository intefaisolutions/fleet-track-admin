import { useCallback, useEffect, useState } from 'react';
import {
  notificationsService,
  type NotificationRecord,
} from '../services/notifications.service';
import { connectNotificationSocket } from '../services/notification-socket';
import { useAuth } from '../context/AuthContext';

export function useNotifications(pollMs = 60_000) {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [items, setItems] = useState<NotificationRecord[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setItems([]);
      setUnreadCount(0);
      return;
    }
    setLoading(true);
    try {
      const [listRes, countRes] = await Promise.all([
        notificationsService.list({ limit: 40 }),
        notificationsService.unreadCount(),
      ]);
      setItems(listRes.data ?? []);
      setUnreadCount(countRes.data?.count ?? 0);
    } catch {
      // Silent — bell should not toast on every poll failure
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    void refresh();
    const id = window.setInterval(() => void refresh(), pollMs);
    return () => window.clearInterval(id);
  }, [authLoading, isAuthenticated, pollMs, refresh]);

  useEffect(() => {
    if (authLoading || !isAuthenticated || !user?.id) return;

    return connectNotificationSocket({
      userId: user.id,
      companyId: user.companyId,
      onNotification: (payload) => {
        const p = payload as {
          id?: string;
          title?: string;
          message?: string;
          type?: string;
          isRead?: boolean;
          createdAt?: string;
          meta?: Record<string, unknown>;
          entityType?: string;
          entityId?: string;
        };
        if (!p?.id) {
          void refresh();
          return;
        }
        setItems((prev) => {
          if (prev.some((n) => n._id === p.id)) return prev;
          const next: NotificationRecord = {
            _id: p.id,
            title: p.title ?? 'Notification',
            message: p.message ?? '',
            type: p.type ?? 'SYSTEM',
            isRead: !!p.isRead,
            createdAt:
              typeof p.createdAt === 'string'
                ? p.createdAt
                : new Date().toISOString(),
            meta: p.meta,
            entityType: p.entityType,
            entityId: p.entityId,
          };
          return [next, ...prev].slice(0, 40);
        });
        if (!p.isRead) {
          setUnreadCount((c) => c + 1);
        }
      },
    });
  }, [authLoading, isAuthenticated, user?.id, user?.companyId, refresh]);

  const markRead = useCallback(async (id: string) => {
    try {
      await notificationsService.markRead(id);
      setItems((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      /* ignore */
    }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await notificationsService.markAllRead();
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      /* ignore */
    }
  }, []);

  return {
    items,
    unreadCount,
    loading,
    refresh,
    markRead,
    markAllRead,
  };
}
