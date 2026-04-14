import { useEffect, useState } from 'react';
import type { Investment } from '../types';

interface Props {
  initial?: Investment | null;
  onSubmit: (data: Omit<Investment, 'id'>) => Promise<void> | void;
  onClose: () => void;
}

export default function InvestmentForm({ initial, onSubmit, onClose }: Props) {
  const [symbol, setSymbol] = useState('');
  const [shares, setShares] = useState('');
  const [avgCost, setAvgCost] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initial) {
      setSymbol(initial.symbol);
      setShares(String(initial.shares));
      setAvgCost(String(initial.avgCost));
      setNote(initial.note ?? '');
    }
  }, [initial]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const s = Number(shares);
    const c = Number(avgCost);
    if (!symbol.trim() || !Number.isFinite(s) || s <= 0 || !Number.isFinite(c) || c < 0) return;
    setSaving(true);
    try {
      await onSubmit({
        symbol: symbol.trim().toUpperCase(),
        shares: s,
        avgCost: c,
        note: note.trim() || undefined,
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
          <h3 className="text-lg font-semibold">{initial ? '編輯' : '新增'}美股標的</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            ✕
          </button>
        </div>
        <div className="space-y-3">
          <label className="block">
            <div className="mb-1 text-xs font-medium text-slate-600">股票代號 (例：AAPL)</div>
            <input
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              required
              className="input"
              placeholder="AAPL"
            />
          </label>
          <label className="block">
            <div className="mb-1 text-xs font-medium text-slate-600">股數</div>
            <input type="number" min={0} step="any" value={shares} onChange={(e) => setShares(e.target.value)} required className="input" />
          </label>
          <label className="block">
            <div className="mb-1 text-xs font-medium text-slate-600">平均成本 (USD / 股)</div>
            <input type="number" min={0} step="any" value={avgCost} onChange={(e) => setAvgCost(e.target.value)} required className="input" />
          </label>
          <label className="block">
            <div className="mb-1 text-xs font-medium text-slate-600">備註 (選填)</div>
            <input value={note} onChange={(e) => setNote(e.target.value)} className="input" />
          </label>
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
