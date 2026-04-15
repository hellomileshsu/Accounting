import { useMemo, useState } from 'react';
import type { Goal, Transaction, TransactionKind } from '../types';
import { formatCurrency, formatPercent } from '../utils/format';
import { achievementRate } from '../utils/recurring';
import type { RtdbListApi } from '../hooks/useRtdbList';
import TransactionForm from './TransactionForm';

interface Props {
  kind: TransactionKind;
  api: RtdbListApi<Transaction>;
  goals?: Goal[];
  /** 未來月份：由重複規則合成的虛擬預覽（尚未實體化寫入 RTDB） */
  recurringItems?: Transaction[];
  /** 刪除 recurring entry 時呼叫：將該日期加入規則的 excludedOccurrences */
  onExcludeOccurrence?: (ruleId: string, date: string) => Promise<void> | void;
}

export default function TransactionList({
  kind,
  api,
  goals,
  recurringItems = [],
  onExcludeOccurrence,
}: Props) {
  const goalById = useMemo(() => {
    const m = new Map<string, Goal>();
    (goals ?? []).forEach((g) => m.set(g.id, g));
    return m;
  }, [goals]);

  const [editing, setEditing] = useState<Transaction | null>(null);
  const [creating, setCreating] = useState(false);

  const title = kind === 'income' ? '收入' : '支出';
  const accent = kind === 'income' ? 'text-emerald-600' : 'text-rose-600';

  const allItems = useMemo(
    () =>
      [...api.items, ...recurringItems].sort((a, b) => (a.date < b.date ? 1 : -1)),
    [api.items, recurringItems],
  );
  const total = allItems.reduce((s, i) => s + Number(i.amount || 0), 0);
  const isEmpty = allItems.length === 0;

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
      ) : isEmpty ? (
        <p className="text-sm text-slate-500">尚無資料</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {allItems.map((t) => {
            const isVirtualPreview = Boolean(t.isRecurring);
            const isMaterialized = !isVirtualPreview && Boolean(t.recurringId);
            const rate =
              typeof t.originalAmount === 'number'
                ? achievementRate(Number(t.amount || 0), t.originalAmount)
                : null;
            // 達成率顏色：income 高為佳、expense 低為佳
            const rateColor = (() => {
              if (rate === null) return 'text-slate-400';
              if (kind === 'income') return rate >= 1 ? 'text-emerald-600' : 'text-amber-600';
              return rate <= 1 ? 'text-emerald-600' : 'text-amber-600';
            })();

            return (
              <li key={t.id} className="flex items-center justify-between py-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="truncate font-medium">{t.name}</span>
                    {isVirtualPreview && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                        🔄 預覽
                      </span>
                    )}
                    {isMaterialized && (
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600">
                        🔄 重複
                      </span>
                    )}
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
                  {typeof t.originalAmount === 'number' &&
                    t.originalAmount !== Number(t.amount || 0) && (
                      <div className="text-xs text-slate-500">
                        原 {formatCurrency(t.originalAmount)}
                        {rate !== null && (
                          <>
                            {' · 達成率 '}
                            <span className={rateColor}>{formatPercent(rate)}</span>
                          </>
                        )}
                      </div>
                    )}
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
                    onClick={async () => {
                      if (!confirm(`確定刪除「${t.name}」？`)) return;
                      if (isVirtualPreview && t.recurringId) {
                        // 預覽項目尚未寫入 RTDB；只需加入排除清單
                        await onExcludeOccurrence?.(t.recurringId, t.date);
                      } else {
                        await api.remove(t.id);
                        if (t.recurringId) {
                          // 實體化的 recurring entry：加入排除清單避免下次自動重建
                          await onExcludeOccurrence?.(t.recurringId, t.date);
                        }
                      }
                    }}
                    className="text-xs text-slate-500 hover:text-rose-600"
                  >
                    刪除
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {creating && (
        <TransactionForm
          kind={kind}
          goals={goals}
          onSubmit={async (data) => { await api.add(data); }}
          onClose={() => setCreating(false)}
        />
      )}
      {editing && (
        <TransactionForm
          kind={kind}
          goals={goals}
          initial={editing}
          onSubmit={async (data) => {
            if (editing.isRecurring) {
              // 虛擬預覽 → 編輯即為首次實體化寫入
              await api.add({ ...data, isRecurring: undefined });
            } else {
              await api.updateItem(editing.id, data);
            }
          }}
          onClose={() => setEditing(null)}
        />
      )}
    </section>
  );
}
