export interface Transaction {
  id: string;
  name: string;
  amount: number;
  date: string; // YYYY-MM-DD
  note?: string;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string; // YYYY-MM-DD
  createdAt: number;
}

export interface Investment {
  id: string;
  symbol: string;
  shares: number;
  avgCost: number;
  note?: string;
  createdAt: number;
}

export interface Quote {
  c: number; // current price
  d: number; // change
  dp: number; // percent change
  h: number;
  l: number;
  o: number;
  pc: number; // previous close
}

export type TransactionKind = 'income' | 'expenses';
