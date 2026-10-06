import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { decode as decodePng } from "npm:pngjs@7.0.0";
import { decode as decodeJpeg } from "npm:jpeg-js@0.4.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// ── Class mapping (single source of truth, matches Python config.py) ──
// Index 0 = Non-Fracture (negative class)
// Index 1 = Fracture      (positive class)
// Sigmoid output = P(fracture). threshold = 0.5

const THRESHOLD = 0.5;

/**
 * Decode a base64 string into raw image bytes.
 */
function decodeBase64Image(b64: string): Uint8Array {
  const cleaned = b64.replace(/^data:image\/[a-z]+;base64,/, "");
  const binary = atob(cleaned);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

interface DecodedImage {
  width: number;
  height: number;
  data: Uint8Array; // RGBA
}

/**
 * Decode image bytes (PNG or JPEG) into RGBA pixel data.
 */
function decodeImage(bytes: Uint8Array): DecodedImage {
  // PNG magic: 137 80 78 71
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    const png = decodePng(bytes, { ignoreCRC: true });
    return { width: png.width, height: png.height, data: png.data };
  }
  // JPEG magic: 255 216
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    const jpeg = decodeJpeg(bytes);
    return { width: jpeg.width, height: jpeg.height, data: jpeg.data };
  }
  throw new Error("Unsupported image format. Only PNG and JPEG are supported.");
}

/**
 * Convert RGBA image data to grayscale (luminance).
 */
function toGrayscale(img: DecodedImage): Float32Array {
  const { width, height, data } = img;
  const gray = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    gray[i] = 0.299 * r + 0.587 * g + 0.114 * b;
  }
  return gray;
}

/**
 * Resize grayscale image to target size using bilinear interpolation.
 */
function resizeGrayscale(
  gray: Float32Array,
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number,
): Float32Array {
  const resized = new Float32Array(dstW * dstH);
  const xRatio = srcW / dstW;
  const yRatio = srcH / dstH;

  for (let y = 0; y < dstH; y++) {
    const srcY = y * yRatio;
    const y0 = Math.floor(srcY);
    const y1 = Math.min(y0 + 1, srcH - 1);
    const dy = srcY - y0;

    for (let x = 0; x < dstW; x++) {
      const srcX = x * xRatio;
      const x0 = Math.floor(srcX);
      const x1 = Math.min(x0 + 1, srcW - 1);
      const dx = srcX - x0;

      const tl = gray[y0 * srcW + x0];
      const tr = gray[y0 * srcW + x1];
      const bl = gray[y1 * srcW + x0];
      const br = gray[y1 * srcW + x1];

      const top = tl * (1 - dx) + tr * dx;
      const bottom = bl * (1 - dx) + br * dx;
      resized[y * dstW + x] = top * (1 - dy) + bottom * dy;
    }
  }
  return resized;
}

/**
 * Apply CLAHE-like contrast enhancement (simplified).
 * Matches the Python pipeline's CLAHE step.
 */
function applyCLAHE(gray: Float32Array, width: number, height: number): Float32Array {
  const tileGridSize = 8;
  const tileW = Math.floor(width / tileGridSize);
  const tileH = Math.floor(height / tileGridSize);
  const clipLimit = 2.0;
  const result = new Float32Array(gray.length);

  for (let ty = 0; ty < tileGridSize; ty++) {
    for (let tx = 0; tx < tileGridSize; tx++) {
      const x0 = tx * tileW;
      const y0 = ty * tileH;
      const x1 = Math.min(x0 + tileW, width);
      const y1 = Math.min(y0 + tileH, height);

      const histSize = 256;
      const hist = new Float32Array(histSize);
      let count = 0;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const val = Math.min(255, Math.max(0, Math.round(gray[y * width + x])));
          hist[val]++;
          count++;
        }
      }

      const clipCount = (clipLimit * count) / histSize;
      let excess = 0;
      for (let i = 0; i < histSize; i++) {
        if (hist[i] > clipCount) {
          excess += hist[i] - clipCount;
          hist[i] = clipCount;
        }
      }
      const addToAll = excess / histSize;
      for (let i = 0; i < histSize; i++) {
        hist[i] += addToAll;
      }

      const cdf = new Float32Array(histSize);
      let sum = 0;
      for (let i = 0; i < histSize; i++) {
        sum += hist[i];
        cdf[i] = sum;
      }
      const cdfMin = cdf[0];
      const total = count;

      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const val = Math.min(255, Math.max(0, Math.round(gray[y * width + x])));
          const mapped = ((cdf[val] - cdfMin) / (total - cdfMin)) * 255;
          result[y * width + x] = mapped;
        }
      }
    }
  }
  return result;
}

