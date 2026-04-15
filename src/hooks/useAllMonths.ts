import { useEffect, useState } from 'react';
import { onValue, ref } from 'firebase/database';
import { db } from '../firebase';
import type { Transaction } from '../types';

export interface MonthData {
  startBalance?: number;
  income?: Record<string, Omit<Transaction, 'id'>>;
  expenses?: Record<string, Omit<Transaction, 'id'>>;
}

export type AllMonths = Record<string, MonthData>;

/** 訂閱 /months 整棵資料，供 HistoryChart 與 GoalsPanel 使用。 */
export function useAllMonths(): { months: AllMonths; loading: boolean } {
  const [months, setMonths] = useState<AllMonths>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }
    const off = onValue(ref(db, 'months'), (snap) => {
      setMonths((snap.val() as AllMonths | null) ?? {});
      setLoading(false);
    });
    return () => off();
  }, []);

  return { months, loading };
}

/** 將 MonthData 的 income / expenses 展平為陣列，方便遍歷 */
export function monthEntries(m: MonthData | undefined): {
  income: Transaction[];
  expenses: Transaction[];
} {
  const income = m?.income
    ? Object.entries(m.income).map(([id, v]) => ({ id, ...v }))
    : [];
  const expenses = m?.expenses
    ? Object.entries(m.expenses).map(([id, v]) => ({ id, ...v }))
    : [];
  return { income, expenses };
}
