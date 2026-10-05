import { Link } from 'react-router-dom';
import {
  Bone, ScanLine, Brain, BarChart3, AlertTriangle,
  CheckCircle2, ArrowRight, Activity, Zap, ShieldCheck,
  HeartPulse, MessageSquare, Flame, Network, Trophy,
} from 'lucide-react';

const heroStats = [
  { label: 'Best Accuracy', value: '95.5%' },
  { label: 'Models', value: '5' },
  { label: 'Image Size', value: '224px' },
  { label: 'Features', value: '7+' },
];

const bugFixes = [
  {
    icon: AlertTriangle,
    title: 'Reversed Class Labels',
    problem: 'Training used fracture=0 but inference expected non_fracture=0. Every prediction was inverted.',
    fix: 'Single source of truth: index 0 = Non-Fracture, index 1 = Fracture — consistent across all files.',
    color: 'rose',
  },
  {
    icon: ScanLine,
    title: 'Preprocessing Mismatch',
    problem: 'Inference applied Gaussian blur but training did not. The model never saw the same image distribution.',
    fix: 'Both training and inference now apply identical CLAHE + Gaussian blur + resize + normalization.',
    color: 'amber',
  },
  {
    icon: Brain,
    title: 'Wrong Model Paths',
    problem: 'ViT and Swin models were saved to the evaluation directory instead of the models directory.',
    fix: 'Every model saves to its configured path in models/ and loads from the same location.',
    color: 'sky',
  },
  {
    icon: BarChart3,
    title: 'No Threshold Optimization',
    problem: 'A fixed 0.5 threshold was used regardless of model calibration, causing false positives.',
    fix: 'Optimal threshold found on validation data only (maximizing F1), saved per model.',
    color: 'emerald',
  },
];

const features = [
  { icon: Network, title: 'DenseNet-121 — 95.5%', desc: 'Best model with transfer learning + fine-tuning, CLAHE preprocessing, and class weights' },
  { icon: Brain, title: 'Multi-Model Architecture', desc: 'Custom CNN, ViT, Swin, ResNet-50, and DenseNet-121 — all evaluated on same test set' },
  { icon: HeartPulse, title: 'Treatment Plan', desc: 'Post-prediction guidance with next steps, lifestyle tips, and warning signs' },
  { icon: MessageSquare, title: 'AI Doctor Consultation', desc: 'Chat interface to discuss predictions, symptoms, and get health guidance' },
  { icon: Flame, title: 'Grad-CAM Explainability', desc: 'Heatmap overlay showing which X-ray regions influenced the model decision' },
  { icon: ShieldCheck, title: 'No Data Leakage', desc: 'Clean train/val/test split with no augmentation on validation or test' },
];

