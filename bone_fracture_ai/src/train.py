import os
import json
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import tensorflow as tf
from tensorflow.keras.callbacks import (
    EarlyStopping, ModelCheckpoint, ReduceLROnPlateau,
)

from src.config import (
    TRAIN_DIR, VAL_DIR, IMAGE_SIZE, BATCH_SIZE,
    DEFAULT_EPOCHS, FINE_TUNE_EPOCHS, LEARNING_RATE, FINE_TUNE_LR,
    CUSTOM_CNN_PATH, VIT_MODEL_PATH, SWIN_MODEL_PATH,
    RESNET50_MODEL_PATH, DENSENET121_MODEL_PATH, EVAL_RESULTS_DIR,
    CLASS_NAMES, save_threshold,
)
from src.preprocessing import get_data_generators, compute_class_weights
from src.models import (
    build_custom_cnn, build_vit_model, build_swin_model,
    build_transfer_learning_model, compile_model, unfreeze_top_layers,
)


def plot_training_history(history, save_path=None):
    """Plot training/validation accuracy and loss curves."""
    acc = history.history.get("accuracy", [])
    val_acc = history.history.get("val_accuracy", [])
    loss = history.history.get("loss", [])
    val_loss = history.history.get("val_loss", [])
    epochs_range = range(1, len(acc) + 1)

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))

    ax1.plot(epochs_range, acc, label="Train Accuracy", color="#2563eb", lw=2)
    if val_acc:
        ax1.plot(epochs_range, val_acc, label="Val Accuracy", color="#f97316", lw=2)
    ax1.set_title("Model Accuracy vs Epochs", fontsize=12, fontweight="bold")
    ax1.set_xlabel("Epochs")
    ax1.set_ylabel("Accuracy")
    ax1.set_ylim([0.3, 1.05])
    ax1.grid(True, linestyle="--", alpha=0.6)
    ax1.legend(loc="lower right")

    ax2.plot(epochs_range, loss, label="Train Loss", color="#2563eb", lw=2)
    if val_loss:
        ax2.plot(epochs_range, val_loss, label="Val Loss", color="#f97316", lw=2)
    ax2.set_title("Model Loss vs Epochs", fontsize=12, fontweight="bold")
    ax2.set_xlabel("Epochs")
    ax2.set_ylabel("Loss")
    ax2.grid(True, linestyle="--", alpha=0.6)
    ax2.legend(loc="upper right")

    plt.tight_layout()
    if save_path:
        plt.savefig(save_path, dpi=300, bbox_inches="tight")
        print(f"[INFO] Saved training curves to {save_path}")
    plt.close(fig)


def find_best_threshold(y_true, y_probs):
    """Find the threshold that maximises F1 on VALIDATION data only."""
    best_t, best_f1 = 0.5, 0.0
    for t in np.arange(0.1, 0.9, 0.01):
        preds = (y_probs >= t).astype(int)
        tp = np.sum((preds == 1) & (y_true == 1))
        fp = np.sum((preds == 1) & (y_true == 0))
        fn = np.sum((preds == 0) & (y_true == 1))
        prec = tp / (tp + fp + 1e-8)
        rec = tp / (tp + fn + 1e-8)
        f1 = 2 * prec * rec / (prec + rec + 1e-8)
        if f1 > best_f1:
            best_f1, best_t = f1, t
    return float(best_t), float(best_f1)


