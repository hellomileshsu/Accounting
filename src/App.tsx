import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRtdbList } from './hooks/useRtdbList';
import { useStartBalance } from './hooks/useStartBalance';
import { useRecurring } from './hooks/useRecurring';
import { currentMonthKey } from './utils/month';
import {
  getOccurrenceDatesForMonth,
  getUnmaterializedForMonth,
} from './utils/recurring';
import { isFirebaseConfigured } from './firebase';
import type { Goal, Transaction } from './types';
import MonthSelector from './components/MonthSelector';
import SummaryCards from './components/SummaryCards';
import BalanceEditor from './components/BalanceEditor';
import TransactionList from './components/TransactionList';
import GoalsPanel from './components/GoalsPanel';
import RecurringPanel from './components/RecurringPanel';
import InvestmentsPanel from './components/InvestmentsPanel';
import HistoryChart from './components/HistoryChart';

export default function App() {
  const [monthKey, setMonthKey] = useState<string>(currentMonthKey());

  const incomePath = `months/${monthKey}/income`;
  const expensePath = `months/${monthKey}/expenses`;

  const incomeApi = useRtdbList<Transaction>(incomePath);
  const expenseApi = useRtdbList<Transaction>(expensePath);
  const goalsApi = useRtdbList<Goal>('goals');
  const recurringApi = useRecurring();
  const balance = useStartBalance(monthKey);

  // 切到新月份時若 startBalance 不存在，自動從前月結轉
  useEffect(() => {
    balance.seedFromPreviousIfEmpty().catch(() => { /* ignore */ });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthKey]);

  // === 自動實體化：當月/過去月的重複規則 entry 自動寫入 RTDB ===
  // pendingRef 避免同一 (monthKey, ruleId, date) 在 effect 連續觸發時被重複 add
  const pendingRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (recurringApi.loading || incomeApi.loading || expenseApi.loading) return;
    if (monthKey > currentMonthKey()) return; // 未來月份不自動實體化
    for (const rule of recurringApi.items) {
      const dates = getOccurrenceDatesForMonth(rule, monthKey);
      const targetApi = rule.kind === 'income' ? incomeApi : expenseApi;
      for (const date of dates) {
        if (rule.excludedOccurrences?.includes(date)) continue;
        const exists = targetApi.items.some(
          (t) => t.recurringId === rule.id && t.date === date,
        );
        const key = `${monthKey}:${rule.id}:${date}`;
        if (exists || pendingRef.current.has(key)) continue;
        pendingRef.current.add(key);
        targetApi
          .add({
            name: rule.name,
            amount: rule.amount,
            originalAmount: rule.amount,
            recurringId: rule.id,
            date,
            note: rule.note,
            goalId: rule.kind === 'expenses' ? rule.goalId : undefined,
          })
          .catch(() => { /* 忽略；下次 effect 重跑時會再嘗試 */ })
          .finally(() => {
            setTimeout(() => pendingRef.current.delete(key), 5000);
          });
      }
    }
    // 依賴 items 的資料變動（loading 變化也要重跑）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    monthKey,
    recurringApi.items,
    recurringApi.loading,
    incomeApi.items,
    incomeApi.loading,
    expenseApi.items,
    expenseApi.loading,
  ]);

  // 排除某個 occurrence：使用者刪除 recurring entry 時呼叫，避免下次 effect 再建。
  const excludeOccurrence = useCallback(
    async (ruleId: string, date: string) => {
      const rule = recurringApi.items.find((r) => r.id === ruleId);
      if (!rule) return;
      const existing = rule.excludedOccurrences ?? [];
      if (existing.includes(date)) return;
      await recurringApi.updateItem(ruleId, {
        excludedOccurrences: [...existing, date],
      });
    },
    [recurringApi],
  );

  // 未來月份才需要虛擬預覽；當月/過去月已由上面的 effect 實體化
  const virtualIncome = useMemo(
    () =>
      getUnmaterializedForMonth(
        recurringApi.items.filter((r) => r.kind === 'income'),
        monthKey,
        incomeApi.items,
      ),
    [recurringApi.items, monthKey, incomeApi.items],
  );
  const virtualExpense = useMemo(
    () =>
      getUnmaterializedForMonth(
        recurringApi.items.filter((r) => r.kind === 'expenses'),
        monthKey,
        expenseApi.items,
      ),
    [recurringApi.items, monthKey, expenseApi.items],
  );

  const totals = useMemo(() => {
    const totalIncome =
      incomeApi.items.reduce((s, i) => s + Number(i.amount || 0), 0) +
      virtualIncome.reduce((s, i) => s + i.amount, 0);
    const totalExpense =
      expenseApi.items.reduce((s, i) => s + Number(i.amount || 0), 0) +
      virtualExpense.reduce((s, i) => s + i.amount, 0);
    const netValue = totalIncome - totalExpense;
    const projectedEnd = balance.value + netValue;
    return { totalIncome, totalExpense, netValue, projectedEnd };
  }, [incomeApi.items, expenseApi.items, virtualIncome, virtualExpense, balance.value]);

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-6">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">財務管理</h1>
        <MonthSelector value={monthKey} onChange={setMonthKey} />
      </header>

      {!isFirebaseConfigured && (
        <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          <strong>尚未設定 Firebase。</strong>請建立 <code>.env.local</code> 並填入
          <code> VITE_FIREBASE_* </code>設定 (參考 <code>.env.example</code>)，否則資料無法儲存。
        </div>
      )}

      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <BalanceEditor label="月初餘額" value={balance.value} onSave={balance.setValue} />
      </div>

      <SummaryCards
        startBalance={balance.value}
        totalIncome={totals.totalIncome}
        totalExpense={totals.totalExpense}
        netValue={totals.netValue}
        projectedEnd={totals.projectedEnd}
      />

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <TransactionList
          kind="income"
          api={incomeApi}
          recurringItems={virtualIncome}
          onExcludeOccurrence={excludeOccurrence}
        />
        <TransactionList
          kind="expenses"
          api={expenseApi}
          goals={goalsApi.items}
          recurringItems={virtualExpense}
          onExcludeOccurrence={excludeOccurrence}
        />
      </div>

      <div className="mt-5 space-y-4">
        <GoalsPanel />
        <RecurringPanel goals={goalsApi.items} />
        <HistoryChart />
        <InvestmentsPanel />
      </div>

      <footer className="mt-8 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} 財務管理 · 資料儲存於 Firebase Realtime Database
      </footer>
    </div>
  );
}