export default function HomePage() {
  return (
    <div>
      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-slate-800/80 grid-pattern">
        <div className="absolute inset-0 bg-gradient-to-b from-sky-500/5 via-transparent to-transparent" />
        <div className="absolute left-1/2 top-0 -z-10 h-[400px] w-[800px] -translate-x-1/2 rounded-full bg-sky-500/10 blur-[120px] pulse-glow" />

        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="flex flex-col items-center text-center">
            <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-4 py-1.5 text-sm font-medium text-sky-300">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-sky-500" />
              </span>
              v3.0 — 95.5% Accuracy with DenseNet-121 + New Features
            </span>

            <h1 className="max-w-4xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              AI-Powered Bone Fracture
              <span className="gradient-text"> Detection System</span>
            </h1>

            <p className="mt-6 max-w-2xl text-lg text-slate-400">
              Deep learning pipeline for X-ray fracture classification with CLAHE preprocessing,
              transfer learning, Grad-CAM explainability, treatment plans, and AI doctor consultation
              across five model architectures.
            </p>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link
                to="/demo"
                className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-500/25 transition-all hover:shadow-xl hover:shadow-sky-500/30"
              >
                Try Prediction
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                to="/benchmark"
                className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/50 px-6 py-3 text-sm font-semibold text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-800"
              >
                <BarChart3 className="h-4 w-4" />
                See Benchmark Results
              </Link>
            </div>

            {/* Hero stats */}
            <div className="mt-16 grid w-full max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
              {heroStats.map((stat) => (
                <div key={stat.label} className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-center">
                  <p className="text-2xl font-bold text-sky-300">{stat.value}</p>
                  <p className="mt-1 text-xs uppercase tracking-wider text-slate-500">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Bug Fixes Summary ─────────────────────────────── */}
      <section className="border-b border-slate-800/80 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <span className="mb-2 inline-block rounded-full bg-rose-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-rose-400">
              Root Cause Analysis
            </span>
            <h2 className="text-3xl font-bold tracking-tight">Why Predictions Were Wrong</h2>
            <p className="mx-auto mt-3 max-w-2xl text-slate-400">
              Four bugs caused non-fracture X-rays to be predicted as fracture and vice versa.
              Each has been identified and fixed.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {bugFixes.map((bug) => (
              <div
                key={bug.title}
                className="group rounded-2xl border border-slate-800 bg-slate-900/40 p-6 transition-all hover:border-slate-700 hover:bg-slate-900/70"
              >
                <div className="flex items-start gap-4">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-${bug.color}-500/15`}>
                    <bug.icon className={`h-5 w-5 text-${bug.color}-400`} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-slate-100">{bug.title}</h3>
                    <div className="mt-3 space-y-2">
                      <div className="flex gap-2">
                        <span className="mt-0.5 shrink-0 text-xs font-bold uppercase text-rose-400">Problem</span>
                      </div>
                      <p className="text-sm text-slate-400">{bug.problem}</p>
                      <div className="flex gap-2 pt-1">
                        <span className="mt-0.5 shrink-0 text-xs font-bold uppercase text-emerald-400">Fix</span>
                      </div>
                      <p className="text-sm text-slate-300">{bug.fix}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────── */}
      <section className="border-b border-slate-800/80 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight">System Capabilities</h2>
            <p className="mx-auto mt-3 max-w-2xl text-slate-400">
              Full-featured bone fracture detection with explainability, treatment guidance, and AI consultation.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.title} className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
                <feature.icon className="h-8 w-8 text-sky-400" />
                <h3 className="mt-4 font-semibold text-slate-100">{feature.title}</h3>
                <p className="mt-2 text-sm text-slate-400">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Best Model Highlight ──────────────────────────── */}
      <section className="border-b border-slate-800/80 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center">
            <span className="mb-4 inline-block rounded-full bg-sky-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-sky-400">
              Best Performing Model
            </span>
            <div className="flex items-center gap-3">
              <Trophy className="h-8 w-8 text-sky-400" />
              <h2 className="text-3xl font-bold tracking-tight">DenseNet-121</h2>
            </div>
            <p className="mt-4 max-w-2xl text-slate-400">
              DenseNet-121 with ImageNet transfer learning, 2-phase training (frozen + fine-tune),
              CLAHE preprocessing, and class weight balancing achieves 95.5% test accuracy —
              the highest among all 5 models.
            </p>

            <div className="mt-8 grid w-full max-w-4xl grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { label: 'Accuracy', value: '95.5%' },
                { label: 'F1-Score', value: '95.5%' },
                { label: 'ROC-AUC', value: '98.5%' },
                { label: 'Recall', value: '96.0%' },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-4 text-center">
                  <p className="text-2xl font-bold text-sky-300">{stat.value}</p>
                  <p className="mt-1 text-xs uppercase tracking-wider text-slate-500">{stat.label}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link to="/models" className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/50 px-5 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-800">
                <Brain className="h-4 w-4" />
                View All Models
              </Link>
              <Link to="/explainability" className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/50 px-5 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-800">
                <Flame className="h-4 w-4" />
                Grad-CAM Explainability
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Class Mapping ─────────────────────────────────── */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight">Class Mapping — Single Source of Truth</h2>
            <p className="mx-auto mt-3 max-w-2xl text-slate-400">
              Every file in the system uses this exact mapping. No more reversed labels.
            </p>
          </div>
          <div className="mx-auto max-w-2xl overflow-hidden rounded-2xl border border-slate-800">
            <div className="grid grid-cols-3 border-b border-slate-800 bg-slate-900/60 text-sm font-semibold text-slate-300">
              <div className="px-6 py-3">Index</div>
              <div className="px-6 py-3">Class Name</div>
              <div className="px-6 py-3">Role</div>
            </div>
            <div className="grid grid-cols-3 border-b border-slate-800/50 bg-emerald-500/5">
              <div className="px-6 py-4 font-mono text-emerald-300">0</div>
              <div className="px-6 py-4 text-slate-200">non_fracture</div>
              <div className="px-6 py-4 text-sm text-slate-400">Negative class (TN / FP)</div>
            </div>
            <div className="grid grid-cols-3 bg-rose-500/5">
              <div className="px-6 py-4 font-mono text-rose-300">1</div>
              <div className="px-6 py-4 text-slate-200">fracture</div>
              <div className="px-6 py-4 text-sm text-slate-400">Positive class (TP / FN)</div>
            </div>
          </div>

          <div className="mt-8 flex items-center justify-center gap-2 text-sm text-slate-400">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            Sigmoid output = P(fracture). Prediction = Fracture if P {'>='} threshold.
          </div>
        </div>
      </section>
    </div>
  );
}
