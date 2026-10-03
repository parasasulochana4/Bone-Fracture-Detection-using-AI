import os
import cv2
import numpy as np
from PIL import Image
from tensorflow.keras.preprocessing.image import ImageDataGenerator

from src.config import (
    IMAGE_SIZE, BATCH_SIZE, DATASET_DIR,
    TRAIN_DIR, VAL_DIR, TEST_DIR, CLASS_NAMES, USE_CLAHE,
)

# ─────────────────────────────────────────────────────────────
# SINGLE preprocessing function used by BOTH training and inference.
# ─────────────────────────────────────────────────────────────

def _apply_clahe(img):
    """Apply CLAHE (Contrast Limited Adaptive Histogram Equalization) on an RGB image.
    This is critical for X-ray images — it enhances fracture lines and bone edges
    that standard normalization misses. Operates on the L channel of LAB color space.
    Input/output: uint8 or float32 array, any range — we clamp to [0,255] internally.
    """
    if img.dtype != np.uint8:
        img_u8 = np.clip(img, 0, 255).astype(np.uint8)
    else:
        img_u8 = img.copy()

    lab = cv2.cvtColor(img_u8, cv2.COLOR_RGB2LAB)
    lab[:, :, 0] = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)).apply(lab[:, :, 0])
    result = cv2.cvtColor(lab, cv2.COLOR_LAB2RGB)

    if img.dtype != np.uint8:
        return result.astype(img.dtype)
    return result


def preprocess_image(image_input, target_size=IMAGE_SIZE, apply_blur=True, apply_clahe=True):
    """
    Preprocess a single image:
      1. Load as RGB
      2. Resize to 224x224 (INTER_AREA)
      3. CLAHE contrast enhancement (if enabled — critical for X-rays)
      4. Optional 3x3 Gaussian blur
      5. Normalise to [0, 1]

    Works with: file path, PIL.Image, or numpy array.
    """
    if isinstance(image_input, str):
        if not os.path.exists(image_input):
            raise FileNotFoundError(f"Image path not found: {image_input}")
        img = cv2.imread(image_input)
        if img is None:
            raise ValueError(f"Unable to read image at {image_input}")
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    elif isinstance(image_input, Image.Image):
        img = np.array(image_input.convert("RGB"))
    elif isinstance(image_input, np.ndarray):
        if len(image_input.shape) == 2:
            img = cv2.cvtColor(image_input, cv2.COLOR_GRAY2RGB)
        elif image_input.shape[2] == 4:
            img = cv2.cvtColor(image_input, cv2.COLOR_RGBA2RGB)
        else:
            img = image_input.copy()
    else:
        raise TypeError("Unsupported image input type")

    # Resize
    img_resized = cv2.resize(img, target_size, interpolation=cv2.INTER_AREA)

    # CLAHE contrast enhancement
    if apply_clahe:
        img_resized = _apply_clahe(img_resized)

    # Gaussian blur
    if apply_blur:
        img_resized = cv2.GaussianBlur(img_resized, (3, 3), 0)

    # Normalise
    return img_resized.astype(np.float32) / 255.0


def _train_preprocess_fn(img):
    """Applied by ImageDataGenerator AFTER rescale, on [0,1] float images.
    Reverses to [0,255] for CLAHE, then reverses back."""
    img_scaled = (img * 255.0).astype(np.uint8)
    if USE_CLAHE:
        img_scaled = _apply_clahe(img_scaled)
    img_scaled = cv2.GaussianBlur(img_scaled, (3, 3), 0)
    return img_scaled.astype(np.float32) / 255.0


def get_data_generators(
    train_dir=TRAIN_DIR,
    val_dir=VAL_DIR,
    test_dir=TEST_DIR,
    target_size=IMAGE_SIZE,
    batch_size=BATCH_SIZE,
):
    """
    Creates train / val / test generators.
    Class mapping: index 0 = non_fracture, index 1 = fracture
    Only the TRAIN generator is augmented. Val and test are only rescaled + CLAHE + blur.
    """
    train_datagen = ImageDataGenerator(
        rescale=1.0 / 255.0,
        rotation_range=20,
        width_shift_range=0.15,
        height_shift_range=0.15,
        zoom_range=0.15,
        brightness_range=[0.8, 1.2],
        horizontal_flip=True,
        vertical_flip=False,
        fill_mode="constant",
        cval=0.0,
        preprocessing_function=_train_preprocess_fn,
    )

    val_test_datagen = ImageDataGenerator(
        rescale=1.0 / 255.0,
        preprocessing_function=_train_preprocess_fn,
    )

    train_generator = train_datagen.flow_from_directory(
        train_dir, target_size=target_size, batch_size=batch_size,
        class_mode="binary", classes=CLASS_NAMES, shuffle=True, seed=42,
    )
    val_generator = val_test_datagen.flow_from_directory(
        val_dir, target_size=target_size, batch_size=batch_size,
        class_mode="binary", classes=CLASS_NAMES, shuffle=False,
    )
    test_generator = val_test_datagen.flow_from_directory(
        test_dir, target_size=target_size, batch_size=batch_size,
        class_mode="binary", classes=CLASS_NAMES, shuffle=False,
    )
    return train_generator, val_generator, test_generator


def get_dataset_statistics(dataset_dir=DATASET_DIR):
    """Scan dataset folders and return class distribution counts."""
    stats = {}
    splits = ["train", "val", "test"]
    classes = CLASS_NAMES
    for split in splits:
        stats[split] = {}
        split_path = os.path.join(dataset_dir, split)
        for cls in classes:
            cls_path = os.path.join(split_path, cls)
            if os.path.exists(cls_path):
                files = [
                    f for f in os.listdir(cls_path)
                    if f.lower().endswith((".png", ".jpg", ".jpeg", ".bmp", ".tiff"))
                ]
                stats[split][cls] = len(files)
            else:
                stats[split][cls] = 0
        stats[split]["total"] = sum(stats[split].values())
    return stats


def compute_class_weights(train_dir=TRAIN_DIR):
    """Compute class weights to handle imbalance. Returns dict for keras fit()."""
    counts = {}
    for cls in CLASS_NAMES:
        cls_path = os.path.join(train_dir, cls)
        if os.path.exists(cls_path):
            counts[cls] = len([f for f in os.listdir(cls_path)
                               if f.lower().endswith((".png", ".jpg", ".jpeg", ".bmp"))])
        else:
            counts[cls] = 0

    total = sum(counts.values())
    if total == 0:
        return None

    idx_map = {name: i for i, name in enumerate(CLASS_NAMES)}
    weights = {}
    for cls_name, count in counts.items():
        idx = idx_map[cls_name]
        weights[idx] = total / (len(counts) * max(count, 1))

    print(f"[INFO] Class distribution: {counts}")
    print(f"[INFO] Class weights: {weights}")
    return weights
