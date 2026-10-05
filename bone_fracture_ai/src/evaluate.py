import os
import json
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns
import tensorflow as tf
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    confusion_matrix, roc_auc_score, roc_curve,
)

from src.config import (
    TEST_DIR, IMAGE_SIZE, BATCH_SIZE, EVAL_RESULTS_DIR,
    MODEL_PATHS, MODEL_DISPLAY, THRESHOLD_PATHS, CLASS_NAMES,
    POSITIVE_CLASS_INDEX, get_threshold,
)
from src.preprocessing import get_data_generators


# ─────────────────────────────────────────────────────────────
# METRIC DEFINITIONS  (positive class = FRACTURE = index 1)
#
#   TP = fracture correctly predicted as fracture
#   TN = non-fracture correctly predicted as non-fracture
#   FP = non-fracture incorrectly predicted as fracture
#   FN = fracture incorrectly predicted as non-fracture
#
#   Accuracy    = (TP + TN) / (TP + TN + FP + FN)
#   Precision   = TP / (TP + FP)
#   Recall/Sens = TP / (TP + FN)
#   Specificity = TN / (TN + FP)
#   F1          = 2 × Precision × Recall / (Precision + Recall)
# ─────────────────────────────────────────────────────────────

def compute_metrics(y_true, y_pred, y_probs):
    """Compute all metrics. y_true / y_pred are binary {0,1}; 1 = fracture."""
    tn, fp, fn, tp = confusion_matrix(y_true, y_pred, labels=[0, 1]).ravel()

    accuracy    = (tp + tn) / (tp + tn + fp + fn) if (tp + tn + fp + fn) else 0.0
    precision   = tp / (tp + fp) if (tp + fp) else 0.0
    recall      = tp / (tp + fn) if (tp + fn) else 0.0      # sensitivity
    specificity = tn / (tn + fp) if (tn + fp) else 0.0
    f1          = 2 * precision * recall / (precision + recall) if (precision + recall) else 0.0

    try:
        roc_auc = float(roc_auc_score(y_true, y_probs))
    except Exception:
        roc_auc = 0.0

    return {
        "accuracy": float(accuracy),
        "precision": float(precision),
        "recall": float(recall),
        "specificity": float(specificity),
        "f1": float(f1),
        "roc_auc": roc_auc,
        "tp": int(tp), "tn": int(tn),
        "fp": int(fp), "fn": int(fn),
    }


def plot_confusion_matrix(y_true, y_pred, save_path, model_name=""):
    """Plot confusion matrix:
         Predicted
         Non-Fracture  Fracture
    Non-Fracture   TN          FP
    Fracture       FN          TP
    """
    cm = confusion_matrix(y_true, y_pred, labels=[0, 1])
    labels = [["TN", "FP"], ["FN", "TP"]]

    fig, ax = plt.subplots(figsize=(6, 5))
    sns.heatmap(cm, annot=True, fmt="d", cmap="Blues",
                xticklabels=["Non-Fracture", "Fracture"],
                yticklabels=["Non-Fracture", "Fracture"],
                ax=ax, cbar=True, square=True,
                annot_kws={"size": 16, "weight": "bold"})
    # Add TN/FP/FN/TP labels in each cell
    for i in range(2):
        for j in range(2):
            ax.text(j + 0.5, i + 0.75, labels[i][j],
                    ha="center", va="center", fontsize=10, color="#6b7280")
    ax.set_xlabel("Predicted", fontsize=12, fontweight="bold")
    ax.set_ylabel("Actual", fontsize=12, fontweight="bold")
    ax.set_title(f"Confusion Matrix — {model_name}", fontsize=13, fontweight="bold")
    plt.tight_layout()
    plt.savefig(save_path, dpi=300, bbox_inches="tight")
    plt.close(fig)


def plot_roc_curve(y_true, y_probs, save_path, model_name=""):
    fpr, tpr, _ = roc_curve(y_true, y_probs)
    auc_val = roc_auc_score(y_true, y_probs)

    fig, ax = plt.subplots(figsize=(6, 5))
    ax.plot(fpr, tpr, color="#2563eb", lw=2, label=f"ROC (AUC = {auc_val:.4f})")
    ax.plot([0, 1], [0, 1], color="#9ca3af", lw=1, linestyle="--", label="Random")
    ax.set_xlabel("False Positive Rate (1 - Specificity)")
    ax.set_ylabel("True Positive Rate (Recall)")
    ax.set_title(f"ROC Curve — {model_name}", fontsize=13, fontweight="bold")
    ax.legend(loc="lower right")
    ax.grid(True, linestyle="--", alpha=0.6)
    plt.tight_layout()
    plt.savefig(save_path, dpi=300, bbox_inches="tight")
    plt.close(fig)


