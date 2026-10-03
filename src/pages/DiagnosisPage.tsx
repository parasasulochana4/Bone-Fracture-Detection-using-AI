import {
  AlertTriangle, CheckCircle2, XCircle, ArrowRight, ArrowLeft,
  Code2, GitBranch, ScanLine, Brain, BarChart3,
} from 'lucide-react';
import Callout from '@/components/Callout';
import SectionHeading from '@/components/SectionHeading';

const bugs = [
  {
    id: 1,
    severity: 'critical',
    title: 'Reversed Class Labels — The Primary Cause',
    icon: AlertTriangle,
    file: 'src/preprocessing.py vs src/config.py',
    problem: `config.py defined CLASS_NAMES = ["non_fracture", "fracture"], making index 0 = non_fracture.
But preprocessing.py called flow_from_directory(classes=["fracture", "non_fracture"]),
making index 0 = fracture inside Keras.

The model learned: label 0 = fracture, label 1 = non_fracture.
But inference code and config assumed: label 0 = non_fracture, label 1 = fracture.

Result: every prediction was inverted. A non-fracture X-ray (trained as label 1, outputting
p near 1.0) was interpreted as "fracture" by the inference code. This is exactly why
non-fracture images were predicted as fracture.`,
    fix: `All files now import CLASS_NAMES from config.py and pass it directly to
flow_from_directory(classes=CLASS_NAMES). The mapping is:

  index 0 = non_fracture (Negative)
  index 1 = fracture (Positive)

This is consistent in training, evaluation, inference, and the Streamlit app.`,
    before: `# BROKEN — config.py and preprocessing.py disagreed
CLASS_NAMES = ["non_fracture", "fracture"]  # config: 0=NF, 1=F
flow_from_directory(classes=["fracture", "non_fracture"])  # training: 0=F, 1=NF`,
    after: `# FIXED — single source of truth
CLASS_NAMES = ["non_fracture", "fracture"]  # config.py
flow_from_directory(classes=CLASS_NAMES)     # preprocessing.py uses same list`,
  },
  {
    id: 2,
    severity: 'high',
    title: 'Training/Inference Preprocessing Mismatch',
    icon: ScanLine,
    file: 'src/preprocessing.py',
    problem: `The preprocess_image() function (used for inference) applied:
  1. Resize to 180x180
  2. Gaussian blur (3x3)
  3. Normalize to [0, 1]

But get_data_generators() (used for training) only applied rescale=1/255 via
ImageDataGenerator — no Gaussian blur, no custom resize interpolation.

The model never saw Gaussian-blurred images during training, but every inference
image was blurred. This distribution shift degraded accuracy and made predictions
unreliable.`,
    fix: `Both paths now apply identical preprocessing:
  - Training: ImageDataGenerator with preprocessing_function that applies Gaussian blur
  - Inference: preprocess_image() with apply_blur=True (same blur kernel)

Image size standardized to 224x224 for transfer learning compatibility.`,
    before: `# BROKEN — training and inference differed
# Training: only rescale
ImageDataGenerator(rescale=1.0/255.0)

# Inference: blur + resize + normalize
cv2.GaussianBlur(img, (3,3), 0)  # model never saw this!`,
    after: `# FIXED — both apply the same blur
# Training
ImageDataGenerator(rescale=1.0/255.0, preprocessing_function=_train_preprocess_fn)
# where _train_preprocess_fn applies cv2.GaussianBlur

# Inference
preprocess_image(path, apply_blur=True)  # same GaussianBlur(3,3)`,
  },
  {
    id: 3,
    severity: 'medium',
    title: 'ViT and Swin Models Saved to Wrong Directory',
    icon: GitBranch,
    file: 'src/train.py',
    problem: `train.py saved the ViT and Swin models to EVAL_RESULTS_DIR instead of
the configured VIT_MODEL_PATH and SWIN_MODEL_PATH.

This meant evaluate.py and app.py could not find them at the expected paths,
leading to missing model results or fallback to the wrong model.`,
    fix: `Each model now saves to its configured path in MODELS_DIR:
  - Custom CNN → models/custom_cnn_fracture_model.keras
  - ViT → models/vit_best.keras
  - Swin → models/swin_best.keras
  - ResNet-50 → models/resnet50_best.keras

evaluate.py loads from the same MODEL_PATHS dictionary.`,
    before: `# BROKEN — saved to wrong directory
("VIT", build_vit_model(), os.path.join(EVAL_RESULTS_DIR, "vit_model.keras"))`,
    after: `# FIXED — uses configured path
("VIT", build_vit_model(), VIT_MODEL_PATH)  # models/vit_best.keras`,
  },
  {
    id: 4,
    severity: 'medium',
    title: 'Fixed Threshold with No Calibration',
    icon: BarChart3,
    file: 'src/config.py, src/evaluate.py, src/predict.py',
    problem: `A hard-coded 0.50 threshold was used for all models. Different models
produce different probability distributions — a threshold of 0.5 may produce
too many false positives for one model and too many false negatives for another.

The original code never checked whether 0.5 was optimal.`,
    fix: `After training, an optimal threshold is found by sweeping 0.1–0.9 on
VALIDATION DATA ONLY (never test), maximizing F1 score. The threshold is
saved per-model as a JSON file and loaded by both evaluate.py and predict.py.`,
    before: `# BROKEN — hard-coded everywhere
CLASSIFICATION_THRESHOLD = 0.50  # used for all models, no validation`,
    after: `# FIXED — calibrated on validation data
def find_best_threshold(y_true, y_probs):
    # Sweep 0.1-0.9, return threshold with max F1
    ...
save_threshold(model_key, best_t)  # saved per model`,
  },
];

