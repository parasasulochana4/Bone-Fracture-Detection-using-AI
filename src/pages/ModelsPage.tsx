import { Brain, Layers, GitBranch, Zap, Network } from 'lucide-react';
import SectionHeading from '@/components/SectionHeading';

const models = [
  {
    name: 'Custom CNN',
    key: 'CUSTOM_CNN',
    icon: Brain,
    color: 'sky',
    badge: '91.0%',
    description: '5 convolutional blocks (32-32-64-128-256-256) with Batch Normalization, Max Pooling, GAP, Dense(512)+Dense(256)+Dropout(0.3), and sigmoid output. Deeper architecture with double conv in block 1 for better feature extraction.',
    details: [
      'Input: 224x224x3 RGB X-ray',
      '5 Conv blocks with 3x3 kernels + ReLU',
      'Double conv in block 1 (32 filters)',
      'Batch Normalization after each conv',
      'GAP + Dense(512) + BN + Dropout(0.3) + Dense(256) + Dropout',
      'Sigmoid output: P(fracture)',
    ],
    path: 'models/custom_cnn_fracture_model.keras',
  },
  {
    name: 'Vision Transformer (ViT)',
    key: 'VIT',
    icon: Layers,
    color: 'amber',
    badge: '88.0%',
    description: 'Patch embedding via 16x16 strided convolution, followed by 2 Transformer encoder blocks with 4-head self-attention, residual connections, and Layer Normalization.',
    details: [
      'Patch embedding: Conv2D(64, kernel=16, stride=16)',
      '2x Transformer blocks with 4-head attention',
      'Residual connections + LayerNorm',
      'Feed-forward: Dense(128, GELU) -> Dense(64)',
      'GlobalAveragePooling1D -> Dense(128) + Dropout(0.4)',
      'Sigmoid output: P(fracture)',
    ],
    path: 'models/vit_best.keras',
  },
  {
    name: 'Swin Transformer',
    key: 'SWIN',
    icon: GitBranch,
    color: 'emerald',
    badge: '89.0%',
    description: 'Hierarchical feature extraction with 4x4 and 7x7 convolutions, followed by 2 window-based multi-head self-attention blocks with 4 heads and residual connections.',
    details: [
      'Conv2D(64, kernel=4, stride=4) + BN + ReLU',
      'Conv2D(128, kernel=7) + BN + ReLU',
      '2x Multi-Head Attention: 4 heads, key_dim=32',
      'Residual connection + LayerNorm',
      'GlobalAveragePooling1D -> Dense(128) + Dropout(0.4)',
      'Sigmoid output: P(fracture)',
    ],
    path: 'models/swin_best.keras',
  },
  {
    name: 'ResNet-50 (Transfer + Fine-tune)',
    key: 'RESNET50',
    icon: Zap,
    color: 'rose',
    badge: '94.0%',
    description: 'Pre-trained ImageNet ResNet-50 with 2-phase training: frozen base training followed by fine-tuning the top 10 layers. Dense(512)+Dense(256)+Dropout classification head.',
    details: [
      'Base: ResNet-50 with ImageNet weights',
      'Phase 1: Frozen base, train top layers (30 epochs)',
      'Phase 2: Unfreeze top 10 layers, fine-tune (15 epochs)',
      'Dense(512, ReLU) + BN + Dropout(0.3) + Dense(256) + Dropout',
      'Sigmoid output: P(fracture)',
      '2-phase training with class weights + CLAHE preprocessing',
    ],
    path: 'models/resnet50_best.keras',
  },
  {
    name: 'DenseNet-121 (Transfer + Fine-tune)',
    key: 'DENSENET121',
    icon: Network,
    color: 'sky',
    badge: '95.5% Best',
    description: 'Pre-trained ImageNet DenseNet-121 with dense connections that excel at medical imaging. 2-phase training: frozen base + fine-tuning top 20 layers. Best performing model.',
    details: [
      'Base: DenseNet-121 with ImageNet weights',
      'Dense connections preserve feature reuse — ideal for X-rays',
      'Phase 1: Frozen base, train top layers (30 epochs)',
      'Phase 2: Unfreeze top 20 layers, fine-tune (15 epochs)',
      'Dense(512, ReLU) + BN + Dropout(0.3) + Dense(256) + Dropout',
      'CLAHE + class weights + threshold optimization',
    ],
    path: 'models/densenet121_best.keras',
  },
];

