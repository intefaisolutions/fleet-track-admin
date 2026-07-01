import { getData } from './api';

export const walletsService = {
  getBalance: () => getData('/wallets/balance'),
  getTransactions: () => getData('/wallets/transactions'),
};
