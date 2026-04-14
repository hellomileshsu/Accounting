import { useEffect, useState } from 'react';
import { onValue, ref, set, get } from 'firebase/database';
import { db } from '../firebase';
import { previousMonthKey } from '../utils/month';

interface Api {
  value: number;
  loading: boolean;
  setValue: (n: number) => Promise<void>;
  /** 若本月尚無 startBalance，從前一月 startBalance + net 帶入 */
  seedFromPreviousIfEmpty: () => Promise<void>;
}

export function useStartBalance(monthKey: string): Api {
  const [value, setValueState] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const r = ref(db, `months/${monthKey}/startBalance`);
    const off = onValue(r, (snap) => {
      setValueState(Number(snap.val() ?? 0));
      setLoading(false);
    });
    return () => off();
  }, [monthKey]);

  const setValue = async (n: number) => {
    if (!db) return;
    await set(ref(db, `months/${monthKey}/startBalance`), n);
  };

  const seedFromPreviousIfEmpty = async () => {
    if (!db) return;
    const currentSnap = await get(ref(db, `months/${monthKey}/startBalance`));
    if (currentSnap.exists()) return;
    const prevKey = previousMonthKey(monthKey);
    const prevSnap = await get(ref(db, `months/${prevKey}`));
    if (!prevSnap.exists()) return;
    const prev = prevSnap.val() as {
      startBalance?: number;
      income?: Record<string, { amount: number }>;
      expenses?: Record<string, { amount: number }>;
    };
    const income = prev.income ? Object.values(prev.income).reduce((s, i) => s + Number(i.amount || 0), 0) : 0;
    const expenses = prev.expenses
      ? Object.values(prev.expenses).reduce((s, i) => s + Number(i.amount || 0), 0)
      : 0;
    const projected = Number(prev.startBalance || 0) + income - expenses;
    await set(ref(db, `months/${monthKey}/startBalance`), projected);
  };

  return { value, loading, setValue, seedFromPreviousIfEmpty };
}