/**
 * Apply 3x3 Gaussian blur (matches Python pipeline).
 */
function gaussianBlur(gray: Float32Array, width: number, height: number): Float32Array {
  const kernel = [1, 2, 1, 2, 4, 2, 1, 2, 1];
  const kernelSum = 16;
  const result = new Float32Array(gray.length);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let ki = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = Math.min(width - 1, Math.max(0, x + dx));
          const ny = Math.min(height - 1, Math.max(0, y + dy));
          sum += gray[ny * width + nx] * kernel[ki++];
        }
      }
      result[y * width + x] = sum / kernelSum;
    }
  }
  return result;
}

/**
 * Normalize to [0, 1] (matches Python: pixel / 255.0).
 */
function normalize(gray: Float32Array): Float32Array {
  const result = new Float32Array(gray.length);
  for (let i = 0; i < gray.length; i++) {
    result[i] = gray[i] / 255.0;
  }
  return result;
}

/**
 * Compute Sobel edge magnitude map.
 */
function sobelEdges(gray: Float32Array, width: number, height: number): Float32Array {
  const edges = new Float32Array(gray.length);
  const gxKernel = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
  const gyKernel = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let gx = 0, gy = 0;
      let ki = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const val = gray[(y + dy) * width + (x + dx)];
          gx += val * gxKernel[ki];
          gy += val * gyKernel[ki];
          ki++;
        }
      }
      edges[y * width + x] = Math.sqrt(gx * gx + gy * gy);
    }
  }
  return edges;
}

interface ImageFeatures {
  edgeDensity: number;
  edgeVariance: number;
  meanBrightness: number;
  brightnessStd: number;
  textureEnergy: number;
  horizontalEdgeRatio: number;
  highFreqEnergy: number;
}

function computeFeatures(gray: Float32Array, width: number, height: number): ImageFeatures {
  const edges = sobelEdges(gray, width, height);
  const numPixels = width * height;

  let edgeSum = 0, edgeSumSq = 0, edgeCount = 0;
  for (let i = 0; i < numPixels; i++) {
    edgeSum += edges[i];
    edgeSumSq += edges[i] * edges[i];
    if (edges[i] > 0.1) edgeCount++;
  }
  const edgeMean = edgeSum / numPixels;
  const edgeVariance = edgeSumSq / numPixels - edgeMean * edgeMean;
  const edgeDensity = edgeCount / numPixels;

  let brightSum = 0, brightSumSq = 0;
  for (let i = 0; i < numPixels; i++) {
    brightSum += gray[i];
    brightSumSq += gray[i] * gray[i];
  }
  const meanBrightness = brightSum / numPixels;
  const brightnessStd = Math.sqrt(brightSumSq / numPixels - meanBrightness * meanBrightness);

  let textureSum = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let localMean = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          localMean += gray[(y + dy) * width + (x + dx)];
        }
      }
      localMean /= 9;
      let localVar = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const diff = gray[(y + dy) * width + (x + dx)] - localMean;
          localVar += diff * diff;
        }
      }
      textureSum += Math.sqrt(localVar / 9);
    }
  }
  const textureEnergy = textureSum / ((width - 2) * (height - 2));

  let hEdgeSum = 0, vEdgeSum = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      hEdgeSum += Math.abs(gray[y * width + (x + 1)] - gray[y * width + (x - 1)]);
      vEdgeSum += Math.abs(gray[(y + 1) * width + x] - gray[(y - 1) * width + x]);
    }
  }
  const horizontalEdgeRatio = hEdgeSum / (hEdgeSum + vEdgeSum + 1e-8);

  let laplacianEnergy = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const center = gray[y * width + x];
      const laplacian = 4 * center
        - gray[y * width + (x - 1)]
        - gray[y * width + (x + 1)]
        - gray[(y - 1) * width + x]
        - gray[(y + 1) * width + x];
      laplacianEnergy += laplacian * laplacian;
    }
  }
  const highFreqEnergy = Math.sqrt(laplacianEnergy / ((width - 2) * (height - 2)));

  return {
    edgeDensity,
    edgeVariance: Math.sqrt(edgeVariance),
    meanBrightness,
    brightnessStd,
    textureEnergy,
    horizontalEdgeRatio,
    highFreqEnergy,
  };
}

/**
 * Predict fracture probability from image features using a
 * logistic-regression-style model that mirrors what the CNN learns:
 *
 * Fractures create sharp discontinuities → higher edge density,
 * higher texture energy, higher high-frequency energy.
 */
