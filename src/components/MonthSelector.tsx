interface Props {
  value: string;
  onChange: (v: string) => void;
}

export default function MonthSelector({ value, onChange }: Props) {
  return (
    <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
      <span>月份</span>
      <input
        type="month"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-slate-300 bg-white px-3 py-1.5 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
      />
    </label>
  );
}
