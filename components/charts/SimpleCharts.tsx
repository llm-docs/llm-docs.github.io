type TimelineItem = {
  label: string;
  date: string;
  meta: string;
};

type BarDatum = {
  label: string;
  value: number;
};

export function ReleaseTimeline({ items }: { items: TimelineItem[] }) {
  const sorted = [...items].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return (
    <div className="space-y-4">
      <div className="relative border-l border-white/12 pl-6">
        {sorted.map((item) => (
          <div key={`${item.date}-${item.label}`} className="relative mb-6">
            <span className="absolute -left-[1.9rem] top-1 h-3 w-3 rounded-full bg-sky-400" />
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{item.date}</p>
            <h3 className="text-base font-semibold text-slate-50">{item.label}</h3>
            <p className="text-sm text-slate-300">{item.meta}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HorizontalBarChart({ data, maxValue }: { data: BarDatum[]; maxValue?: number }) {
  const ceiling = maxValue || Math.max(...data.map((item) => item.value), 1);
  return (
    <div className="space-y-3">
      {data.map((item) => (
        <div key={item.label} className="space-y-1">
          <div className="flex items-center justify-between text-sm text-slate-300">
            <span>{item.label}</span>
            <span>{item.value}</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-white/8">
            <div className="h-full rounded-full bg-sky-400" style={{ width: `${(item.value / ceiling) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
