import { useMemo, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAllMonths } from '../hooks/useAllMonths';
import { useRtdbList } from '../hooks/useRtdbList';
import type { Goal } from '../types';
import { formatCurrency } from '../utils/format';
import { currentMonthKey } from '../utils/month';

type Range = '1y' | '5y' | '10y';

const RANGE_MONTHS: Record<Range, number> = { '1y': 12, '5y': 60, '10y': 120 };

const GOAL_COLORS = [
  '#059669',
  '#d97706',
  '#7c3aed',
  '#db2777',
  '#0891b2',
  '#65a30d',
  '#ea580c',
  '#4f46e5',
];

/** 產生從 [anchor - (count-1) 個月] 到 anchor 的月份 key 陣列（升冪） */
function monthRangeAsc(anchorKey: string, count: number): string[] {
  const [y, m] = anchorKey.split('-').map(Number);
  const keys: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(y, m - 1 - i, 1);
    const yy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    keys.push(`${yy}-${mm}`);
  }
  return keys;
}

export default function HistoryChart() {
  const [range, setRange] = useState<Range>('1y');
  const { months, loading } = useAllMonths();
  const { items: goals } = useRtdbList<Goal>('goals');

  const data = useMemo(() => {
    const keys = monthRangeAsc(currentMonthKey(), RANGE_MONTHS[range]);
    let rollingEnd = 0;
    // 若序列起點前有 startBalance 資料，用它當基準
    const firstWithStart = keys.find(
      (k) => typeof months[k]?.startBalance === 'number',
    );
    if (firstWithStart) {
      rollingEnd = Number(months[firstWithStart]?.startBalance ?? 0);
      // 將 rollingEnd 推進到第一個 keys 之前 (keys[0] 本身的月初)
      // 若 firstWithStart === keys[0] 則不用額外推進
      // 若 firstWithStart 在 keys[0] 之後 (晚於)，則 keys[0] 的起點未知，預設 0
      if (firstWithStart !== keys[0]) rollingEnd = 0;
    }

    // 累計每個目標截至各月底的存入金額
    const goalAcc: Record<string, number> = {};

    return keys.map((k) => {
      const m = months[k];
      const income = m?.income
        ? Object.values(m.income).reduce((s, i) => s + Number(i.amount || 0), 0)
        : 0;
      const expense = m?.expenses
        ? Object.values(m.expenses).reduce((s, e) => s + Number(e.amount || 0), 0)
        : 0;
      // 該月初餘額：若 RTDB 有存就優先用，否則沿用前月結餘
      const start = typeof m?.startBalance === 'number' ? m.startBalance : rollingEnd;
      const end = start + income - expense;
      rollingEnd = end;

      // 加總該月被 tag 的支出
      if (m?.expenses) {
        for (const e of Object.values(m.expenses)) {
          if (e.goalId) goalAcc[e.goalId] = (goalAcc[e.goalId] ?? 0) + Number(e.amount || 0);
        }
      }

      const row: Record<string, number | string> = {
        month: k,
        income,
        expense,
        endBalance: end,
      };
      for (const g of goals) {
        row[`goal_${g.id}`] = goalAcc[g.id] ?? 0;
      }
      return row;
    });
  }, [months, goals, range]);

  const tickInterval = range === '1y' ? 0 : range === '5y' ? 2 : 5;
  const hasAnyData = data.some((d) => (d.income as number) > 0 || (d.expense as number) > 0);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">歷史趨勢</h2>
        <div className="inline-flex overflow-hidden rounded-md border border-slate-300 text-sm">
          {(['1y', '5y', '10y'] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={
                'px-3 py-1 ' +
                (range === r
                  ? 'bg-sky-600 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-100')
              }
            >
              {r === '1y' ? '1 年' : r === '5y' ? '5 年' : '10 年'}
            </button>
          ))}
        </div>
      </header>
      {loading ? (
        <p className="text-sm text-slate-500">載入歷史資料中…</p>
      ) : !hasAnyData ? (
        <p className="py-8 text-center text-sm text-slate-500">尚無歷史資料，新增幾筆收支後即可看到趨勢。</p>
      ) : (
        <div className="h-80 w-full">
          <ResponsiveContainer>
            <LineChart data={data} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" interval={tickInterval} tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCurrency(Number(v))} width={90} />
              <Tooltip formatter={(v) => formatCurrency(Number(v))} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="income" name="收入" stroke="#10b981" dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="expense" name="支出" stroke="#ef4444" dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="endBalance" name="月末餘額" stroke="#0ea5e9" dot={false} strokeWidth={2} />
              {goals.map((g, idx) => (
                <Line
                  key={g.id}
                  type="monotone"
                  dataKey={`goal_${g.id}`}
                  name={`🎯 ${g.name}`}
                  stroke={GOAL_COLORS[idx % GOAL_COLORS.length]}
                  strokeDasharray="4 2"
                  dot={false}
                  strokeWidth={1.5}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
