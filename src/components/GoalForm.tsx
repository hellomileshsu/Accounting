import { useEffect, useState } from 'react';
import type { Goal } from '../types';

interface Props {
  initial?: Goal | null;
  onSubmit: (data: Omit<Goal, 'id'>) => Promise<void> | void;
  onClose: () => void;
}

export default function GoalForm({ initial, onSubmit, onClose }: Props) {
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [deadline, setDeadline] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initial) {
      setName(initial.name);
      setTarget(String(initial.targetAmount));
      setDeadline(initial.deadline ?? '');
    }
  }, [initial]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const tNum = Number(target);
    if (!name.trim() || !Number.isFinite(tNum) || tNum <= 0) return;
    setSaving(true);
    try {
      await onSubmit({
        name: name.trim(),
        targetAmount: tNum,
        deadline: deadline || undefined,
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
          <h3 className="text-lg font-semibold">{initial ? '編輯' : '新增'}存錢目標</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            ✕
          </button>
        </div>
        <div className="space-y-3">
          <label className="block">
            <div className="mb-1 text-xs font-medium text-slate-600">目標名稱</div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="input"
              placeholder="如：旅遊基金、緊急預備金"
            />
          </label>
          <label className="block">
            <div className="mb-1 text-xs font-medium text-slate-600">目標金額</div>
            <input
              type="number"
              min={0}
              step="any"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              required
              className="input"
            />
          </label>
          <label className="block">
            <div className="mb-1 text-xs font-medium text-slate-600">期限 (選填)</div>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="input"
            />
          </label>
          <p className="rounded-md bg-sky-50 p-2 text-xs text-sky-700">
            💡 目前已存金額會從「關聯到此目標的支出」自動累計，新增支出時可於表單選擇關聯目標。
          </p>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md bg-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-300">
            取消
          </button>
          <button type="submit" disabled={saving} className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-60">
            {saving ? '儲存中…' : '儲存'}
          </button>
        </div>
        <style>{`.input{width:100%;border:1px solid rgb(203 213 225);border-radius:0.375rem;padding:0.5rem 0.75rem;font-size:0.95rem;}.input:focus{outline:none;border-color:rgb(14 165 233);box-shadow:0 0 0 1px rgb(14 165 233);}`}</style>
      </form>
    </div>
  );
}
