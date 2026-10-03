"""
Grad-CAM (Gradient-weighted Class Activation Mapping) for explainable AI.

Generates a heatmap overlay showing which regions of the X-ray most influenced
the model's prediction. Works with:
  - Custom CNN (uses 'last_conv_layer')
  - ResNet-50 (uses 'conv5_block3_out')
  - DenseNet-121 (uses 'relu' — the last conv layer before pooling)

Requires no external packages beyond TensorFlow + OpenCV + Matplotlib.
"""

import os
import cv2
import numpy as np
import tensorflow as tf
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

from src.config import IMAGE_SIZE, USE_CLAHE, EVAL_RESULTS_DIR
from src.preprocessing import preprocess_image


# Map model keys to their last conv layer names
LAST_CONV_LAYERS = {
    "CUSTOM_CNN": "last_conv_layer",
    "RESNET50": "conv5_block3_out",
    "DENSENET121": "relu",
}


def _find_last_conv_layer(model):
    """Dynamically find the last Conv2D layer if the predefined name isn't found."""
    for layer in reversed(model.layers):
        if isinstance(layer, tf.keras.layers.Conv2D):
            return layer.name
        # Check if it's a nested model (transfer learning base)
        if hasattr(layer, 'layers') and len(layer.layers) > 0:
            for sub_layer in reversed(layer.layers):
                if isinstance(sub_layer, tf.keras.layers.Conv2D):
                    return sub_layer.name
    return None


def generate_gradcam(model, image_path, model_key="CUSTOM_CNN",
                     target_size=IMAGE_SIZE, apply_clahe=USE_CLAHE,
                     alpha=0.4):
    """
    Generate a Grad-CAM heatmap overlay for a single image.

    Args:
        model: Loaded Keras model
        image_path: Path to the X-ray image
        model_key: Model identifier (for layer lookup)
        target_size: Image resize target
        apply_clahe: Whether CLAHE was applied during training
        alpha: Overlay opacity (0-1)

    Returns:
        dict with:
            - heatmap: numpy array of the raw heatmap (H, W, 3) uint8
            - overlay: numpy array of the overlay image (H, W, 3) uint8
            - save_path: path to saved figure (if saved)
            - predicted_class: "Fracture" or "Non-Fracture"
            - probability: float
    """
    # Preprocess the image (same as training/inference)
    img = preprocess_image(image_path, target_size=target_size,
                           apply_blur=True, apply_clahe=apply_clahe)
    img_batch = np.expand_dims(img, axis=0)

    # Get prediction
    preds = model.predict(img_batch, verbose=0)
    prob = float(preds.ravel()[0])
    predicted_class = "Fracture" if prob >= 0.5 else "Non-Fracture"

    # Find the last conv layer
    layer_name = LAST_CONV_LAYERS.get(model_key)
    if layer_name:
        try:
            last_conv_layer = model.get_layer(layer_name)
        except (ValueError, KeyError):
            found = _find_last_conv_layer(model)
            if found:
                last_conv_layer = model.get_layer(found)
                layer_name = found
            else:
                raise ValueError("Could not find a Conv2D layer for Grad-CAM")
    else:
        found = _find_last_conv_layer(model)
        if found:
            last_conv_layer = model.get_layer(found)
            layer_name = found
        else:
            raise ValueError("Could not find a Conv2D layer for Grad-CAM")

    # Build a model that outputs both the conv layer activations and the final prediction
    grad_model = tf.keras.models.Model(
        model.inputs,
        [last_conv_layer.output, model.output]
    )

    # Compute gradients of the predicted class w.r.t. the conv layer output
    with tf.GradientTape() as tape:
        conv_outputs, predictions = grad_model(img_batch)
        # Use the output for the predicted class
        pred_index = 0  # single sigmoid output
        loss = predictions[:, pred_index]

    grads = tape.gradient(loss, conv_outputs)

    # Pool gradients to get weights (global average)
    pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2)).numpy()
    conv_outputs = conv_outputs.numpy()[0]

    # Weight the conv outputs by the gradients
    for i in range(pooled_grads.shape[0]):
        conv_outputs[:, :, i] *= pooled_grads[i]

    # Generate heatmap
    heatmap = np.mean(conv_outputs, axis=-1)
    heatmap = np.maximum(heatmap, 0)  # ReLU
    heatmap = heatmap / (heatmap.max() + 1e-8)  # Normalize to [0, 1]

    # Resize heatmap to original image size
    heatmap_resized = cv2.resize(heatmap, target_size)
    heatmap_uint8 = np.uint8(255 * heatmap_resized)
    heatmap_color = cv2.applyColorMap(heatmap_uint8, cv2.COLORMAP_JET)
    heatmap_color = cv2.cvtColor(heatmap_color, cv2.COLOR_BGR2RGB)

    # Load original image for overlay
    original = cv2.imread(image_path)
    if original is None:
        raise ValueError(f"Could not read image: {image_path}")
    original = cv2.cvtColor(original, cv2.COLOR_BGR2RGB)
    original = cv2.resize(original, target_size, interpolation=cv2.INTER_AREA)

    # Create overlay
    overlay = cv2.addWeighted(original, 1 - alpha, heatmap_color, alpha, 0)

    return {
        "heatmap": heatmap_color,
        "overlay": overlay,
        "heatmap_raw": heatmap_resized,
        "original": original,
        "predicted_class": predicted_class,
        "probability": prob,
        "layer_used": layer_name,
    }


def save_gradcam_figure(result, save_path=None):
    """Save the Grad-CAM result as a figure with original, heatmap, and overlay."""
    fig, axes = plt.subplots(1, 3, figsize=(15, 5))

    axes[0].imshow(result["original"])
    axes[0].set_title("Original X-ray", fontsize=12, fontweight="bold")
    axes[0].axis("off")

    axes[1].imshow(result["heatmap"])
    axes[1].set_title("Grad-CAM Heatmap", fontsize=12, fontweight="bold")
    axes[1].axis("off")

    axes[2].imshow(result["overlay"])
    axes[2].set_title(f"Overlay — Predicted: {result['predicted_class']} ({result['probability']:.4f})",
                      fontsize=12, fontweight="bold")
    axes[2].axis("off")

    plt.tight_layout()

    if save_path is None:
        save_path = os.path.join(EVAL_RESULTS_DIR, "gradcam_result.png")

    plt.savefig(save_path, dpi=300, bbox_inches="tight")
    plt.close(fig)
    print(f"[INFO] Grad-CAM saved to {save_path}")
    return save_path


if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser(description="Generate Grad-CAM visualization")
    p.add_argument("image", help="Path to X-ray image")
    p.add_argument("--model", default="CUSTOM_CNN",
                   choices=list(LAST_CONV_LAYERS.keys()),
                   help="Which model to use")
    p.add_argument("--alpha", type=float, default=0.4, help="Overlay opacity")
    args = p.parse_args()

    from src.config import MODEL_PATHS
    model = tf.keras.models.load_model(MODEL_PATHS[args.model])
    result = generate_gradcam(model, args.image, model_key=args.model, alpha=args.alpha)
    save_path = save_gradcam_figure(result)
    print(f"\n  Predicted: {result['predicted_class']}")
    print(f"  P(fracture)= {result['probability']:.4f}")
    print(f"  Layer used: {result['layer_used']}")
    print(f"  Saved to:   {save_path}")
