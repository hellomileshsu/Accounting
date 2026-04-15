import { useMemo, useState } from 'react';
import type { Goal } from '../types';
import { useRtdbList } from '../hooks/useRtdbList';
import { useAllMonths } from '../hooks/useAllMonths';
import { formatCurrency, formatPercent } from '../utils/format';
import GoalForm from './GoalForm';

export default function GoalsPanel() {
  const api = useRtdbList<Goal>('goals');
  const { months } = useAllMonths();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);

  // 目標已存金額 = Σ 所有月份 expenses 中 goalId 命中的金額
  const savedByGoal = useMemo(() => {
    const sum: Record<string, number> = {};
    Object.values(months).forEach((m) => {
      if (!m?.expenses) return;
      Object.values(m.expenses).forEach((e) => {
        if (e.goalId) sum[e.goalId] = (sum[e.goalId] ?? 0) + Number(e.amount || 0);
      });
    });
    return sum;
  }, [months]);

  const items = [...api.items].sort((a, b) => a.createdAt - b.createdAt);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <header className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">存錢目標</h2>
        <button
          onClick={() => setCreating(true)}
          className="rounded-md bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700"
        >
          + 新增目標
        </button>
      </header>
      {api.loading ? (
        <p className="text-sm text-slate-500">載入中…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-500">尚未建立任何目標</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {items.map((g) => {
            const current = savedByGoal[g.id] ?? 0;
            const progress = g.targetAmount > 0 ? Math.min(1, current / g.targetAmount) : 0;
            const remaining = Math.max(0, g.targetAmount - current);
            return (
              <div key={g.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium">{g.name}</div>
                    {g.deadline && <div className="text-xs text-slate-500">期限：{g.deadline}</div>}
                  </div>
                  <div className="flex gap-2 text-xs">
                    <button onClick={() => setEditing(g)} className="text-slate-500 hover:text-sky-700">
                      編輯
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`刪除目標「${g.name}」？（已關聯的支出不會被刪除，僅解除關聯）`)) {
                          api.remove(g.id);
                        }
                      }}
                      className="text-slate-500 hover:text-rose-600"
                    >
                      刪除
                    </button>
                  </div>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full bg-emerald-500 transition-all"
                    style={{ width: `${progress * 100}%` }}
                  />
                </div>
                <div className="mt-1 flex justify-between text-xs text-slate-600">
                  <span>
                    {formatCurrency(current)} / {formatCurrency(g.targetAmount)}
                  </span>
                  <span>
                    {formatPercent(progress)} · 剩 {formatCurrency(remaining)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {creating && (
        <GoalForm
          onSubmit={async (data) => {
            await api.add(data);
          }}
          onClose={() => setCreating(false)}
        />
      )}
      {editing && (
        <GoalForm
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
