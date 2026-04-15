export interface Transaction {
  id: string;
  name: string;
  amount: number;
  date: string; // YYYY-MM-DD
  note?: string;
  /** 僅 expenses 使用：此筆支出關聯到哪個 Goal (用於存錢目標進度計算) */
  goalId?: string;
  /** 由重複規則合成的虛擬交易，不存在 RTDB */
  isRecurring?: boolean;
  recurringId?: string;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  /** @deprecated 已改為從 tagged expenses 衍生計算；保留欄位不造成舊資料崩潰 */
  currentAmount?: number;
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

export type RecurringInterval = 'weekly' | 'bimonthly' | 'monthly' | 'yearly';

export interface RecurringRule {
  id: string;
  kind: TransactionKind;
  name: string;
  amount: number;
  interval: RecurringInterval;
  startDate: string;  // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD, 選填
  note?: string;
  goalId?: string;
  createdAt: number;
}
