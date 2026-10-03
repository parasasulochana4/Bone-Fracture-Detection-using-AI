"""
One-click pipeline: check dataset -> train -> evaluate -> test predictions.

Usage:
    python run_pipeline.py                    # full pipeline (all models)
    python run_pipeline.py --models DENSENET121  # only DenseNet-121
    python run_pipeline.py --skip-train       # evaluate only
"""

import os
import sys
import argparse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


def main():
    parser = argparse.ArgumentParser(description="Bone Fracture AI — Full Pipeline")
    parser.add_argument("--models", nargs="+",
                        default=["CUSTOM_CNN", "VIT", "SWIN", "RESNET50", "DENSENET121"])
    parser.add_argument("--epochs", type=int, default=30)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--lr", type=float, default=1e-4)
    parser.add_argument("--skip-train", action="store_true")
    parser.add_argument("--skip-eval", action="store_true")
    args = parser.parse_args()

    from src.config import MODEL_PATHS, CLASS_NAMES, CLASS_LABELS
    from src.preprocessing import get_dataset_statistics

    print("=" * 60)
    print("BONE FRACTURE AI — PIPELINE v2")
    print("=" * 60)

    # ── 1. Dataset check ────────────────────────────────────
    print("\n[1/4] Dataset Check")
    stats = get_dataset_statistics()
    for split, counts in stats.items():
        print(f"  {split}: total={counts.get('total',0)}  "
              f"non_fracture={counts.get('non_fracture',0)}  "
              f"fracture={counts.get('fracture',0)}")

    print(f"\n  Class mapping: 0={CLASS_LABELS[0]} | 1={CLASS_LABELS[1]}")

    # ── 2. Train ────────────────────────────────────────────
    if not args.skip_train:
        print("\n[2/4] Training")
        from src.train import train_model
        train_model(
            epochs=args.epochs,
            batch_size=args.batch_size,
            learning_rate=args.lr,
            models_to_train=args.models,
        )
    else:
        print("\n[2/4] Training skipped")

    # ── 3. Evaluate ─────────────────────────────────────────
    if not args.skip_eval:
        print("\n[3/4] Evaluation")
        from src.evaluate import evaluate_all
        evaluate_all(models_to_eval=args.models)
    else:
        print("\n[3/4] Evaluation skipped")

    # ── 4. Sample predictions ───────────────────────────────
    print("\n[4/4] Sample Predictions")
    from src.predict import predict_image
    test_base = os.path.join(os.path.dirname(__file__), "dataset", "test")
    for cls in CLASS_NAMES:
        cls_dir = os.path.join(test_base, cls)
        if not os.path.isdir(cls_dir):
            print(f"  [WARN] {cls_dir} not found")
            continue
        files = sorted([f for f in os.listdir(cls_dir)
                        if f.lower().endswith((".png", ".jpg", ".jpeg"))])[:3]
        for fname in files:
            fpath = os.path.join(cls_dir, fname)
            for key in args.models:
                if not os.path.exists(MODEL_PATHS.get(key, "")):
                    continue
                try:
                    r = predict_image(fpath, model_key=key)
                    print(f"  [{key}] {cls}/{fname} -> {r['predicted_class']} "
                          f"(P={r['probability']:.4f}, conf={r['confidence']:.4f})")
                except Exception as e:
                    print(f"  [{key}] {cls}/{fname} -> ERROR: {e}")

    print("\n" + "=" * 60)
    print("PIPELINE COMPLETE")
    print("=" * 60)


if __name__ == "__main__":
    main()
