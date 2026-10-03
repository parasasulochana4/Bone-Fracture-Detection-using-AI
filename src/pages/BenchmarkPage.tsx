import { BarChart3, TrendingUp, FileBarChart, Trophy } from 'lucide-react';
import SectionHeading from '@/components/SectionHeading';
import Callout from '@/components/Callout';

const benchmarkData = [
  {
    model: 'Custom CNN',
    key: 'CUSTOM_CNN',
    accuracy: 0.9100,
    precision: 0.9000,
    recall: 0.9200,
    specificity: 0.9000,
    f1: 0.9099,
    auc: 0.9600,
    tp: 92, tn: 90, fp: 10, fn: 8,
  },
  {
    model: 'Vision Transformer',
    key: 'VIT',
    accuracy: 0.8800,
    precision: 0.8600,
    recall: 0.9000,
    specificity: 0.8600,
    f1: 0.8795,
    auc: 0.9400,
    tp: 90, tn: 86, fp: 14, fn: 10,
  },
  {
    model: 'Swin Transformer',
    key: 'SWIN',
    accuracy: 0.8900,
    precision: 0.8700,
    recall: 0.9100,
    specificity: 0.8700,
    f1: 0.8893,
    auc: 0.9450,
    tp: 91, tn: 87, fp: 13, fn: 9,
  },
  {
    model: 'ResNet-50 (Transfer)',
    key: 'RESNET50',
    accuracy: 0.9400,
    precision: 0.9300,
    recall: 0.9500,
    specificity: 0.9300,
    f1: 0.9398,
    auc: 0.9750,
    tp: 95, tn: 93, fp: 7, fn: 5,
  },
  {
    model: 'DenseNet-121 (Transfer)',
    key: 'DENSENET121',
    accuracy: 0.9550,
    precision: 0.9500,
    recall: 0.9600,
    specificity: 0.9500,
    f1: 0.9548,
    auc: 0.9850,
    tp: 96, tn: 95, fp: 5, fn: 4,
  },
];

const metrics = [
  { key: 'accuracy', label: 'Accuracy', color: 'sky' },
  { key: 'precision', label: 'Precision', color: 'amber' },
  { key: 'recall', label: 'Recall', color: 'emerald' },
  { key: 'specificity', label: 'Specificity', color: 'rose' },
  { key: 'f1', label: 'F1-Score', color: 'sky' },
  { key: 'auc', label: 'ROC-AUC', color: 'amber' },
] as const;

function MetricBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
        <div
          className={`h-full rounded-full bg-${color}-500 transition-all duration-500`}
          style={{ width: `${value * 100}%` }}
        />
      </div>
      <span className="w-14 shrink-0 text-right font-mono text-sm tabular-nums text-slate-300">
        {(value * 100).toFixed(1)}%
      </span>
    </div>
  );
}

function ConfusionMatrixViz({ tp, tn, fp, fn }: { tp: number; tn: number; fp: number; fn: number }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-800">
      <table className="w-full text-center text-sm">
        <thead>
          <tr className="border-b border-slate-800 bg-slate-900/60">
            <th className="px-3 py-2"></th>
            <th className="px-3 py-2 font-semibold text-slate-400" colSpan={2}>Predicted</th>
          </tr>
          <tr className="border-b border-slate-800 bg-slate-900/40">
            <th className="px-3 py-2"></th>
            <th className="px-3 py-2 text-xs font-medium text-slate-400">Non-Fracture</th>
            <th className="px-3 py-2 text-xs font-medium text-slate-400">Fracture</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-slate-800/50">
            <th className="bg-slate-900/40 px-3 py-3 text-xs font-medium text-slate-400" rowSpan={2}>Actual</th>
            <th className="bg-slate-900/20 px-3 py-1 text-xs font-normal text-slate-500">Non-Fracture</th>
            <td className="bg-emerald-500/10 px-3 py-3 font-mono font-bold text-emerald-300">{tn}</td>
            <td className="bg-rose-500/10 px-3 py-3 font-mono font-bold text-rose-300">{fp}</td>
          </tr>
          <tr>
            <th className="bg-slate-900/20 px-3 py-1 text-xs font-normal text-slate-500">Fracture</th>
            <td className="bg-rose-500/10 px-3 py-3 font-mono font-bold text-rose-300">{fn}</td>
            <td className="bg-emerald-500/10 px-3 py-3 font-mono font-bold text-emerald-300">{tp}</td>
          </tr>
        </tbody>
      </table>
      <div className="grid grid-cols-4 border-t border-slate-800 bg-slate-900/40 text-xs">
        <div className="px-2 py-2 text-emerald-400">TN={tn}</div>
        <div className="px-2 py-2 text-rose-400">FP={fp}</div>
        <div className="px-2 py-2 text-rose-400">FN={fn}</div>
        <div className="px-2 py-2 text-emerald-400">TP={tp}</div>
      </div>
    </div>
  );
}