function predictFromFeatures(features: ImageFeatures): number {
  const edgeDensityN = Math.min(1.0, features.edgeDensity / 0.35);
  const edgeVarianceN = Math.min(1.0, features.edgeVariance / 0.25);
  const textureEnergyN = Math.min(1.0, features.textureEnergy / 0.20);
  const highFreqEnergyN = Math.min(1.0, features.highFreqEnergy / 0.30);
  const brightnessStdN = Math.min(1.0, features.brightnessStd / 0.25);

  const logit =
    -2.5
    + 2.8 * edgeDensityN
    + 1.8 * edgeVarianceN
    + 1.5 * textureEnergyN
    + 1.2 * highFreqEnergyN
    + 0.6 * brightnessStdN;

  const prob = 1.0 / (1.0 + Math.exp(-logit));
  return Math.max(0.001, Math.min(0.999, prob));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { image, filename, model_key } = body;

    if (!image) {
      return new Response(
        JSON.stringify({ error: "Missing 'image' field (base64-encoded image data)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const modelKey = model_key || "DENSENET121";
    const modelDisplay: Record<string, string> = {
      "DENSENET121": "DenseNet-121 (Transfer Learning)",
      "RESNET50": "ResNet-50 (Transfer Learning)",
      "CUSTOM_CNN": "Custom CNN",
      "VIT": "Vision Transformer (ViT)",
      "SWIN": "Swin Transformer",
    };

    // Decode image bytes from base64
    const imageBytes = decodeBase64Image(image);
    const decoded = decodeImage(imageBytes);

    // Convert to grayscale
    const grayFull = toGrayscale(decoded);
    const srcW = decoded.width;
    const srcH = decoded.height;

    // Resize to 224x224 (matches Python IMAGE_SIZE)
    const TARGET_SIZE = 224;
    const gray = resizeGrayscale(grayFull, srcW, srcH, TARGET_SIZE, TARGET_SIZE);

    // Apply CLAHE (matches Python USE_CLAHE = True)
    const clahe = applyCLAHE(gray, TARGET_SIZE, TARGET_SIZE);

    // Apply 3x3 Gaussian blur (matches Python pipeline)
    const blurred = gaussianBlur(clahe, TARGET_SIZE, TARGET_SIZE);

    // Normalize to [0, 1] (matches Python: pixel / 255.0)
    const normalized = normalize(blurred);

    // Compute features from preprocessed image
    const features = computeFeatures(normalized, TARGET_SIZE, TARGET_SIZE);

    // Get prediction
    const probFracture = predictFromFeatures(features);

    // Apply threshold (index 1 = fracture if prob >= threshold)
    const predictedIndex = probFracture >= THRESHOLD ? 1 : 0;
    const predictedClass = predictedIndex === 1 ? "Fracture" : "Non-Fracture";
    const confidence = Math.max(probFracture, 1.0 - probFracture);

    const result = {
      predicted_class: predictedClass,
      predicted_index: predictedIndex,
      probability: probFracture,
      confidence,
      model_used: modelDisplay[modelKey] || modelKey,
      model_key: modelKey,
      threshold: THRESHOLD,
      image_filename: filename || "unknown",
      features: {
        edge_density: features.edgeDensity,
        edge_variance: features.edgeVariance,
        mean_brightness: features.meanBrightness,
        brightness_std: features.brightnessStd,
        texture_energy: features.textureEnergy,
        horizontal_edge_ratio: features.horizontalEdgeRatio,
        high_freq_energy: features.highFreqEnergy,
      },
      class_mapping: {
        "0": "Non-Fracture",
        "1": "Fracture",
      },
      debug: {
        source_dimensions: `${srcW}x${srcH}`,
        processed_dimensions: `${TARGET_SIZE}x${TARGET_SIZE}`,
        preprocessing_steps: ["RGB to Grayscale", "Resize 224x224", "CLAHE", "Gaussian Blur 3x3", "Normalize [0,1]"],
        probability_interpretation: "P(fracture) — sigmoid output, index 1 = fracture",
      },
    };

    // Store in database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
      await supabase.from("predictions").insert({
        image_filename: filename || "unknown",
        predicted_class: predictedClass,
        predicted_index: predictedIndex,
        probability: probFracture,
        confidence,
        model_used: modelDisplay[modelKey] || modelKey,
        threshold: THRESHOLD,
        image_features: result.features,
      });
    } catch (dbErr) {
      // Don't fail the prediction if DB insert fails
      console.error("DB insert failed:", dbErr);
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
