import { Transaction, TransactionType } from './types';

export const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: '1',
    symbol: 'AAPL',
    type: TransactionType.BUY,
    date: '2023-01-15',
    price: 150,
    quantity: 10,
    fees: 0
  },
  {
    id: '2',
    symbol: 'MSFT',
    type: TransactionType.BUY,
    date: '2023-02-20',
    price: 250,
    quantity: 5,
    fees: 0
  },
  {
    id: '3',
    symbol: 'AAPL',
    type: TransactionType.BUY,
    date: '2023-03-15',
    price: 155,
    quantity: 10,
    fees: 0
  }
];

export const MOCK_PRICES: Record<string, number> = {
  'AAPL': 175.50,
  'MSFT': 310.20,
  'GOOGL': 135.00,
  'TSLA': 240.50,
  'NVDA': 460.00
};