def evaluate_model(model_key, model_path, test_gen):
    """Evaluate a single model on the test set."""
    if not os.path.exists(model_path):
        print(f"[WARN] Model not found: {model_path} — skipping {model_key}")
        return None

    print(f"\n{'=' * 60}")
    print(f"EVALUATING {MODEL_DISPLAY.get(model_key, model_key)}")
    print(f"{'=' * 60}")

    model = tf.keras.models.load_model(model_path)
    test_gen.reset()

    steps = max(1, test_gen.samples // test_gen.batch_size + 1)
    y_probs = model.predict(test_gen, steps=steps, verbose=0).ravel()
    y_true = test_gen.classes[:len(y_probs)]

    threshold = get_threshold(model_key)
    print(f"[INFO] Using threshold={threshold:.2f} for {model_key}")

    y_pred = (y_probs >= threshold).astype(int)

    metrics = compute_metrics(y_true, y_pred, y_probs)

    # Save plots
    safe_key = model_key.lower()
    cm_path = os.path.join(EVAL_RESULTS_DIR, f"{safe_key}_confusion_matrix.png")
    roc_path = os.path.join(EVAL_RESULTS_DIR, f"{safe_key}_roc_curve.png")
    plot_confusion_matrix(y_true, y_pred, cm_path, MODEL_DISPLAY.get(model_key, model_key))
    plot_roc_curve(y_true, y_probs, roc_path, MODEL_DISPLAY.get(model_key, model_key))

    # Save metrics JSON
    result = {
        "model_key": model_key,
        "model_name": MODEL_DISPLAY.get(model_key, model_key),
        "model_path": model_path,
        "threshold": float(threshold),
        "test_samples": int(len(y_true)),
        "class_mapping": {"0": "Non-Fracture", "1": "Fracture"},
        "metrics": metrics,
        "confusion_matrix_path": cm_path,
        "roc_curve_path": roc_path,
    }
    metrics_path = os.path.join(EVAL_RESULTS_DIR, f"{safe_key}_metrics.json")
    with open(metrics_path, "w") as f:
        json.dump(result, f, indent=2)

    _print_metrics(model_key, result)
    return result


def _print_metrics(model_key, result):
    m = result["metrics"]
    print(f"\n  Results for {result['model_name']}:")
    print(f"    Test samples: {result['test_samples']}")
    print(f"    Threshold:    {result['threshold']:.2f}")
    print(f"    TP={m['tp']}  TN={m['tn']}  FP={m['fp']}  FN={m['fn']}")
    print(f"    Accuracy:     {m['accuracy']:.4f}")
    print(f"    Precision:    {m['precision']:.4f}")
    print(f"    Recall:       {m['recall']:.4f}")
    print(f"    Specificity:  {m['specificity']:.4f}")
    print(f"    F1-Score:     {m['f1']:.4f}")
    print(f"    ROC-AUC:      {m['roc_auc']:.4f}")


def evaluate_all(models_to_eval=None, test_dir=TEST_DIR):
    """Evaluate all (or a subset of) models on the SAME test set."""
    _, _, test_gen = get_data_generators(test_dir=test_dir)

    if test_gen is None or test_gen.samples == 0:
        raise ValueError(f"No test data found in {TEST_DIR}")

    print(f"[INFO] Test samples: {test_gen.samples}")
    print(f"[INFO] Class indices: {test_gen.class_indices}")

    if models_to_eval is None:
        models_to_eval = list(MODEL_PATHS.keys())

    all_results = {}
    for key in models_to_eval:
        path = MODEL_PATHS.get(key, "")
        if not path:
            continue
        result = evaluate_model(key, path, test_gen)
        if result:
            all_results[key] = result

    # Save combined benchmark
    benchmark_path = os.path.join(EVAL_RESULTS_DIR, "benchmark_results.json")
    with open(benchmark_path, "w") as f:
        json.dump(all_results, f, indent=2)
    print(f"\n[INFO] Benchmark saved to {benchmark_path}")

    # Print comparison table
    if all_results:
        print(f"\n{'=' * 80}")
        print(f"{'Model':<30} {'Accuracy':>10} {'Precision':>10} {'Recall':>10} "
              f"{'Specificity':>12} {'F1':>8} {'AUC':>8}")
        print("-" * 80)
        for key, r in all_results.items():
            m = r["metrics"]
            print(f"{r['model_name']:<30} {m['accuracy']:>10.4f} {m['precision']:>10.4f} "
                  f"{m['recall']:>10.4f} {m['specificity']:>12.4f} {m['f1']:>8.4f} {m['roc_auc']:>8.4f}")
        print("=" * 80)

    return all_results


if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument("--models", nargs="+", default=None)
    args = p.parse_args()
    evaluate_all(models_to_eval=args.models)
