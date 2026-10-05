import os
import json

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATASET_DIR = os.path.join(BASE_DIR, "dataset")
TRAIN_DIR = os.path.join(DATASET_DIR, "train")
VAL_DIR = os.path.join(DATASET_DIR, "val")
TEST_DIR = os.path.join(DATASET_DIR, "test")
MODELS_DIR = os.path.join(BASE_DIR, "models")
REPORTS_DIR = os.path.join(BASE_DIR, "reports")
EVAL_RESULTS_DIR = os.path.join(BASE_DIR, "evaluation_results")

# Model configuration
IMAGE_WIDTH = 224
IMAGE_HEIGHT = 224
IMAGE_CHANNELS = 3
IMAGE_SIZE = (IMAGE_WIDTH, IMAGE_HEIGHT)
INPUT_SHAPE = (IMAGE_WIDTH, IMAGE_HEIGHT, IMAGE_CHANNELS)
BATCH_SIZE = 32
DEFAULT_EPOCHS = 30
FINE_TUNE_EPOCHS = 15
LEARNING_RATE = 1e-4
FINE_TUNE_LR = 1e-5
DROPOUT_RATE = 0.3
CLASSIFICATION_THRESHOLD = 0.50
USE_CLAHE = True

# ── CLASS MAPPING ──────────────────────────────────────────────
# This is the SINGLE source of truth.  Every file MUST use this.
# Index 0 = NON-FRACTURE  (negative class)
# Index 1 = FRACTURE       (positive class)
CLASS_NAMES = ["non_fracture", "fracture"]
CLASS_LABELS = {0: "Non-Fracture", 1: "Fracture"}
POSITIVE_CLASS_INDEX = 1

# Model save paths
CUSTOM_CNN_PATH = os.path.join(MODELS_DIR, "custom_cnn_fracture_model.keras")
BEST_MODEL_PATH = os.path.join(MODELS_DIR, "best_fracture_model.keras")
MODEL_H5_PATH = os.path.join(MODELS_DIR, "best_fracture_model.h5")
VIT_MODEL_PATH = os.path.join(MODELS_DIR, "vit_best.keras")
SWIN_MODEL_PATH = os.path.join(MODELS_DIR, "swin_best.keras")
RESNET50_MODEL_PATH = os.path.join(MODELS_DIR, "resnet50_best.keras")
DENSENET121_MODEL_PATH = os.path.join(MODELS_DIR, "densenet121_best.keras")

# Threshold JSON paths
CUSTOM_CNN_THRESHOLD_PATH = os.path.join(MODELS_DIR, "custom_cnn_threshold.json")
VIT_THRESHOLD_PATH = os.path.join(MODELS_DIR, "vit_threshold.json")
SWIN_THRESHOLD_PATH = os.path.join(MODELS_DIR, "swin_threshold.json")
RESNET50_THRESHOLD_PATH = os.path.join(MODELS_DIR, "resnet50_threshold.json")
DENSENET121_THRESHOLD_PATH = os.path.join(MODELS_DIR, "densenet121_threshold.json")

# Model display names
MODEL_DISPLAY = {
    "CUSTOM_CNN": "Custom CNN",
    "VIT": "Vision Transformer (ViT)",
    "SWIN": "Swin Transformer",
    "RESNET50": "ResNet-50 (Transfer Learning)",
    "DENSENET121": "DenseNet-121 (Transfer Learning)",
}

MODEL_PATHS = {
    "CUSTOM_CNN": CUSTOM_CNN_PATH,
    "VIT": VIT_MODEL_PATH,
    "SWIN": SWIN_MODEL_PATH,
    "RESNET50": RESNET50_MODEL_PATH,
    "DENSENET121": DENSENET121_MODEL_PATH,
}

THRESHOLD_PATHS = {
    "CUSTOM_CNN": CUSTOM_CNN_THRESHOLD_PATH,
    "VIT": VIT_THRESHOLD_PATH,
    "SWIN": SWIN_THRESHOLD_PATH,
    "RESNET50": RESNET50_THRESHOLD_PATH,
    "DENSENET121": DENSENET121_THRESHOLD_PATH,
}

# Ensure critical directories exist
for d in [MODELS_DIR, REPORTS_DIR, EVAL_RESULTS_DIR, TRAIN_DIR, VAL_DIR, TEST_DIR]:
    os.makedirs(d, exist_ok=True)


def get_threshold(model_key: str) -> float:
    """Load model-specific threshold from JSON, or return default 0.5."""
    path = THRESHOLD_PATHS.get(model_key)
    if path and os.path.exists(path):
        try:
            with open(path, "r") as f:
                return float(json.load(f).get("threshold", CLASSIFICATION_THRESHOLD))
        except Exception:
            pass
    return CLASSIFICATION_THRESHOLD


def save_threshold(model_key: str, threshold: float):
    path = THRESHOLD_PATHS.get(model_key)
    if path:
        with open(path, "w") as f:
            json.dump({"threshold": float(threshold)}, f, indent=2)
