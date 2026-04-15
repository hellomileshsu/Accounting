import { useState } from 'react';
import type { Goal, RecurringRule } from '../types';
import { useRecurring } from '../hooks/useRecurring';
import { useAllMonths } from '../hooks/useAllMonths';
import { INTERVAL_LABELS, cascadeDeleteRecurring, nextOccurrence } from '../utils/recurring';
import { formatCurrency } from '../utils/format';
import RecurringForm from './RecurringForm';

interface Props {
  goals: Goal[];
}

export default function RecurringPanel({ goals }: Props) {
  const api = useRecurring();
  const { months } = useAllMonths();
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingRule, setDeletingRule] = useState<RecurringRule | null>(null);
  const [deleting, setDeleting] = useState(false);

  const items = [...api.items].sort((a, b) => a.createdAt - b.createdAt);
  const editingRule = items.find((r) => r.id === editingId) ?? null;

  async function handleDelete(rule: RecurringRule, cascade: boolean) {
    setDeleting(true);
    try {
      if (cascade) {
        await cascadeDeleteRecurring(rule.id, months);
      }
      await api.remove(rule.id);
      setDeletingRule(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <header className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">🔄 重複記帳規則</h2>
        <button
          onClick={() => setCreating(true)}
          className="rounded-md bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700"
        >
          + 新增規則
        </button>
      </header>
      {api.loading ? (
        <p className="text-sm text-slate-500">載入中…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-500">尚未設定任何重複記帳規則</p>
      ) : (
        <div className="divide-y divide-slate-100">
          {items.map((rule) => {
            const next = nextOccurrence(rule);
            const goalName = rule.goalId ? goals.find((g) => g.id === rule.goalId)?.name : null;
            return (
              <div key={rule.id} className="flex items-center justify-between py-2.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={
                        'rounded-full px-2 py-0.5 text-xs font-medium ' +
                        (rule.kind === 'income'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-rose-50 text-rose-700')
                      }
                    >
                      {rule.kind === 'income' ? '收入' : '支出'}
                    </span>
                    <span className="font-medium">{rule.name}</span>
                    <span className="rounded-full bg-sky-50 px-2 py-0.5 text-xs text-sky-700">
                      {INTERVAL_LABELS[rule.interval]}
                    </span>
                    {goalName && (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
                        🎯 {goalName}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex gap-3 text-xs text-slate-500">
                    <span>{formatCurrency(rule.amount)}</span>
                    <span>起：{rule.startDate}</span>
                    {rule.endDate && <span>迄：{rule.endDate}</span>}
                    {next && <span className="text-sky-600">下次：{next}</span>}
                    {!next && <span className="text-slate-400">已結束</span>}
                  </div>
                </div>
                <div className="ml-4 flex shrink-0 gap-2 text-xs">
                  <button
                    onClick={() => setEditingId(rule.id)}
                    className="text-slate-500 hover:text-sky-700"
                  >
                    編輯
                  </button>
                  <button
                    onClick={() => setDeletingRule(rule)}
                    className="text-slate-500 hover:text-rose-600"
                  >
                    刪除
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {creating && (
        <RecurringForm
          goals={goals}
          onSubmit={async (data) => { await api.add(data); }}
          onClose={() => setCreating(false)}
        />
      )}
      {editingRule && (
        <RecurringForm
          initial={editingRule}
          goals={goals}
          onSubmit={async (data) => { await api.updateItem(editingRule.id, data); }}
          onClose={() => setEditingId(null)}
        />
      )}
      {deletingRule && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold">刪除「{deletingRule.name}」</h3>
            <p className="mt-2 text-sm text-slate-600">
              已產生的月份項目要如何處理？
            </p>
            <div className="mt-4 space-y-2">
              <button
                disabled={deleting}
                onClick={() => handleDelete(deletingRule, false)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-left text-sm hover:bg-slate-50 disabled:opacity-60"
              >
                <div className="font-medium text-slate-800">保留為一般項目</div>
                <div className="text-xs text-slate-500">
                  僅移除規則；各月份已產生的項目保留但不再被管理。
                </div>
              </button>
              <button
                disabled={deleting}
                onClick={() => handleDelete(deletingRule, true)}
                className="w-full rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-left text-sm hover:bg-rose-100 disabled:opacity-60"
              >
                <div className="font-medium text-rose-700">連同所有項目一併刪除</div>
                <div className="text-xs text-rose-600/80">
                  掃過所有月份，移除此規則產生的收支項目（無法復原）。
                </div>
              </button>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                disabled={deleting}
                onClick={() => setDeletingRule(null)}
                className="rounded-md bg-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-300 disabled:opacity-60"
              >
                {deleting ? '處理中…' : '取消'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
