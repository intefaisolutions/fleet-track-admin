import { getData } from './api';

export const walletsService = {
  getBalance: () => getData('/wallets/balance'),
  getTransactions: () => getData('/wallets/transactions'),
  getAdminTransactions: () => getData('/wallets/admin/transactions'),
};
