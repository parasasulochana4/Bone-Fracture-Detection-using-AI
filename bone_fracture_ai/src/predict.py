"""
Inference module — uses EXACTLY the same preprocessing as training.

Class mapping (from config.py, the single source of truth):
    index 0 = Non-Fracture  (sigmoid output <  threshold)
    index 1 = Fracture       (sigmoid output >= threshold)

Sigmoid output = P(fracture).  Confidence is derived directly from the
model probability, never hard-coded.
"""

import os
import numpy as np
import tensorflow as tf

from src.config import (
    MODEL_PATHS, MODEL_DISPLAY,
    CLASS_LABELS, IMAGE_SIZE, USE_CLAHE, get_threshold,
)
from src.preprocessing import preprocess_image


def predict_image(image_path, model_key="DENSENET121", model=None, threshold=None):
    """
    Run a single-image prediction.

    Returns dict with predicted_class, probability, confidence, model_used, threshold.
    """
    if model is None:
        model_path = MODEL_PATHS.get(model_key)
        if not model_path or not os.path.exists(model_path):
            raise FileNotFoundError(
                f"Model file not found for {model_key}: {model_path}")
        model = tf.keras.models.load_model(model_path)

    # Use same preprocessing as training (CLAHE + Gaussian blur + resize + normalise)
    img = preprocess_image(
        image_path, target_size=IMAGE_SIZE,
        apply_blur=True, apply_clahe=USE_CLAHE,
    )
    img_batch = np.expand_dims(img, axis=0)

    prob_fracture = float(model.predict(img_batch, verbose=0).ravel()[0])

    if threshold is None:
        threshold = get_threshold(model_key)

    predicted_index = 1 if prob_fracture >= threshold else 0
    predicted_class = CLASS_LABELS[predicted_index]
    confidence = max(prob_fracture, 1.0 - prob_fracture)

    return {
        "predicted_class": predicted_class,
        "predicted_index": predicted_index,
        "probability": prob_fracture,
        "confidence": confidence,
        "model_used": MODEL_DISPLAY.get(model_key, model_key),
        "model_key": model_key,
        "threshold": float(threshold),
        "image_path": image_path,
    }


def predict_batch(image_paths, model_key="DENSENET121", model=None, threshold=None):
    """Run predictions on a list of image paths."""
    results = []
    for path in image_paths:
        try:
            r = predict_image(path, model_key=model_key, model=model, threshold=threshold)
            results.append(r)
        except Exception as e:
            results.append({"image_path": path, "error": str(e)})
    return results


if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser(description="Predict fracture from X-ray image(s)")
    p.add_argument("images", nargs="+", help="Path(s) to X-ray image(s)")
    p.add_argument("--model", default="DENSENET121",
                   choices=list(MODEL_PATHS.keys()),
                   help="Which model to use")
    args = p.parse_args()

    for img_path in args.images:
        result = predict_image(img_path, model_key=args.model)
        print(f"\n  Image:     {result['image_path']}")
        print(f"  Model:     {result['model_used']}")
        print(f"  Predicted: {result['predicted_class']}")
        print(f"  P(fracture)= {result['probability']:.4f}")
        print(f"  Confidence: {result['confidence']:.4f}")
        print(f"  Threshold:  {result['threshold']:.2f}")
