import { formatCurrency } from '../utils/format';

interface Card {
  label: string;
  value: number;
  tone?: 'positive' | 'negative' | 'neutral';
}

interface Props {
  totalIncome: number;
  totalExpense: number;
  startBalance: number;
  projectedEnd: number;
  netValue: number;
}

export default function SummaryCards({
  totalIncome,
  totalExpense,
  startBalance,
  projectedEnd,
  netValue,
}: Props) {
  const cards: Card[] = [
    { label: '月初餘額', value: startBalance, tone: 'neutral' },
    { label: '當月總收入', value: totalIncome, tone: 'positive' },
    { label: '當月總支出', value: totalExpense, tone: 'negative' },
    { label: '當月淨值', value: netValue, tone: netValue >= 0 ? 'positive' : 'negative' },
    { label: '月末預計餘額', value: projectedEnd, tone: projectedEnd >= startBalance ? 'positive' : 'negative' },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {cards.map((c) => (
        <div
          key={c.label}
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div className="text-xs uppercase tracking-wide text-slate-500">{c.label}</div>
          <div
            className={
              'mt-1 text-2xl font-semibold ' +
              (c.tone === 'positive'
                ? 'text-emerald-600'
                : c.tone === 'negative'
                  ? 'text-rose-600'
                  : 'text-slate-900')
            }
          >
            {formatCurrency(c.value)}
          </div>
        </div>
      ))}
    </div>
  );
}
