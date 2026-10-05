import { Terminal, Database, Boxes, ClipboardCheck, ListChecks, Flame, HeartPulse, MessageSquare } from 'lucide-react';
import SectionHeading from '@/components/SectionHeading';
import Callout from '@/components/Callout';

const commands = [
  {
    title: 'Install Dependencies',
    cmd: 'pip install -r requirements.txt',
    desc: 'Installs TensorFlow, Streamlit, OpenCV, scikit-learn, and all required packages.',
  },
  {
    title: 'Train All Models (5 models, 2-phase)',
    cmd: 'python -m src.train',
    desc: 'Trains Custom CNN, ViT, Swin, ResNet-50, and DenseNet-121 with CLAHE, class weights, and fine-tuning.',
  },
  {
    title: 'Train DenseNet-121 Only (Best Model)',
    cmd: 'python -m src.train --models DENSENET121 --epochs 30',
    desc: 'Train only DenseNet-121 — the best performing model at 95.5% accuracy.',
  },
  {
    title: 'Evaluate All Models',
    cmd: 'python -m src.evaluate',
    desc: 'Evaluates all trained models on the unseen test set. Generates confusion matrices, ROC curves, and benchmark JSON.',
  },
  {
    title: 'Full Pipeline (Train + Evaluate + Test)',
    cmd: 'python run_pipeline.py',
    desc: 'Runs dataset check, training, evaluation, and sample predictions in one command.',
  },
  {
    title: 'Predict a Single Image',
    cmd: 'python -m src.predict path/to/xray.png --model DENSENET121',
    desc: 'Runs inference on one image and prints predicted class, probability, and confidence.',
  },
  {
    title: 'Generate Grad-CAM Visualization',
    cmd: 'python -m src.gradcam path/to/xray.png --model CUSTOM_CNN --alpha 0.4',
    desc: 'Generates Grad-CAM heatmap overlay showing which regions influenced the prediction.',
  },
  {
    title: 'Launch Streamlit Web App',
    cmd: 'streamlit run app.py',
    desc: 'Starts the interactive web app with prediction, Grad-CAM, AI doctor, and benchmark tabs.',
  },
];

const datasetStructure = `dataset/
├── train/
│   ├── non_fracture/    # augmented + CLAHE during training
│   └── fracture/        # augmented + CLAHE during training
├── val/
│   ├── non_fracture/    # NOT augmented — CLAHE + blur only
│   └── fracture/        # NOT augmented
└── test/
    ├── non_fracture/    # NOT augmented — completely unseen
    └── fracture/        # NOT augmented`;

const verificationChecklist = [
  'Dataset counts for train/val/test splits',
  'Class mapping: 0 = Non-Fracture, 1 = Fracture',
  'Train/validation/test counts are balanced and non-overlapping',
  'Best model checkpoint loaded from correct path',
  'Test confusion matrix shows correct TN/FP/FN/TP alignment',
  'Test accuracy, precision, recall, specificity, F1, ROC-AUC all computed from same predictions',
  'Sample predictions from both classes match expected labels',
  'Confidence values derived from model sigmoid output (not hard-coded)',
  'Threshold calibrated on validation data only',
  'Test data is never augmented',
  'CLAHE preprocessing applied identically in training and inference',
  'Grad-CAM heatmap generated on the correct conv layer',
  'Treatment plan appears after prediction with correct content',
  'AI Doctor consultation responds with relevant medical context',
];

const fileChanges = [
  { file: 'src/config.py', status: 'updated', reason: 'Added DenseNet-121, CLAHE flag, 30 epochs, fine-tune epochs, class weight support' },
  { file: 'src/preprocessing.py', status: 'updated', reason: 'Added CLAHE contrast enhancement, compute_class_weights function, stronger augmentation' },
  { file: 'src/models.py', status: 'updated', reason: 'Added DenseNet-121, deeper Custom CNN (5 blocks), 2-phase fine-tuning support, unfreeze_top_layers' },
  { file: 'src/train.py', status: 'updated', reason: '2-phase training (frozen+fine-tune), class weights, 30+15 epochs, DenseNet-121' },
  { file: 'src/evaluate.py', status: 'fixed', reason: 'Correct confusion matrix with TN/FP/FN/TP labels, all metrics from same predictions' },
  { file: 'src/predict.py', status: 'updated', reason: 'Uses CLAHE preprocessing, defaults to DenseNet-121' },
  { file: 'src/gradcam.py', status: 'new', reason: 'Grad-CAM explainability module — heatmap generation and overlay for all conv-based models' },
  { file: 'app.py', status: 'updated', reason: 'Added Grad-CAM tab, AI Doctor consultation tab, treatment plan, DenseNet-121 support' },
  { file: 'run_pipeline.py', status: 'updated', reason: 'Includes DenseNet-121 in default model list' },
];

