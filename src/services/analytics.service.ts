import { getData } from './api';
import type { DashboardStats } from '../types/api';

export const analyticsService = {
  getDashboard: () => getData<DashboardStats>('/analytics/dashboard'),
};
