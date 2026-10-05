import { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, XCircle, Info } from 'lucide-react';

type Variant = 'error' | 'success' | 'warning' | 'info';

const variants: Record<Variant, { bg: string; border: string; text: string; icon: typeof AlertTriangle }> = {
  error: { bg: 'bg-rose-500/10', border: 'border-rose-500/30', text: 'text-rose-300', icon: XCircle },
  success: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-300', icon: CheckCircle2 },
  warning: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-300', icon: AlertTriangle },
  info: { bg: 'bg-sky-500/10', border: 'border-sky-500/30', text: 'text-sky-300', icon: Info },
};

interface CalloutProps {
  variant: Variant;
  title?: string;
  children: ReactNode;
}

export default function Callout({ variant, title, children }: CalloutProps) {
  const v = variants[variant];
  const Icon = v.icon;
  return (
    <div className={`rounded-xl border p-4 ${v.bg} ${v.border}`}>
      <div className="flex gap-3">
        <Icon className={`h-5 w-5 shrink-0 ${v.text}`} />
        <div>
          {title && <p className={`mb-1 font-semibold ${v.text}`}>{title}</p>}
          <div className="text-sm text-slate-300">{children}</div>
        </div>
      </div>
    </div>
  );
}