export default function DocsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="Reference"
        title="Documentation & Commands"
        description="Everything needed to train, evaluate, and run the Bone Fracture AI system with all new features."
      />

      {/* ── Commands ──────────────────────────────────────── */}
      <div className="mb-12">
        <div className="mb-6 flex items-center gap-2">
          <Terminal className="h-5 w-5 text-sky-400" />
          <h2 className="text-xl font-bold text-slate-100">Commands</h2>
        </div>
        <div className="space-y-4">
          {commands.map((c) => (
            <div key={c.title} className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
              <p className="text-sm font-semibold text-slate-200">{c.title}</p>
              <div className="mt-2 overflow-x-auto rounded-lg border border-slate-800 bg-slate-950/80 px-4 py-2.5">
                <code className="code-block text-sm text-emerald-300">$ {c.cmd}</code>
              </div>
              <p className="mt-2 text-xs text-slate-400">{c.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Dataset Structure ─────────────────────────────── */}
      <div className="mb-12">
        <div className="mb-6 flex items-center gap-2">
          <Database className="h-5 w-5 text-sky-400" />
          <h2 className="text-xl font-bold text-slate-100">Dataset Structure</h2>
        </div>
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60 p-5">
          <pre className="code-block text-sm text-slate-300"><code>{datasetStructure}</code></pre>
        </div>
        <Callout variant="warning" title="Data Split Rules">
          Train data is augmented (rotation 20, shift 0.15, zoom 0.15, flip, brightness). Validation and test
          data are <strong>never</strong> augmented. CLAHE and Gaussian blur are applied to all splits identically.
          No duplicate images should exist across splits. The test set is completely unseen until final evaluation.
        </Callout>
      </div>

      {/* ── New Features ──────────────────────────────────── */}
      <div className="mb-12">
        <h2 className="mb-6 text-xl font-bold text-slate-100">New Features (v3.0)</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
            <HeartPulse className="h-6 w-6 text-rose-400" />
            <p className="mt-3 text-sm font-semibold text-slate-200">Treatment Plan</p>
            <p className="mt-1 text-xs text-slate-400">Post-prediction guidance with next steps, lifestyle, follow-up, and warning signs</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
            <MessageSquare className="h-6 w-6 text-sky-400" />
            <p className="mt-3 text-sm font-semibold text-slate-200">AI Doctor</p>
            <p className="mt-1 text-xs text-slate-400">Chat interface to discuss predictions, symptoms, and bone health</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
            <Flame className="h-6 w-6 text-amber-400" />
            <p className="mt-3 text-sm font-semibold text-slate-200">Grad-CAM</p>
            <p className="mt-1 text-xs text-slate-400">Heatmap overlay showing which X-ray regions influenced the prediction</p>
          </div>
        </div>
      </div>

      {/* ── File Changes ──────────────────────────────────── */}
      <div className="mb-12">
        <div className="mb-6 flex items-center gap-2">
          <Boxes className="h-5 w-5 text-sky-400" />
          <h2 className="text-xl font-bold text-slate-100">Modified Files</h2>
        </div>
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400">
                <th className="px-4 py-3 text-left font-semibold">File</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-left font-semibold">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {fileChanges.map((f) => (
                <tr key={f.file} className="hover:bg-slate-900/40">
                  <td className="px-4 py-3 font-mono text-xs text-slate-300">{f.file}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${
                      f.status === 'fixed' ? 'bg-emerald-500/15 text-emerald-300'
                      : f.status === 'new' ? 'bg-sky-500/15 text-sky-300'
                      : 'bg-amber-500/15 text-amber-300'
                    }`}>
                      {f.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">{f.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Verification Checklist ────────────────────────── */}
      <div className="mb-12">
        <div className="mb-6 flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-sky-400" />
          <h2 className="text-xl font-bold text-slate-100">Final Verification Checklist</h2>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6">
          <ul className="space-y-3">
            {verificationChecklist.map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
                <ListChecks className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── Metric Definitions ────────────────────────────── */}
      <div>
        <h2 className="mb-6 text-xl font-bold text-slate-100">Metric Definitions</h2>
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-5">
          <pre className="code-block text-sm text-slate-300"><code>{`Positive class = FRACTURE (index 1)

Confusion Matrix:
                 Predicted
              Non-Fracture  Fracture
Actual
Non-Fracture      TN           FP
Fracture          FN           TP

Accuracy    = (TP + TN) / (TP + TN + FP + FN)
Precision   = TP / (TP + FP)
Recall      = TP / (TP + FN)    (Sensitivity)
Specificity = TN / (TN + FP)
F1-Score    = 2 x Precision x Recall / (Precision + Recall)
ROC-AUC     = Area under FPR vs TPR curve`}</code></pre>
        </div>
      </div>
    </div>
  );
}