export default function DiagnosisPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-12">
        <span className="mb-2 inline-block rounded-full bg-rose-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-rose-400">
          Root Cause Analysis
        </span>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Bug Diagnosis & Fixes</h1>
        <p className="mt-4 max-w-2xl text-slate-400">
          The prediction inversions were caused by four bugs in the original codebase.
          Each was identified by inspecting the complete training and inference pipeline
          before making any changes.
        </p>
      </div>

      {/* Summary callout */}
      <Callout variant="error" title="Primary Symptom">
        Non-fracture X-rays were predicted as FRACTURE, and fracture X-rays were sometimes
        predicted as NON-FRACTURE. The root cause was a reversed class label mapping between
        the config file and the data loading code.
      </Callout>

      {/* Bug details */}
      <div className="mt-10 space-y-8">
        {bugs.map((bug, index) => (
          <div key={bug.id} className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 sm:p-8">
            {/* Bug header */}
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/15">
                <span className="text-sm font-bold text-rose-400">{bug.id}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold text-slate-100">{bug.title}</h2>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${
                    bug.severity === 'critical'
                      ? 'bg-rose-500/20 text-rose-300'
                      : bug.severity === 'high'
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-sky-500/20 text-sky-300'
                  }`}>
                    {bug.severity}
                  </span>
                </div>
                <p className="mt-1 font-mono text-xs text-slate-500">{bug.file}</p>
              </div>
            </div>

            {/* Problem */}
            <div className="mt-6">
              <div className="flex items-center gap-2 text-rose-400">
                <XCircle className="h-4 w-4" />
                <span className="text-sm font-semibold uppercase tracking-wider">Problem</span>
              </div>
              <p className="mt-2 whitespace-pre-line text-sm text-slate-300">{bug.problem}</p>
            </div>

            {/* Before code */}
            <div className="mt-4 overflow-hidden rounded-lg border border-rose-500/20 bg-rose-500/5">
              <div className="border-b border-rose-500/20 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-rose-400">
                Before (Broken)
              </div>
              <pre className="code-block overflow-x-auto p-4 text-slate-300"><code>{bug.before}</code></pre>
            </div>

            {/* Fix */}
            <div className="mt-6">
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm font-semibold uppercase tracking-wider">Fix</span>
              </div>
              <p className="mt-2 whitespace-pre-line text-sm text-slate-300">{bug.fix}</p>
            </div>

            {/* After code */}
            <div className="mt-4 overflow-hidden rounded-lg border border-emerald-500/20 bg-emerald-500/5">
              <div className="border-b border-emerald-500/20 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
                After (Fixed)
              </div>
              <pre className="code-block overflow-x-auto p-4 text-slate-300"><code>{bug.after}</code></pre>
            </div>

            {/* Navigation between bugs */}
            {index < bugs.length - 1 && (
              <div className="mt-6 flex items-center gap-2 text-xs text-slate-600">
                <ArrowRight className="h-3 w-3" />
                <span>Next bug</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Bottom callout */}
      <div className="mt-10">
        <Callout variant="success" title="Verification Checklist">
          After applying these fixes, verify that: (1) training class indices match config,
          (2) inference preprocessing matches training, (3) all models load from correct paths,
          (4) thresholds are calibrated on validation data, (5) test data is never augmented,
          and (6) the confusion matrix shows correct TN/FP/FN/TP alignment.
        </Callout>
      </div>
    </div>
  );
}
