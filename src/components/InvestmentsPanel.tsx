import { useEffect, useState } from 'react';
import type { Investment, Quote } from '../types';
import { useRtdbList } from '../hooks/useRtdbList';
import { getQuote, isFinnhubConfigured } from '../api/finnhub';
import { formatPercent, formatUSD } from '../utils/format';
import InvestmentForm from './InvestmentForm';

export default function InvestmentsPanel() {
  const api = useRtdbList<Investment>('investments');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Investment | null>(null);
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const symbols = Array.from(new Set(api.items.map((i) => i.symbol.toUpperCase())));
  const symbolsKey = symbols.join(',');

  useEffect(() => {
    if (!isFinnhubConfigured || symbols.length === 0) return;
    let cancelled = false;
    const load = async () => {
      for (const sym of symbols) {
        try {
          const q = await getQuote(sym);
          if (!cancelled) setQuotes((m) => ({ ...m, [sym]: q }));
        } catch (e) {
          if (!cancelled) setErrors((m) => ({ ...m, [sym]: (e as Error).message }));
        }
      }
    };
    load();
    const t = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbolsKey]);

  const items = [...api.items].sort((a, b) => a.createdAt - b.createdAt);

  const totals = items.reduce(
    (acc, inv) => {
      const q = quotes[inv.symbol.toUpperCase()];
      const cost = inv.shares * inv.avgCost;
      acc.cost += cost;
      if (q) {
        const mv = inv.shares * q.c;
        acc.marketValue += mv;
        acc.pnl += mv - cost;
      }
      return acc;
    },
    { cost: 0, marketValue: 0, pnl: 0 },
  );

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <header className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">美股投資</h2>
          {items.length > 0 && (
            <div className="text-xs text-slate-500">
              成本 {formatUSD(totals.cost)} · 市值 {formatUSD(totals.marketValue)} ·{' '}
              <span className={totals.pnl >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                損益 {formatUSD(totals.pnl)}
              </span>
            </div>
          )}
        </div>
        <button
          onClick={() => setCreating(true)}
          className="rounded-md bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700"
        >
          + 新增標的
        </button>
      </header>
      {!isFinnhubConfigured && (
        <p className="mb-3 rounded-md bg-amber-50 p-2 text-xs text-amber-700">
          尚未設定 <code>VITE_FINNHUB_API_KEY</code>，即時股價功能關閉；仍可記錄持股。
        </p>
      )}
      {api.loading ? (
        <p className="text-sm text-slate-500">載入中…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-500">尚未新增任何投資標的</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr className="text-left">
                <th className="py-2">代號</th>
                <th className="py-2">股數</th>
                <th className="py-2">成本</th>
                <th className="py-2">現價</th>
                <th className="py-2">漲跌</th>
                <th className="py-2">市值</th>
                <th className="py-2">未實現損益</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((inv) => {
                const sym = inv.symbol.toUpperCase();
                const q = quotes[sym];
                const err = errors[sym];
                const cost = inv.shares * inv.avgCost;
                const mv = q ? inv.shares * q.c : NaN;
                const pnl = q ? mv - cost : NaN;
                return (
                  <tr key={inv.id}>
                    <td className="py-2 font-semibold">
                      {sym}
                      {inv.note && <div className="text-xs font-normal text-slate-500">{inv.note}</div>}
                    </td>
                    <td className="py-2">{inv.shares}</td>
                    <td className="py-2">{formatUSD(inv.avgCost)}</td>
                    <td className="py-2">{q ? formatUSD(q.c) : err ? '—' : '…'}</td>
                    <td className={`py-2 ${q && q.d >= 0 ? 'text-emerald-600' : q ? 'text-rose-600' : ''}`}>
                      {q ? `${q.d >= 0 ? '+' : ''}${formatUSD(q.d)} (${formatPercent(q.dp / 100)})` : '—'}
                    </td>
                    <td className="py-2">{q ? formatUSD(mv) : '—'}</td>
                    <td className={`py-2 ${Number.isFinite(pnl) ? (pnl >= 0 ? 'text-emerald-600' : 'text-rose-600') : ''}`}>
                      {Number.isFinite(pnl) ? `${pnl >= 0 ? '+' : ''}${formatUSD(pnl)}` : '—'}
                    </td>
                    <td className="py-2 text-right">
                      <button
                        onClick={() => setEditing(inv)}
                        className="mr-2 text-xs text-slate-500 hover:text-sky-700"
                      >
                        編輯
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`刪除 ${sym}？`)) api.remove(inv.id);
                        }}
                        className="text-xs text-slate-500 hover:text-rose-600"
                      >
                        刪除
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {Object.keys(errors).length > 0 && (
            <p className="mt-2 text-xs text-rose-600">
              報價錯誤：
              {Object.entries(errors)
                .map(([s, e]) => `${s} (${e})`)
                .join('，')}
            </p>
          )}
        </div>
      )}
      {creating && (
        <InvestmentForm
          onSubmit={async (data) => {
            await api.add(data);
          }}
          onClose={() => setCreating(false)}
        />
      )}
      {editing && (
        <InvestmentForm
          initial={editing}
          onSubmit={async (data) => {
            await api.updateItem(editing.id, data);
          }}
          onClose={() => setEditing(null)}
        />
      )}
    </section>
  );
}
