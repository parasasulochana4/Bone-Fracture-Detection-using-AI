interface MetricCardProps {
  label: string;
  value: string;
  sublabel?: string;
  color?: 'sky' | 'emerald' | 'amber' | 'rose' | 'slate';
}

const colorMap = {
  sky: 'from-sky-500/20 to-sky-500/5 border-sky-500/30 text-sky-300',
  emerald: 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/30 text-emerald-300',
  amber: 'from-amber-500/20 to-amber-500/5 border-amber-500/30 text-amber-300',
  rose: 'from-rose-500/20 to-rose-500/5 border-rose-500/30 text-rose-300',
  slate: 'from-slate-700/40 to-slate-800/10 border-slate-700/50 text-slate-300',
};

export default function MetricCard({ label, value, sublabel, color = 'slate' }: MetricCardProps) {
  return (
    <div className={`rounded-xl border bg-gradient-to-b p-5 transition-all hover:scale-[1.02] ${colorMap[color]}`}>
      <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-bold tabular-nums">{value}</p>
      {sublabel && <p className="mt-1 text-xs text-slate-500">{sublabel}</p>}
    </div>
  );
}