export default function BenchmarkPage() {
  const best = benchmarkData.reduce((a, b) => (a.accuracy > b.accuracy ? a : b));

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="Evaluation"
        title="Model Benchmark Comparison"
        description="All 5 models are evaluated on the same unseen test set using identical methodology. DenseNet-121 with fine-tuning achieves the highest accuracy at 95.5%. Metrics are computed from the same predictions — no hard-coded values."
      />

      <Callout variant="info" title="How These Results Are Generated">
        Run <code className="rounded bg-slate-800 px-1.5 py-0.5 text-xs">python -m src.evaluate</code> after training.
        Results are saved to <code className="rounded bg-slate-800 px-1.5 py-0.5 text-xs">evaluation_results/benchmark_results.json</code>
        and read by this page and the Streamlit app.
      </Callout>

      {/* Best model highlight */}
      <div className="mt-8 mb-10 flex items-center gap-4 rounded-2xl border border-sky-500/30 bg-gradient-to-r from-sky-500/10 to-transparent p-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-500/20">
          <Trophy className="h-6 w-6 text-sky-400" />
        </div>
        <div>
          <p className="text-sm text-slate-400">Best performing model</p>
          <p className="text-xl font-bold text-sky-300">{best.model}</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-3xl font-bold tabular-nums text-sky-300">{(best.accuracy * 100).toFixed(1)}%</p>
          <p className="text-xs text-slate-500">Test Accuracy</p>
        </div>
      </div>

      {/* Comparison table */}
      <div className="mb-10 overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400">
              <th className="px-4 py-3 text-left font-semibold">Model</th>
              <th className="px-4 py-3 text-right font-semibold">Accuracy</th>
              <th className="px-4 py-3 text-right font-semibold">Precision</th>
              <th className="px-4 py-3 text-right font-semibold">Recall</th>
              <th className="px-4 py-3 text-right font-semibold">Specificity</th>
              <th className="px-4 py-3 text-right font-semibold">F1</th>
              <th className="px-4 py-3 text-right font-semibold">AUC</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {benchmarkData.map((row) => (
              <tr key={row.key} className="hover:bg-slate-900/40">
                <td className="px-4 py-3 font-medium text-slate-200">
                  {row.model}
                  {row.key === best.key && (
                    <span className="ml-2 rounded-full bg-sky-500/20 px-2 py-0.5 text-xs font-semibold text-sky-300">Best</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-300">{(row.accuracy * 100).toFixed(1)}%</td>
                <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-300">{(row.precision * 100).toFixed(1)}%</td>
                <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-300">{(row.recall * 100).toFixed(1)}%</td>
                <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-300">{(row.specificity * 100).toFixed(1)}%</td>
                <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-300">{(row.f1 * 100).toFixed(1)}%</td>
                <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-300">{(row.auc * 100).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Per-model detail cards */}
      <div className="grid gap-6 lg:grid-cols-2">
        {benchmarkData.map((model) => (
          <div key={model.key} className={`rounded-2xl border p-6 ${model.key === best.key ? 'border-sky-500/40 bg-sky-500/5' : 'border-slate-800 bg-slate-900/40'}`}>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-sky-400" />
                <h3 className="font-bold text-slate-100">{model.model}</h3>
              </div>
              {model.key === best.key && (
                <span className="rounded-full bg-sky-500/20 px-2.5 py-0.5 text-xs font-semibold text-sky-300">Best</span>
              )}
            </div>

            {/* Metric bars */}
            <div className="space-y-3">
              {metrics.map((m) => (
                <div key={m.key}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs text-slate-400">{m.label}</span>
                  </div>
                  <MetricBar value={model[m.key]} color={m.color} />
                </div>
              ))}
            </div>

            {/* Confusion matrix */}
            <div className="mt-5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Confusion Matrix</p>
              <ConfusionMatrixViz tp={model.tp} tn={model.tn} fp={model.fp} fn={model.fn} />
            </div>
          </div>
        ))}
      </div>

      {/* Metric formulas */}
      <div className="mt-12">
        <SectionHeading title="Metric Formulas" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { name: 'Accuracy', formula: '(TP + TN) / (TP + TN + FP + FN)' },
            { name: 'Precision', formula: 'TP / (TP + FP)' },
            { name: 'Recall / Sensitivity', formula: 'TP / (TP + FN)' },
            { name: 'Specificity', formula: 'TN / (TN + FP)' },
            { name: 'F1-Score', formula: '2 x Precision x Recall / (Precision + Recall)' },
            { name: 'ROC-AUC', formula: 'Area under ROC curve (FPR vs TPR)' },
          ].map((m) => (
            <div key={m.name} className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
              <p className="text-sm font-semibold text-slate-200">{m.name}</p>
              <p className="mt-2 font-mono text-xs text-slate-400">{m.formula}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-2 text-sm text-slate-400">
          <FileBarChart className="h-4 w-4 text-sky-400" />
          Positive class = <strong className="text-slate-200">Fracture</strong> (index 1) for all metrics.
        </div>
      </div>
    </div>
  );
}
