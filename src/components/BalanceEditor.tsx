import { useEffect, useState } from 'react';
import { formatCurrency } from '../utils/format';

interface Props {
  value: number;
  onSave: (n: number) => Promise<void> | void;
  label: string;
}

export default function BalanceEditor({ value, onSave, label }: Props) {
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState(String(value));

  useEffect(() => {
    if (!editing) setInput(String(value));
  }, [value, editing]);

  const commit = async () => {
    const n = Number(input);
    if (Number.isFinite(n)) await onSave(n);
    setEditing(false);
  };

  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      {editing ? (
        <div className="mt-1 flex items-center gap-2">
          <input
            autoFocus
            type="number"
            inputMode="decimal"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit();
              if (e.key === 'Escape') setEditing(false);
            }}
            className="w-40 rounded-md border border-slate-300 px-2 py-1 text-lg font-semibold focus:border-sky-500 focus:outline-none"
          />
          <button
            onClick={commit}
            className="rounded-md bg-sky-600 px-3 py-1 text-sm font-medium text-white hover:bg-sky-700"
          >
            儲存
          </button>
          <button
            onClick={() => setEditing(false)}
            className="rounded-md bg-slate-200 px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-300"
          >
            取消
          </button>
        </div>
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="mt-1 text-2xl font-semibold text-slate-900 hover:text-sky-700"
          title="點擊編輯"
        >
          {formatCurrency(value)}
        </button>
      )}
    </div>
  );
}
