import { getData, patchData } from './api';

export type NotificationType =
  | 'INSURANCE_EXPIRY'
  | 'PUC_EXPIRY'
  | 'LICENSE_EXPIRY'
  | 'PAYMENT_VERIFICATION'
  | 'VEHICLE_LIMIT'
  | 'DRIVER_ASSIGNMENT'
  | 'REPAIR_REQUEST'
  | 'SYSTEM';

export interface NotificationRecord {
  _id: string;
  title: string;
  message: string;
  type: NotificationType | string;
  isRead: boolean;
  readAt?: string;
  meta?: Record<string, unknown>;
  entityType?: string;
  entityId?: string;
  companyId?: string;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const notificationsService = {
  list: (opts?: { unreadOnly?: boolean; limit?: number }) => {
    const params = new URLSearchParams();
    if (opts?.unreadOnly) params.set('unreadOnly', 'true');
    if (opts?.limit) params.set('limit', String(opts.limit));
    const qs = params.toString();
    return getData<NotificationRecord[]>(
      `/notifications${qs ? `?${qs}` : ''}`,
    );
  },

  unreadCount: () =>
    getData<{ count: number }>('/notifications/unread-count'),

  markRead: (id: string) =>
    patchData<NotificationRecord>(`/notifications/${id}/read`),

  markAllRead: () =>
    patchData<{ modified: number }>('/notifications/read-all'),
};
