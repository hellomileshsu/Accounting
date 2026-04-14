import { useEffect, useMemo, useState } from 'react';
import { useRtdbList } from './hooks/useRtdbList';
import { useStartBalance } from './hooks/useStartBalance';
import { currentMonthKey } from './utils/month';
import { isFirebaseConfigured } from './firebase';
import type { Transaction } from './types';
import MonthSelector from './components/MonthSelector';
import SummaryCards from './components/SummaryCards';
import BalanceEditor from './components/BalanceEditor';
import TransactionList from './components/TransactionList';
import GoalsPanel from './components/GoalsPanel';
import InvestmentsPanel from './components/InvestmentsPanel';

export default function App() {
  const [monthKey, setMonthKey] = useState<string>(currentMonthKey());

  const incomePath = `months/${monthKey}/income`;
  const expensePath = `months/${monthKey}/expenses`;

  const incomeApi = useRtdbList<Transaction>(incomePath);
  const expenseApi = useRtdbList<Transaction>(expensePath);
  const balance = useStartBalance(monthKey);

  // 切到新月份時若 startBalance 不存在，自動從前月結轉
  useEffect(() => {
    balance.seedFromPreviousIfEmpty().catch(() => {
      /* ignore */
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthKey]);

  const totals = useMemo(() => {
    const totalIncome = incomeApi.items.reduce((s, i) => s + Number(i.amount || 0), 0);
    const totalExpense = expenseApi.items.reduce((s, i) => s + Number(i.amount || 0), 0);
    const netValue = totalIncome - totalExpense;
    const projectedEnd = balance.value + netValue;
    return { totalIncome, totalExpense, netValue, projectedEnd };
  }, [incomeApi.items, expenseApi.items, balance.value]);

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-6">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">財務管理</h1>
        <MonthSelector value={monthKey} onChange={setMonthKey} />
      </header>

      {!isFirebaseConfigured && (
        <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          <strong>尚未設定 Firebase。</strong>請建立 <code>.env.local</code> 並填入
          <code> VITE_FIREBASE_* </code>
          設定 (參考 <code>.env.example</code>)，否則資料無法儲存。
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
        <TransactionList kind="income" api={incomeApi} />
        <TransactionList kind="expenses" api={expenseApi} />
      </div>

      <div className="mt-5 space-y-4">
        <GoalsPanel />
        <InvestmentsPanel />
      </div>

      <footer className="mt-8 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} 財務管理 · 資料儲存於 Firebase Realtime Database
      </footer>
    </div>
  );
}