def _get_val_predictions(model, val_gen):
    """Run predictions on the validation set and return (y_true, y_probs)."""
    val_gen.reset()
    steps = max(1, val_gen.samples // val_gen.batch_size + 1)
    y_probs = model.predict(val_gen, steps=steps, verbose=0).ravel()
    y_true = val_gen.classes[:len(y_probs)]
    return y_true, y_probs


def train_single_model(model_key, model, model_path, train_gen, val_gen,
                       epochs, learning_rate, class_weights=None, fine_tune=False):
    """Train one model with optional 2-phase training (frozen + fine-tune)."""
    print(f"\n{'=' * 60}")
    print(f"TRAINING {model_key}")
    print(f"{'=' * 60}")

    compile_model(model, learning_rate=learning_rate)
    model.summary()

    checkpoint_path = os.path.join(EVAL_RESULTS_DIR, f"{model_key.lower()}_best.keras")
    monitor = "val_accuracy" if val_gen and val_gen.samples > 0 else "accuracy"

    callbacks = [
        EarlyStopping(monitor=monitor, patience=7, restore_best_weights=True, verbose=1),
        ReduceLROnPlateau(monitor=monitor, factor=0.5, patience=3, min_lr=1e-7, verbose=1),
        ModelCheckpoint(filepath=checkpoint_path, monitor=monitor,
                        save_best_only=True, verbose=1),
    ]

    # ── Phase 1: Train with frozen base ──────────────────────
    print(f"\n[Phase 1] Training top layers ({epochs} epochs, lr={learning_rate})")
    history = model.fit(
        train_gen,
        validation_data=val_gen if val_gen and val_gen.samples > 0 else None,
        epochs=epochs,
        callbacks=callbacks,
        class_weight=class_weights,
        verbose=1,
    )

    # ── Phase 2: Fine-tune top layers of transfer learning model ─
    if fine_tune and hasattr(model, '_freeze_until'):
        freeze_until = model._freeze_until
        print(f"\n[Phase 2] Fine-tuning (unfreezing top {abs(freeze_until)} layers, lr={FINE_TUNE_LR})")
        model = unfreeze_top_layers(model, freeze_until=freeze_until, learning_rate=FINE_TUNE_LR)

        ft_callbacks = [
            EarlyStopping(monitor=monitor, patience=5, restore_best_weights=True, verbose=1),
            ReduceLROnPlateau(monitor=monitor, factor=0.5, patience=2, min_lr=1e-8, verbose=1),
            ModelCheckpoint(filepath=checkpoint_path, monitor=monitor,
                            save_best_only=True, verbose=1),
        ]

        ft_history = model.fit(
            train_gen,
            validation_data=val_gen if val_gen and val_gen.samples > 0 else None,
            epochs=FINE_TUNE_EPOCHS,
            callbacks=ft_callbacks,
            class_weight=class_weights,
            verbose=1,
        )

        # Merge histories
        for k in history.history:
            if k in ft_history.history:
                history.history[k] = list(history.history[k]) + list(ft_history.history[k])

    # Save final model
    model.save(model_path)
    print(f"[SUCCESS] {model_key} saved to {model_path}")

    # Find best threshold on VALIDATION data
    if val_gen and val_gen.samples > 0:
        y_true, y_probs = _get_val_predictions(model, val_gen)
        best_t, best_f1 = find_best_threshold(y_true, y_probs)
        save_threshold(model_key, best_t)
        print(f"[INFO] Optimal threshold for {model_key}: {best_t:.2f} (val F1={best_f1:.4f})")

    # Save training curves
    curve_path = os.path.join(EVAL_RESULTS_DIR, f"{model_key.lower()}_training_curves.png")
    plot_training_history(history, save_path=curve_path)

    # Save history JSON
    hist_path = os.path.join(EVAL_RESULTS_DIR, f"{model_key.lower()}_history.json")
    with open(hist_path, "w") as f:
        json.dump({k: [float(v) for v in vals] for k, vals in history.history.items()}, f, indent=2)

    return model


def train_model(epochs=DEFAULT_EPOCHS, batch_size=BATCH_SIZE, learning_rate=LEARNING_RATE,
                models_to_train=None):
    """Train all models. By default: Custom CNN, ViT, Swin, ResNet50, DenseNet121."""
    print("=" * 60)
    print("BONE FRACTURE AI — TRAINING PIPELINE v2")
    print(f"Class mapping: 0={CLASS_NAMES[0]} | 1={CLASS_NAMES[1]}")
    print(f"Image size: {IMAGE_SIZE}, Batch: {batch_size}, Epochs: {epochs}")
    print("=" * 60)

    train_gen, val_gen, _ = get_data_generators(batch_size=batch_size)

    if train_gen is None or train_gen.samples == 0:
        raise ValueError(f"No training data found in {TRAIN_DIR}")

    print(f"Train samples: {train_gen.samples}")
    print(f"Val samples:   {val_gen.samples if val_gen else 0}")
    print(f"Class indices: {train_gen.class_indices}")

    # Compute class weights for imbalance handling
    class_weights = compute_class_weights(TRAIN_DIR)

    if models_to_train is None:
        models_to_train = ["CUSTOM_CNN", "VIT", "SWIN", "RESNET50", "DENSENET121"]

    builders = {
        "CUSTOM_CNN": lambda: build_custom_cnn(),
        "VIT": lambda: build_vit_model(),
        "SWIN": lambda: build_swin_model(),
        "RESNET50": lambda: build_transfer_learning_model("resnet50"),
        "DENSENET121": lambda: build_transfer_learning_model("densenet121"),
    }
    paths = {
        "CUSTOM_CNN": CUSTOM_CNN_PATH,
        "VIT": VIT_MODEL_PATH,
        "SWIN": SWIN_MODEL_PATH,
        "RESNET50": RESNET50_MODEL_PATH,
        "DENSENET121": DENSENET121_MODEL_PATH,
    }
    fine_tune_flags = {
        "CUSTOM_CNN": False,
        "VIT": False,
        "SWIN": False,
        "RESNET50": True,
        "DENSENET121": True,
    }

    results = {}
    for key in models_to_train:
        if key not in builders:
            print(f"[WARN] Unknown model {key}, skipping")
            continue
        model = builders[key]()
        results[key] = train_single_model(
            key, model, paths[key], train_gen, val_gen,
            epochs, learning_rate, class_weights=class_weights,
            fine_tune=fine_tune_flags.get(key, False),
        )

    print("\n" + "=" * 60)
    print("ALL TRAINING COMPLETE")
    print("=" * 60)
    return results


if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument("--epochs", type=int, default=DEFAULT_EPOCHS)
    p.add_argument("--batch-size", type=int, default=BATCH_SIZE)
    p.add_argument("--lr", type=float, default=LEARNING_RATE)
    p.add_argument("--models", nargs="+",
                   default=["CUSTOM_CNN", "VIT", "SWIN", "RESNET50", "DENSENET121"])
    args = p.parse_args()
    train_model(epochs=args.epochs, batch_size=args.batch_size,
                learning_rate=args.lr, models_to_train=args.models)
