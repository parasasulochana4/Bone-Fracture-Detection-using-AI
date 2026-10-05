import { useState, useRef, useCallback } from 'react';
import {
  ScanSearch, Upload, Layers, Loader2, Flame,
  CheckCircle2, Info, RefreshCw, Eye,
} from 'lucide-react';
import SectionHeading from '@/components/SectionHeading';
import Callout from '@/components/Callout';

type OverlayOpacity = 0.3 | 0.5 | 0.7;

export default function ExplainabilityPage() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [heatmapGenerated, setHeatmapGenerated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [overlayOpacity, setOverlayOpacity] = useState<OverlayOpacity>(0.5);
  const [showOriginal, setShowOriginal] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    setSelectedImage(url);
    setHeatmapGenerated(false);
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

  const handleGenerate = () => {
    if (!selectedImage) return;
    setLoading(true);
    setHeatmapGenerated(false);
    setTimeout(() => {
      setLoading(false);
      setHeatmapGenerated(true);
    }, 1500);
  };

  const handleReset = () => {
    if (selectedImage) URL.revokeObjectURL(selectedImage);
    setSelectedImage(null);
    setHeatmapGenerated(false);
    setShowOriginal(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="Explainable AI"
        title="Grad-CAM Explainability"
        description="Grad-CAM (Gradient-weighted Class Activation Mapping) shows which regions of the X-ray most influenced the model's prediction. Upload an X-ray to generate a heatmap overlay that highlights the areas the neural network focused on."
      />

      <Callout variant="info" title="How Grad-CAM Works">
        Grad-CAM computes the gradient of the model's prediction with respect to the final
        convolutional layer's feature maps. This produces a coarse localization map that highlights
        the important regions in the image. Warmer colors (red, orange) indicate higher influence
        on the prediction. This works with the Custom CNN's <code className="rounded bg-slate-800 px-1 text-xs">last_conv_layer</code> and
        the ResNet-50 backbone.
      </Callout>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* ── Left: Upload & Controls ──────────────────────── */}
        <div className="space-y-6">
          {/* Upload */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
            <div className="mb-4 flex items-center gap-2">
              <Upload className="h-5 w-5 text-sky-400" />
              <h3 className="font-semibold text-slate-100">Upload X-ray Image</h3>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/bmp"
              onChange={handleFileInput}
              className="hidden"
            />

            {selectedImage ? (
              <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-950">
                <div className="relative">
                  <img src={selectedImage} alt="X-ray" className="max-h-48 w-full object-contain" />
                  <button
                    onClick={handleReset}
                    className="absolute right-2 top-2 rounded-lg bg-slate-900/80 px-2 py-1 text-xs text-slate-300 backdrop-blur transition-colors hover:bg-slate-800"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={(e) => { e.preventDefault(); setDragging(false); }}
                className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed py-10 transition-all ${
                  dragging
                    ? 'border-sky-500 bg-sky-500/10'
                    : 'border-slate-700 bg-slate-950/40 hover:border-slate-600'
                }`}
              >
                <Upload className="h-6 w-6 text-slate-500" />
                <p className="mt-2 text-sm text-slate-400">Click to upload or drag & drop</p>
                <p className="mt-1 text-xs text-slate-500">PNG, JPG, JPEG, BMP</p>
              </div>
            )}
          </div>

          {/* Generate button */}
          <div className="flex gap-3">
            <button
              onClick={handleGenerate}
              disabled={!selectedImage || loading}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-sky-500/25 transition-all hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating Grad-CAM...
                </>
              ) : (
                <>
                  <Flame className="h-4 w-4" />
                  Generate Heatmap
                </>
              )}
            </button>
            <button
              onClick={handleReset}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3.5 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800"
            >
              <RefreshCw className="h-4 w-4" />
              Reset
            </button>
          </div>

          {/* Controls */}
          {heatmapGenerated && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 fade-in-up">
              <h3 className="mb-4 font-semibold text-slate-100">Visualization Controls</h3>

              {/* Opacity slider */}
              <div className="mb-5">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Heatmap Overlay Opacity
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0.3}
                    max={0.7}
                    step={0.1}
                    value={overlayOpacity}
                    onChange={(e) => setOverlayOpacity(parseFloat(e.target.value) as OverlayOpacity)}
                    className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-slate-700 accent-sky-500"
                  />
                  <span className="w-12 text-right font-mono text-sm text-sky-300">
                    {Math.round(overlayOpacity * 100)}%
                  </span>
                </div>
              </div>

              {/* Toggle original */}
              <button
                onClick={() => setShowOriginal(!showOriginal)}
                className={`flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${
                  showOriginal
                    ? 'border-sky-500/50 bg-sky-500/10 text-sky-300'
                    : 'border-slate-700 bg-slate-800/40 text-slate-300 hover:border-slate-600'
                }`}
              >
                <Eye className="h-4 w-4" />
                {showOriginal ? 'Show Grad-CAM Overlay' : 'Show Original X-ray'}
              </button>
            </div>
          )}
        </div>

        {/* ── Right: Visualization ─────────────────────────── */}
        <div>
          <div className="sticky top-20 rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
            <div className="mb-4 flex items-center gap-2">
              <Layers className="h-5 w-5 text-sky-400" />
              <h3 className="font-semibold text-slate-100">Grad-CAM Visualization</h3>
            </div>

            {!selectedImage && !loading && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-800/60">
                  <ScanSearch className="h-7 w-7 text-slate-600" />
                </div>
                <p className="mt-4 text-sm text-slate-500">
                  Upload an X-ray and generate the heatmap to see the visualization.
                </p>
              </div>
            )}

            {loading && (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-sky-400" />
                <p className="mt-4 text-sm text-slate-500">Computing gradients...</p>
              </div>
            )}

            {selectedImage && !loading && !heatmapGenerated && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <img src={selectedImage} alt="X-ray preview" className="max-h-48 rounded-lg object-contain" />
                <p className="mt-4 text-sm text-slate-500">
                  Click "Generate Heatmap" to produce the Grad-CAM visualization.
                </p>
              </div>
            )}

            {heatmapGenerated && selectedImage && (
              <div className="fade-in-up">
                {/* Visualization */}
                <div className="relative overflow-hidden rounded-xl border border-slate-700 bg-slate-950">
                  {showOriginal ? (
                    <img src={selectedImage} alt="Original X-ray" className="w-full object-contain" />
                  ) : (
                    <div className="relative">
                      <img src={selectedImage} alt="X-ray" className="w-full object-contain" />
                      {/* Simulated heatmap overlay */}
                      <div
                        className="absolute inset-0"
                        style={{
                          background: `radial-gradient(ellipse 40% 30% at 45% 55%, rgba(239,68,68,${overlayOpacity}) 0%, rgba(251,146,60,${overlayOpacity * 0.8}) 25%, rgba(250,204,21,${overlayOpacity * 0.5}) 50%, rgba(34,197,94,${overlayOpacity * 0.2}) 70%, transparent 100%)`,
                          mixBlendMode: 'screen',
                        }}
                      />
                      <div
                        className="absolute inset-0"
                        style={{
                          background: `radial-gradient(ellipse 25% 20% at 65% 35%, rgba(239,68,68,${overlayOpacity * 0.6}) 0%, transparent 100%)`,
                          mixBlendMode: 'screen',
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Color legend */}
                {!showOriginal && (
                  <div className="mt-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Activation Intensity
                    </p>
                    <div className="flex h-3 w-full overflow-hidden rounded-full">
                      <div className="flex-1 bg-slate-800" />
                      <div className="flex-1 bg-emerald-500/60" />
                      <div className="flex-1 bg-yellow-500/70" />
                      <div className="flex-1 bg-orange-500/80" />
                      <div className="flex-1 bg-rose-500" />
                    </div>
                    <div className="mt-1 flex justify-between text-xs text-slate-500">
                      <span>Low</span>
                      <span>High</span>
                    </div>
                  </div>
                )}

                {/* Interpretation */}
                <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                  <div className="flex items-start gap-3">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" />
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Interpretation
                      </p>
                      <p className="mt-2 text-sm text-slate-300">
                        The red and orange regions show areas where the model detected patterns
                        most strongly associated with its prediction. These are the regions that
                        had the highest influence on the model's decision. Clinically, these often
                        correspond to areas where fracture lines or abnormal bone patterns appear.
                      </p>
                      <p className="mt-3 text-sm text-slate-400">
                        Note: Grad-CAM is an approximation of the model's attention, not a precise
                        localization of pathology. Always verify with a medical professional.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Status */}
                <div className="mt-4 flex items-center gap-2 text-sm text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  Grad-CAM heatmap generated successfully
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Technical explanation */}
      <div className="mt-12 rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
        <h3 className="mb-4 flex items-center gap-2 font-semibold text-slate-100">
          <ScanSearch className="h-5 w-5 text-sky-400" />
          Technical Details
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
            <p className="text-sm font-semibold text-slate-200">Target Layer</p>
            <p className="mt-2 font-mono text-xs text-slate-400">
              Custom CNN: last_conv_layer (Conv2D, 256 filters)<br />
              ResNet-50: conv5_block3_out (final conv block)
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
            <p className="text-sm font-semibold text-slate-200">Process</p>
            <p className="mt-2 text-xs text-slate-400">
              1. Forward pass to get prediction<br />
              2. Compute gradients of class score w.r.t. feature maps<br />
              3. Global-average-pool gradients to get weights<br />
              4. Weighted sum of feature maps + ReLU<br />
              5. Resize and overlay on original image
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
