import { useMemo, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAllMonths } from '../hooks/useAllMonths';
import { useRtdbList } from '../hooks/useRtdbList';
import { useRecurring } from '../hooks/useRecurring';
import type { Goal } from '../types';
import { formatCurrency } from '../utils/format';
import { currentMonthKey } from '../utils/month';
import { getRecurringForMonth } from '../utils/recurring';

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

/**
 * 以 anchorKey（當月）為中心，前半段 past、後半段 future，共 count 個月（升冪）。
 * past = floor(count/2) 個月, future = count - floor(count/2) - 1 個月 (含當月共 count)
 */
function centeredMonthRange(anchorKey: string, count: number): string[] {
  const [y, m] = anchorKey.split('-').map(Number);
  const half = Math.floor(count / 2);
  const keys: string[] = [];
  // i = -half … count-half-1，i=0 即 anchorKey
  for (let i = -half; i < count - half; i++) {
    const d = new Date(y, m - 1 + i, 1);
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
  const { items: recurringRules } = useRecurring();
  const nowKey = currentMonthKey();

  const data = useMemo(() => {
    const keys = centeredMonthRange(nowKey, RANGE_MONTHS[range]);
    let rollingEnd = 0;
    // 若序列起點前有 startBalance 資料，用它當基準
    const firstWithStart = keys.find(
      (k) => typeof months[k]?.startBalance === 'number',
    );
    if (firstWithStart) {
      rollingEnd = Number(months[firstWithStart]?.startBalance ?? 0);
      if (firstWithStart !== keys[0]) rollingEnd = 0;
    }

    // 累計每個目標截至各月底的存入金額（僅已過月份）
    const goalAcc: Record<string, number> = {};

    return keys.map((k) => {
      const m = months[k];
      const recIncome = getRecurringForMonth(recurringRules.filter((r) => r.kind === 'income'), k);
      const recExpense = getRecurringForMonth(recurringRules.filter((r) => r.kind === 'expenses'), k);
      const income =
        (m?.income ? Object.values(m.income).reduce((s, i) => s + Number(i.amount || 0), 0) : 0) +
        recIncome.reduce((s, i) => s + i.amount, 0);
      const expense =
        (m?.expenses ? Object.values(m.expenses).reduce((s, e) => s + Number(e.amount || 0), 0) : 0) +
        recExpense.reduce((s, e) => s + e.amount, 0);
      // 月初：若 RTDB 有存就優先用，否則沿用前月結餘（未來月份自然延伸）
      const start = typeof m?.startBalance === 'number' ? m.startBalance : rollingEnd;
      const end = start + income - expense;
      rollingEnd = end;

      // 加總該月被 tag 的支出（目標累計）
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
  }, [months, goals, recurringRules, range, nowKey]);

  const tickInterval = range === '1y' ? 0 : range === '5y' ? 2 : 5;
  const hasAnyData = data.some((d) => (d.income as number) > 0 || (d.expense as number) > 0 || (d.endBalance as number) !== 0);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">歷史 &amp; 未來趨勢</h2>
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
              <ReferenceLine
                x={nowKey}
                stroke="#64748b"
                strokeDasharray="4 3"
                label={{ value: '現在', position: 'insideTopRight', fontSize: 11, fill: '#64748b' }}
              />
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
