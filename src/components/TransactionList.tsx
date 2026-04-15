import { useMemo, useState } from 'react';
import type { Goal, Transaction, TransactionKind } from '../types';
import { formatCurrency } from '../utils/format';
import type { RtdbListApi } from '../hooks/useRtdbList';
import TransactionForm from './TransactionForm';

interface Props {
  kind: TransactionKind;
  api: RtdbListApi<Transaction>;
  goals?: Goal[];
}

export default function TransactionList({ kind, api, goals }: Props) {
  const goalById = useMemo(() => {
    const m = new Map<string, Goal>();
    (goals ?? []).forEach((g) => m.set(g.id, g));
    return m;
  }, [goals]);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [creating, setCreating] = useState(false);

  const title = kind === 'income' ? '收入' : '支出';
  const accent = kind === 'income' ? 'text-emerald-600' : 'text-rose-600';

  const items = [...api.items].sort((a, b) => (a.date < b.date ? 1 : -1));
  const total = items.reduce((s, i) => s + Number(i.amount || 0), 0);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <header className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <div className={`text-sm font-medium ${accent}`}>小計 {formatCurrency(total)}</div>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="rounded-md bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700"
        >
          + 新增
        </button>
      </header>
      {api.loading ? (
        <p className="text-sm text-slate-500">載入中…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-500">尚無資料</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {items.map((t) => (
            <li key={t.id} className="flex items-center justify-between py-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{t.name}</span>
                  {t.goalId && goalById.get(t.goalId) && (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
                      🎯 {goalById.get(t.goalId)!.name}
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-500">
                  {t.date}
                  {t.note ? ` · ${t.note}` : ''}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`font-semibold ${accent}`}>{formatCurrency(t.amount)}</span>
                <button
                  onClick={() => setEditing(t)}
                  className="text-xs text-slate-500 hover:text-sky-700"
                >
                  編輯
                </button>
                <button
                  onClick={() => {
                    if (confirm(`確定刪除「${t.name}」？`)) api.remove(t.id);
                  }}
                  className="text-xs text-slate-500 hover:text-rose-600"
                >
                  刪除
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {creating && (
        <TransactionForm
          kind={kind}
          goals={goals}
          onSubmit={async (data) => {
            await api.add(data);
          }}
          onClose={() => setCreating(false)}
        />
      )}
      {editing && (
        <TransactionForm
          kind={kind}
          goals={goals}
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
