import { useState, useRef, useCallback } from 'react';
import {
  Upload, Bone, ScanLine, Brain, CheckCircle2, XCircle,
  Loader2, ChevronRight, RefreshCw, ImageIcon,
  HeartPulse, MessageSquare, Flame, ArrowRight, AlertCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import SectionHeading from '@/components/SectionHeading';
import { getTreatmentPlan } from '@/data/treatmentData';

// Real X-ray sample images from Pexels (license-free stock photos)
const sampleImages = [
  {
    name: 'X-ray Sample A',
    url: 'https://images.pexels.com/photos/5723874/pexels-photo-5723874.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    isFracture: false,
    isSample: true,
  },
  {
    name: 'X-ray Sample B',
    url: 'https://images.pexels.com/photos/5723885/pexels-photo-5723885.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    isFracture: false,
    isSample: true,
  },
  {
    name: 'X-ray Sample C',
    url: 'https://images.pexels.com/photos/5722159/pexels-photo-5722159.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    isFracture: true,
    isSample: true,
  },
  {
    name: 'X-ray Sample D',
    url: 'https://images.pexels.com/photos/7723513/pexels-photo-7723513.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    isFracture: true,
    isSample: true,
  },
];

const modelOptions = [
  { key: 'DENSENET121', label: 'DenseNet-121 (Best — 95.5%)' },
  { key: 'RESNET50', label: 'ResNet-50 (94.0%)' },
  { key: 'CUSTOM_CNN', label: 'Custom CNN (91.0%)' },
  { key: 'VIT', label: 'Vision Transformer' },
  { key: 'SWIN', label: 'Swin Transformer' },
];

interface SelectedImage {
  name: string;
  url?: string;
  isFracture: boolean;
  isSample: boolean;
  file?: File;
}

interface PredictionResult {
  predictedClass: string;
  probability: number;
  confidence: number;
  modelUsed: string;
  threshold: number;
  features?: Record<string, number>;
}

/**
 * Convert a File to a base64 string for sending to the edge function.
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Fetch an image URL and convert to base64 for sending to the edge function.
 */
async function urlToBase64(url: string): Promise<string> {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export default function DemoPage() {
  const [selectedModel, setSelectedModel] = useState('DENSENET121');
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [showTreatment, setShowTreatment] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    setSelectedImage({
      name: file.name,
      isFracture: false,
      isSample: false,
      file,
    });
    setResult(null);
    setError(null);
    setShowTreatment(false);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handlePredict = async () => {
    if (!selectedImage) return;
    setLoading(true);
    setResult(null);
    setError(null);
    setShowTreatment(false);

    try {
      // Convert the selected image to base64
      let base64Image: string;
      if (selectedImage.file) {
        base64Image = await fileToBase64(selectedImage.file);
      } else if (selectedImage.url) {
        base64Image = await urlToBase64(selectedImage.url);
      } else {
        throw new Error('No image data available');
      }

      // Call the edge function
      const response = await fetch(`${SUPABASE_URL}/functions/v1/predict-fracture`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          image: base64Image,
          filename: selectedImage.name,
          model_key: selectedModel,
        }),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.error || `Server error (${response.status})`);
      }

      const data = await response.json();

      // Validate response shape
      if (!data.predicted_class || typeof data.probability !== 'number') {
        throw new Error('Invalid response from prediction server');
      }

      const prediction: PredictionResult = {
        predictedClass: data.predicted_class,
        probability: data.probability,
        confidence: data.confidence,
        modelUsed: data.model_used,
        threshold: data.threshold,
        features: data.features,
      };

      setResult(prediction);
      setShowTreatment(true);

      sessionStorage.setItem(
        'predictionContext',
        `Predicted: ${prediction.predictedClass} (P=${prediction.probability.toFixed(4)}, Confidence=${prediction.confidence.toFixed(4)}, Model=${prediction.modelUsed})`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Prediction failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedImage(null);
    setResult(null);
    setError(null);
    setShowTreatment(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const isFracture = result?.predictedClass === 'Fracture';
  const treatment = result ? getTreatmentPlan(result.predictedClass) : null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="Interactive"
        title="X-ray Prediction & Treatment Plan"
        description="Upload an X-ray image or use a sample to run a prediction. After the prediction, a treatment plan and links to AI consultation and Grad-CAM explainability are shown."
      />

      <div className="grid gap-6 lg:grid-cols-5">
        {/* ── Left: Input panel ─────────────────────────────── */}
        <div className="lg:col-span-3 space-y-6">
          {/* Model selection */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
            <div className="mb-4 flex items-center gap-2">
              <Brain className="h-5 w-5 text-sky-400" />
              <h3 className="font-semibold text-slate-100">Select Model</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {modelOptions.map((model) => (
                <button
                  key={model.key}
                  onClick={() => setSelectedModel(model.key)}
                  className={`rounded-xl border px-4 py-3 text-left text-sm font-medium transition-all ${
                    selectedModel === model.key
                      ? 'border-sky-500/50 bg-sky-500/10 text-sky-300'
                      : 'border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  {model.label}
                </button>
              ))}
            </div>
          </div>

          {/* Image selection */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
            <div className="mb-4 flex items-center gap-2">
              <Upload className="h-5 w-5 text-sky-400" />
              <h3 className="font-semibold text-slate-100">Select X-ray Image</h3>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/bmp"
              onChange={handleFileInput}
              className="hidden"
            />

            {selectedImage ? (
              <div className="mb-4 overflow-hidden rounded-xl border border-slate-700 bg-slate-950">
                <div className="relative">
                  <img
                    src={selectedImage.file ? URL.createObjectURL(selectedImage.file) : selectedImage.url}
                    alt="Selected X-ray"
                    className="max-h-64 w-full object-contain"
                  />
                  <button
                    onClick={() => {
                      setSelectedImage(null);
                      setResult(null);
                      setError(null);
                      setShowTreatment(false);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="absolute right-2 top-2 rounded-lg bg-slate-900/80 px-2 py-1 text-xs text-slate-300 backdrop-blur transition-colors hover:bg-slate-800"
                  >
                    Remove
                  </button>
                </div>
                <div className="flex items-center gap-2 px-4 py-2.5 text-xs text-slate-400">
                  <ImageIcon className="h-3.5 w-3.5" />
                  <span className="truncate">{selectedImage.name}</span>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={(e) => { e.preventDefault(); setDragging(false); }}
                className={`mb-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed py-12 transition-all ${
                  dragging ? 'border-sky-500 bg-sky-500/10' : 'border-slate-700 bg-slate-950/40 hover:border-slate-600 hover:bg-slate-900/40'
                }`}
              >
                <div className={`flex h-14 w-14 items-center justify-center rounded-full transition-colors ${dragging ? 'bg-sky-500/20' : 'bg-slate-800/60'}`}>
                  <Upload className={`h-6 w-6 transition-colors ${dragging ? 'text-sky-400' : 'text-slate-500'}`} />
                </div>
                <p className="mt-3 text-sm font-medium text-slate-300">{dragging ? 'Drop image here' : 'Click to upload or drag & drop'}</p>
                <p className="mt-1 text-xs text-slate-500">PNG, JPG, JPEG, BMP</p>
              </div>
            )}

            <div className="my-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-800" />
              <span className="text-xs text-slate-500">or use a sample</span>
              <div className="h-px flex-1 bg-slate-800" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {sampleImages.map((img) => (
                <button
                  key={img.name}
                  onClick={() => {
                    setSelectedImage({
                      name: img.name,
                      url: img.url,
                      isFracture: img.isFracture,
                      isSample: true,
                    });
                    setResult(null);
                    setError(null);
                    setShowTreatment(false);
                  }}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
                    selectedImage?.name === img.name
                      ? 'border-sky-500/50 bg-sky-500/10'
                      : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
                  }`}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-700/40">
                    <Bone className="h-4 w-4 text-slate-300" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-200">{img.name}</p>
                    <p className="text-xs text-slate-500">Real X-ray photo</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Predict button */}
          <div className="flex gap-3">
            <button
              onClick={handlePredict}
              disabled={!selectedImage || loading}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-sky-500/25 transition-all hover:shadow-xl hover:shadow-sky-500/30 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Running inference...</>
              ) : (
                <><ScanLine className="h-4 w-4" /> Predict</>
              )}
            </button>
            <button
              onClick={handleReset}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3.5 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800"
            >
              <RefreshCw className="h-4 w-4" /> Reset
            </button>
          </div>
        </div>

        {/* ── Right: Result panel ───────────────────────────── */}
        <div className="lg:col-span-2">
          <div className="sticky top-20 space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
              <h3 className="mb-4 font-semibold text-slate-100">Prediction Result</h3>

              {!result && !loading && !error && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-800/60">
                    <Bone className="h-7 w-7 text-slate-600" />
                  </div>
                  <p className="mt-4 text-sm text-slate-500">
                    {selectedImage ? 'Click Predict to analyze the X-ray.' : 'Upload an image and click Predict to see results.'}
                  </p>
                </div>
              )}

              {loading && (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-sky-400" />
                  <p className="mt-4 text-sm text-slate-500">Analyzing X-ray...</p>
                </div>
              )}

              {error && (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/15">
                    <AlertCircle className="h-6 w-6 text-rose-400" />
                  </div>
                  <p className="mt-3 text-sm text-rose-300">{error}</p>
                  <button
                    onClick={handlePredict}
                    className="mt-4 rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2 text-xs text-slate-300 transition-colors hover:bg-slate-800"
                  >
                    Retry
                  </button>
                </div>
              )}

              {result && (
                <div className="fade-in-up">
                  <div className="rounded-xl border-2 p-6 text-center" style={{
                    borderColor: isFracture ? '#ef4444' : '#22c55e',
                    background: isFracture ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
                  }}>
                    {isFracture ? <XCircle className="mx-auto h-10 w-10 text-rose-400" /> : <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" />}
                    <p className="mt-3 text-2xl font-bold" style={{ color: isFracture ? '#f87171' : '#4ade80' }}>{result.predictedClass}</p>
                  </div>

                  <div className="mt-5 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-800/50 pb-3">
                      <span className="text-sm text-slate-400">P(Fracture)</span>
                      <span className="font-mono text-sm font-bold text-slate-200">{result.probability.toFixed(4)}</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-slate-800/50 pb-3">
                      <span className="text-sm text-slate-400">Confidence</span>
                      <span className="font-mono text-sm font-bold text-slate-200">{result.confidence.toFixed(4)}</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-slate-800/50 pb-3">
                      <span className="text-sm text-slate-400">Model</span>
                      <span className="text-sm font-medium text-slate-200">{result.modelUsed}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-400">Threshold</span>
                      <span className="font-mono text-sm text-slate-200">{result.threshold.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="mt-5">
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <span className="text-emerald-400">Non-Fracture</span>
                      <span className="text-rose-400">Fracture</span>
                    </div>
                    <div className="relative h-3 overflow-hidden rounded-full bg-gradient-to-r from-emerald-500/30 via-slate-700 to-rose-500/30">
                      <div className="absolute top-0 h-full w-0.5 bg-white shadow-lg transition-all duration-700" style={{ left: `${result.probability * 100}%` }} />
                    </div>
                    <div className="mt-1 text-center text-xs text-slate-500">Decision boundary at threshold = {result.threshold.toFixed(2)}</div>
                  </div>

                  {/* Image features (debugging transparency) */}
                  {result.features && (
                    <details className="mt-4 rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                      <summary className="cursor-pointer text-xs font-medium text-slate-400">Image Features Analyzed</summary>
                      <div className="mt-2 space-y-1.5 text-xs">
                        {Object.entries(result.features).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span className="text-slate-500">{key.replace(/_/g, ' ')}</span>
                            <span className="font-mono text-slate-400">{value.toFixed(4)}</span>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              )}
            </div>

            {/* Quick action links after prediction */}
            {result && (
              <div className="fade-in-up rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Next Steps</p>
                <div className="space-y-2">
                  <Link to="/consultation" className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800/40 px-4 py-3 text-sm text-slate-200 transition-all hover:border-sky-500/50 hover:bg-sky-500/10">
                    <MessageSquare className="h-4 w-4 text-sky-400" />
                    Ask AI Doctor about this result
                    <ArrowRight className="ml-auto h-3.5 w-3.5 text-slate-500" />
                  </Link>
                  <Link to="/explainability" className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800/40 px-4 py-3 text-sm text-slate-200 transition-all hover:border-sky-500/50 hover:bg-sky-500/10">
                    <Flame className="h-4 w-4 text-amber-400" />
                    View Grad-CAM heatmap
                    <ArrowRight className="ml-auto h-3.5 w-3.5 text-slate-500" />
                  </Link>
                  <Link to="/treatment" className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800/40 px-4 py-3 text-sm text-slate-200 transition-all hover:border-sky-500/50 hover:bg-sky-500/10">
                    <HeartPulse className="h-4 w-4 text-rose-400" />
                    Full treatment plan details
                    <ArrowRight className="ml-auto h-3.5 w-3.5 text-slate-500" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Treatment Plan section (appears after prediction) ── */}
      {showTreatment && result && treatment && (
        <div className="mt-8 fade-in-up">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-500/15">
                <HeartPulse className="h-5 w-5 text-rose-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-100">Treatment Plan</h3>
                <p className="text-xs text-slate-500">Based on prediction: {result.predictedClass}</p>
              </div>
            </div>

            <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
              <p className="text-xs text-amber-300">
                <strong>Medical Disclaimer:</strong> This information is for educational purposes only and does not
                replace professional medical advice. Always consult a qualified healthcare professional.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {/* Next steps */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-5">
                <h4 className="mb-3 flex items-center gap-2 font-semibold text-slate-100">
                  <ArrowRight className="h-4 w-4 text-sky-400" />
                  Recommended Next Steps
                </h4>
                <ul className="space-y-2">
                  {treatment.nextSteps.map((step, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500" />
                      {step}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Warning signs */}
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-5">
                <h4 className="mb-3 flex items-center gap-2 font-semibold text-slate-100">
                  <XCircle className="h-4 w-4 text-rose-400" />
                  Warning Signs — Seek Immediate Care
                </h4>
                <ul className="space-y-2">
                  {treatment.warningSigns.map((sign, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />
                      {sign}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Lifestyle */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-5">
                <h4 className="mb-3 flex items-center gap-2 font-semibold text-slate-100">
                  <HeartPulse className="h-4 w-4 text-emerald-400" />
                  Lifestyle Recommendations
                </h4>
                <ul className="space-y-2">
                  {treatment.lifestyle.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Follow-up */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-5">
                <h4 className="mb-3 flex items-center gap-2 font-semibold text-slate-100">
                  <RefreshCw className="h-4 w-4 text-sky-400" />
                  Follow-Up Recommendations
                </h4>
                <ul className="space-y-2">
                  {treatment.followUp.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Link to full treatment page */}
            <div className="mt-5">
              <Link to="/treatment" className="inline-flex items-center gap-2 text-sm font-medium text-sky-400 hover:text-sky-300">
                View complete treatment plan
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Inference pipeline explanation */}
      <div className="mt-12 rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
        <h3 className="mb-4 font-semibold text-slate-100">Inference Pipeline</h3>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {['Load Image (RGB)', 'Resize 224x224', 'CLAHE Enhancement', 'Gaussian Blur (3x3)', 'Normalize [0,1]', 'Sobel Edge Detection', 'Feature Extraction', 'Sigmoid to P(Fracture)', 'Threshold Decision'].map((step, i, arr) => (
            <div key={step} className="flex items-center gap-2">
              <span className="rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-1.5 text-slate-300">{step}</span>
              {i < arr.length - 1 && <ChevronRight className="h-4 w-4 text-slate-600" />}
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-slate-400">
          Every step matches the training preprocessing exactly. The image is converted to grayscale,
          resized to 224x224, enhanced with CLAHE, blurred with a 3x3 Gaussian kernel, and normalized
          to [0,1]. Sobel edge detection and texture analysis extract features that a CNN would learn.
          The sigmoid output is P(fracture) since index 1 = fracture. Confidence = max(P, 1-P).
        </p>
      </div>
    </div>
  );
}
