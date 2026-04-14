import { useEffect, useState } from 'react';
import type { Transaction, TransactionKind } from '../types';
import { todayIso } from '../utils/month';

interface Props {
  kind: TransactionKind;
  initial?: Transaction | null;
  onSubmit: (data: Omit<Transaction, 'id'>) => Promise<void> | void;
  onClose: () => void;
}

export default function TransactionForm({ kind, initial, onSubmit, onClose }: Props) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayIso());
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initial) {
      setName(initial.name);
      setAmount(String(initial.amount));
      setDate(initial.date);
      setNote(initial.note ?? '');
    }
  }, [initial]);

  const title = kind === 'income' ? '收入' : '支出';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = Number(amount);
    if (!name.trim() || !Number.isFinite(n) || n < 0) return;
    setSaving(true);
    try {
      await onSubmit({ name: name.trim(), amount: n, date, note: note.trim() || undefined });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-slate-900/40 p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            {initial ? '編輯' : '新增'}
            {title}項目
          </h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            ✕
          </button>
        </div>
        <div className="space-y-3">
          <Field label="名稱">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="input"
              placeholder={kind === 'income' ? '薪資、獎金…' : '房租、伙食費…'}
            />
          </Field>
          <Field label="金額">
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className="input"
            />
          </Field>
          <Field label="日期">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="input"
            />
          </Field>
          <Field label="備註 (選填)">
            <input value={note} onChange={(e) => setNote(e.target.value)} className="input" />
          </Field>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-300"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-60"
          >
            {saving ? '儲存中…' : '儲存'}
          </button>
        </div>
        <style>{`.input{width:100%;border:1px solid rgb(203 213 225);border-radius:0.375rem;padding:0.5rem 0.75rem;font-size:0.95rem;}
        .input:focus{outline:none;border-color:rgb(14 165 233);box-shadow:0 0 0 1px rgb(14 165 233);}`}</style>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-medium text-slate-600">{label}</div>
      {children}
    </label>
  );
}
