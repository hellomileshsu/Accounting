import { useEffect, useState } from 'react';
import type { Goal, RecurringInterval, RecurringRule, TransactionKind } from '../types';
import { todayIso } from '../utils/month';
import { INTERVAL_LABELS } from '../utils/recurring';

interface Props {
  initial?: RecurringRule | null;
  goals: Goal[];
  onSubmit: (data: Omit<RecurringRule, 'id'>) => Promise<void> | void;
  onClose: () => void;
}

const INTERVALS: RecurringInterval[] = ['weekly', 'bimonthly', 'monthly', 'yearly'];

export default function RecurringForm({ initial, goals, onSubmit, onClose }: Props) {
  const [kind, setKind] = useState<TransactionKind>('expenses');
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [interval, setInterval] = useState<RecurringInterval>('monthly');
  const [startDate, setStartDate] = useState(todayIso());
  const [endDate, setEndDate] = useState('');
  const [note, setNote] = useState('');
  const [goalId, setGoalId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initial) {
      setKind(initial.kind);
      setName(initial.name);
      setAmount(String(initial.amount));
      setInterval(initial.interval);
      setStartDate(initial.startDate);
      setEndDate(initial.endDate ?? '');
      setNote(initial.note ?? '');
      setGoalId(initial.goalId ?? '');
    }
  }, [initial]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = Number(amount);
    if (!name.trim() || !Number.isFinite(n) || n <= 0) return;
    setSaving(true);
    try {
      await onSubmit({
        kind,
        name: name.trim(),
        amount: n,
        interval,
        startDate,
        endDate: endDate || undefined,
        note: note.trim() || undefined,
        goalId: kind === 'expenses' && goalId ? goalId : undefined,
        createdAt: initial?.createdAt ?? Date.now(),
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-slate-900/40 p-4">
      <form onSubmit={submit} className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">{initial ? '編輯' : '新增'}重複記帳</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        <div className="space-y-3">
          {/* 種類 */}
          <div>
            <div className="mb-1 text-xs font-medium text-slate-600">種類</div>
            <div className="flex overflow-hidden rounded-md border border-slate-300 text-sm">
              {(['income', 'expenses'] as TransactionKind[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  className={
                    'flex-1 py-2 ' +
                    (kind === k ? 'bg-sky-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-50')
                  }
                >
                  {k === 'income' ? '收入' : '支出'}
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <div className="mb-1 text-xs font-medium text-slate-600">名稱</div>
            <input value={name} onChange={(e) => setName(e.target.value)} required className="input" placeholder="薪資、房租、訂閱費…" />
          </label>

          <label className="block">
            <div className="mb-1 text-xs font-medium text-slate-600">金額</div>
            <input type="number" min={0} step="any" value={amount} onChange={(e) => setAmount(e.target.value)} required className="input" />
          </label>

          <div>
            <div className="mb-1 text-xs font-medium text-slate-600">重複間隔</div>
            <div className="grid grid-cols-4 gap-1">
              {INTERVALS.map((iv) => (
                <button
                  key={iv}
                  type="button"
                  onClick={() => setInterval(iv)}
                  className={
                    'rounded-md border py-1.5 text-xs ' +
                    (interval === iv
                      ? 'border-sky-500 bg-sky-50 text-sky-700 font-medium'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50')
                  }
                >
                  {INTERVAL_LABELS[iv]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <div className="mb-1 text-xs font-medium text-slate-600">開始日期</div>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required className="input" />
            </label>
            <label className="block">
              <div className="mb-1 text-xs font-medium text-slate-600">結束日期 (選填)</div>
              <input type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} className="input" />
            </label>
          </div>

          <label className="block">
            <div className="mb-1 text-xs font-medium text-slate-600">備註 (選填)</div>
            <input value={note} onChange={(e) => setNote(e.target.value)} className="input" />
          </label>

          {kind === 'expenses' && goals.length > 0 && (
            <label className="block">
              <div className="mb-1 text-xs font-medium text-slate-600">關聯目標 (選填)</div>
              <select value={goalId} onChange={(e) => setGoalId(e.target.value)} className="input">
                <option value="">— 不關聯 —</option>
                {goals.map((g) => (
                  <option key={g.id} value={g.id}>🎯 {g.name}</option>
                ))}
              </select>
            </label>
          )}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md bg-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-300">取消</button>
          <button type="submit" disabled={saving} className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-60">
            {saving ? '儲存中…' : '儲存'}
          </button>
        </div>
        <style>{`.input{width:100%;border:1px solid rgb(203 213 225);border-radius:0.375rem;padding:0.5rem 0.75rem;font-size:0.95rem;}.input:focus{outline:none;border-color:rgb(14 165 233);box-shadow:0 0 0 1px rgb(14 165 233);}`}</style>
      </form>
    </div>
  );
}
