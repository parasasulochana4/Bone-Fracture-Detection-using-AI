# AI-Powered Bone Fracture Detection and Advisory System

## Critical Bug Fixes (v2)

This version fixes the core prediction issues from the original repository:

### Bug #1 — Reversed Class Labels (MAIN CAUSE)
**Problem:** `config.py` defined `CLASS_NAMES = ["non_fracture", "fracture"]` (index 0 = non-fracture), but `preprocessing.py` used `flow_from_directory(classes=["fracture", "non_fracture"])` (index 0 = fracture). The model trained with the opposite label mapping from what inference expected, causing non-fracture images to be predicted as fracture.

**Fix:** All files now use `CLASS_NAMES = ["non_fracture", "fracture"]` consistently. The `classes` parameter in `flow_from_directory` is set to `CLASS_NAMES` so Keras assigns index 0 = non_fracture, index 1 = fracture everywhere.

### Bug #2 — Training/Inference Preprocessing Mismatch
**Problem:** `preprocess_image()` (inference) applied Gaussian blur, but `get_data_generators()` (training) only did `rescale=1/255` with no blur. The model never saw blurred images during training, causing distribution shift at inference.

**Fix:** Both training and inference now apply the same Gaussian blur via a `preprocessing_function` in the `ImageDataGenerator`, matching the standalone `preprocess_image()` function.

### Bug #3 — ViT/Swin Saved to Wrong Paths
**Problem:** `train.py` saved ViT and Swin models to `EVAL_RESULTS_DIR` instead of the configured `VIT_MODEL_PATH` / `SWIN_MODEL_PATH`.

**Fix:** Each model now saves to its configured path in `MODELS_DIR`.

### Bug #4 — No Threshold Optimization
**Problem:** A fixed 0.5 threshold was used regardless of model behavior.

**Fix:** After training, an optimal threshold is found on **validation data only** (maximizing F1) and saved per-model. Both evaluation and inference use this threshold.

### Other Improvements
- Image size increased to 224×224 (standard for transfer learning)
- ResNet-50 transfer learning model added
- Class-weighted loss support
- Confusion matrix correctly labels TN/FP/FN/TP
- All metrics computed from the same unseen test predictions
- Benchmark JSON reads actual saved results (no hard-coded values)

## Class Mapping (Single Source of Truth)

```
Index 0 = Non-Fracture  (negative class)
Index 1 = Fracture       (positive class — used for TP/FP/FN/TN)
```

Sigmoid output = P(fracture). Prediction = Fracture if P ≥ threshold.

## Commands

```bash
# Install dependencies
pip install -r requirements.txt

# Train all models
python -m src.train

# Train specific models only
python -m src.train --models CUSTOM_CNN RESNET50

# Evaluate all models on test set
python -m src.evaluate

# Full pipeline (train + evaluate + sample predictions)
python run_pipeline.py

# Predict a single image
python -m src.predict path/to/xray.png --model CUSTOM_CNN

# Launch Streamlit app
streamlit run app.py
```

## Dataset Structure

```
dataset/
├── train/
│   ├── non_fracture/
│   └── fracture/
├── val/
│   ├── non_fracture/
│   └── fracture/
└── test/
    ├── non_fracture/
    └── fracture/
```

Train data is augmented. Validation and test data are NOT augmented.
