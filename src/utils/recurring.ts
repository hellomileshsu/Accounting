import type { RecurringRule, Transaction } from '../types';

/** YYYY-MM-DD 轉 Date (local midnight) */
function toDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Date 轉 YYYY-MM-DD */
function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 月份差（整數，can be negative）*/
function monthDiff(fromKey: string, toKey: string): number {
  const [fy, fm] = fromKey.split('-').map(Number);
  const [ty, tm] = toKey.split('-').map(Number);
  return (ty - fy) * 12 + (tm - fm);
}

/**
 * 計算 monthKey（YYYY-MM）內，某個重複規則會出現的所有虛擬 Transaction。
 * weekly 可能 4–5 筆，其餘 0 或 1 筆。
 */
export function getRecurringForMonth(
  rules: RecurringRule[],
  monthKey: string,
): Transaction[] {
  const [my, mm] = monthKey.split('-').map(Number);
  const results: Transaction[] = [];

  for (const rule of rules) {
    const start = toDate(rule.startDate);
    const end = rule.endDate ? toDate(rule.endDate) : null;
    const [sy, sm, sd] = rule.startDate.split('-').map(Number);

    const addOccurrence = (dateStr: string) => {
      const d = toDate(dateStr);
      if (d < start) return;
      if (end && d > end) return;
      results.push({
        id: `recurring_${rule.id}_${dateStr}`,
        name: rule.name,
        amount: rule.amount,
        date: dateStr,
        note: rule.note,
        goalId: rule.goalId,
        isRecurring: true,
        recurringId: rule.id,
      });
    };

    switch (rule.interval) {
      case 'monthly': {
        // 此規則出現在 monthKey 月，當天與 startDate 同日（若月底不足則用月底）
        const diff = monthDiff(`${sy}-${String(sm).padStart(2, '0')}`, monthKey);
        if (diff < 0) break;
        const daysInMonth = new Date(my, mm, 0).getDate();
        const day = Math.min(sd, daysInMonth);
        addOccurrence(`${monthKey}-${String(day).padStart(2, '0')}`);
        break;
      }

      case 'bimonthly': {
        const diff = monthDiff(`${sy}-${String(sm).padStart(2, '0')}`, monthKey);
        if (diff < 0 || diff % 2 !== 0) break;
        const daysInMonth = new Date(my, mm, 0).getDate();
        const day = Math.min(sd, daysInMonth);
        addOccurrence(`${monthKey}-${String(day).padStart(2, '0')}`);
        break;
      }

      case 'yearly': {
        // 每年與 startDate 同月同日
        if (sm !== mm) break;
        const daysInMonth = new Date(my, mm, 0).getDate();
        const day = Math.min(sd, daysInMonth);
        addOccurrence(`${my}-${String(mm).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
        break;
      }

      case 'weekly': {
        // startDate 的星期幾 (0=Sun…6=Sat)
        const targetDow = start.getDay();
        // 掃描當月每一天
        const daysInMonth = new Date(my, mm, 0).getDate();
        for (let d = 1; d <= daysInMonth; d++) {
          const date = new Date(my, mm - 1, d);
          if (date.getDay() === targetDow) {
            addOccurrence(toIso(date));
          }
        }
        break;
      }
    }
  }

  return results;
}

/** 給定規則，計算「下一次在今天或之後的發生日期」 */
export function nextOccurrence(rule: RecurringRule): string | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = toIso(today);

  // 找未來 24 個月 + 往後 5 年足夠大範圍
  const months: string[] = [];
  for (let i = 0; i < 120; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    months.push(key);
  }

  for (const key of months) {
    const hits = getRecurringForMonth([rule], key).map((t) => t.date);
    for (const date of hits.sort()) {
      if (date >= todayIso) return date;
    }
  }
  return null;
}

export const INTERVAL_LABELS: Record<string, string> = {
  weekly: '每週',
  bimonthly: '雙月',
  monthly: '每月',
  yearly: '每年',
};