export default function ModelsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="Architecture"
        title="Model Architectures"
        description="Five deep learning models are trained and evaluated on the same dataset, split, and methodology. DenseNet-121 with fine-tuning achieves 95.5% test accuracy — the best performing model. All use CLAHE preprocessing and the same class mapping."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {models.map((model) => (
          <div
            key={model.key}
            className={`group rounded-2xl border p-6 transition-all hover:border-slate-700 ${
              model.badge.includes('Best')
                ? 'border-sky-500/40 bg-sky-500/5'
                : 'border-slate-800 bg-slate-900/40'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-${model.color}-500/15`}>
                  <model.icon className={`h-6 w-6 text-${model.color}-400`} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-100">{model.name}</h3>
                  <p className="font-mono text-xs text-slate-500">{model.key}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-2xl font-bold tabular-nums ${
                  model.badge.includes('Best') ? 'text-sky-300' : 'text-slate-300'
                }`}>{model.badge}</p>
                <p className="text-xs text-slate-500">Test Accuracy</p>
              </div>
            </div>

            {/* Description */}
            <p className="mt-4 text-sm text-slate-400">{model.description}</p>

            {/* Architecture details */}
            <div className="mt-5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Architecture Details
              </p>
              <ul className="space-y-1.5">
                {model.details.map((detail, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                    <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-${model.color}-500`} />
                    {detail}
                  </li>
                ))}
              </ul>
            </div>

            {/* Save path */}
            <div className="mt-5 rounded-lg border border-slate-800 bg-slate-950/60 px-4 py-3">
              <p className="text-xs text-slate-500">Model save path</p>
              <p className="mt-1 font-mono text-xs text-slate-300">{model.path}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Training config */}
      <div className="mt-12">
        <SectionHeading title="Training Configuration" />
        <div className="overflow-hidden rounded-xl border border-slate-800">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-800">
              {[
                ['Image Size', '224 x 224 x 3'],
                ['Batch Size', '32'],
                ['Phase 1 Epochs', '30 (frozen base for transfer models)'],
                ['Phase 2 Epochs', '15 (fine-tuning for transfer models)'],
                ['Learning Rate', '1e-4 (Phase 1), 1e-5 (Phase 2 fine-tune)'],
                ['Optimizer', 'Adam'],
                ['Loss Function', 'Binary Cross-Entropy'],
                ['Class Weights', 'Auto-computed from dataset distribution'],
                ['Preprocessing', 'CLAHE + Gaussian blur + resize + normalize'],
                ['Early Stopping', 'patience=7 (Phase 1), patience=5 (Phase 2)'],
                ['LR Scheduler', 'ReduceLROnPlateau (factor=0.5, patience=3)'],
                ['Augmentation', 'Train only (rotation 20, shift 0.15, zoom 0.15, flip)'],
                ['Validation/Test', 'No augmentation — CLAHE + blur + rescale only'],
                ['Threshold', 'Optimized on validation data (max F1)'],
              ].map(([key, val]) => (
                <tr key={key} className="hover:bg-slate-900/40">
                  <td className="px-6 py-3 font-medium text-slate-300">{key}</td>
                  <td className="px-6 py-3 font-mono text-slate-400">{val}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Key improvements */}
      <div className="mt-12 rounded-2xl border border-sky-500/30 bg-sky-500/5 p-6">
        <h3 className="mb-4 font-semibold text-slate-100">Key Improvements for 94-96% Accuracy</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { title: 'CLAHE Preprocessing', desc: 'Contrast Limited Adaptive Histogram Equalization enhances fracture lines and bone edges critical for X-ray analysis' },
            { title: 'DenseNet-121 Architecture', desc: 'Dense connections with feature reuse excel at medical imaging — achieves 95.5% test accuracy' },
            { title: '2-Phase Training', desc: 'Phase 1: frozen base training (30 epochs). Phase 2: fine-tune top layers with lower LR (15 epochs)' },
            { title: 'Class Weight Balancing', desc: 'Auto-computed class weights handle dataset imbalance without data duplication' },
            { title: 'Deeper Custom CNN', desc: '5 conv blocks with double conv in block 1 + Dense(512)+Dense(256) for richer features' },
            { title: 'Threshold Optimization', desc: 'Per-model threshold found on validation data only, maximizing F1 score' },
          ].map((item) => (
            <div key={item.title} className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
              <p className="text-sm font-semibold text-sky-300">{item.title}</p>
              <p className="mt-1 text-xs text-slate-400">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
