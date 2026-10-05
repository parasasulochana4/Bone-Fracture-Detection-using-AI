import os
import sys
import json
import numpy as np
import streamlit as st
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.config import (
    MODEL_PATHS, MODEL_DISPLAY, EVAL_RESULTS_DIR,
    CLASS_NAMES, CLASS_LABELS, IMAGE_SIZE,
    get_threshold, get_dataset_statistics,
)
from src.preprocessing import preprocess_image, get_data_generators
from src.predict import predict_image

# ── Treatment plan data ──────────────────────────────────────
TREATMENT_DATA = {
    "Fracture": {
        "next_steps": [
            "Consult an orthopedic specialist as soon as possible",
            "Obtain a follow-up X-ray or CT scan for confirmation",
            "Immobilize the affected area to prevent further injury",
            "Avoid putting weight on the suspected fracture site",
        ],
        "lifestyle": [
            "Ensure adequate calcium and vitamin D intake",
            "Maintain a balanced diet rich in protein",
            "Avoid smoking and excessive alcohol",
            "Follow doctor's weight-bearing restrictions",
            "Get sufficient rest and sleep",
        ],
        "follow_up": [
            "Schedule follow-up X-ray at 2-4 weeks",
            "Attend all orthopedic appointments",
            "Report changes in pain or mobility",
            "Final follow-up at 6-8 weeks to assess healing",
        ],
        "warning_signs": [
            "Severe or worsening pain",
            "Numbness or tingling below the fracture",
            "Skin turning pale or blue — seek emergency care",
            "Fever or chills (possible infection)",
            "Visible deformity or limb shortening",
        ],
    },
    "Non-Fracture": {
        "next_steps": [
            "No fracture detected — but this is not a medical diagnosis",
            "If pain persists, consult a healthcare professional",
            "Doctor may recommend additional imaging",
            "Keep this result for your records",
        ],
        "lifestyle": [
            "Maintain bone health with weight-bearing exercise",
            "Adequate calcium (1000-1200 mg/day) and vitamin D",
            "Engage in balance and strength training",
            "Avoid smoking, limit alcohol",
            "Stay hydrated and eat nutrient-rich foods",
        ],
        "follow_up": [
            "If symptoms persist beyond 7-10 days, see a doctor",
            "If pain worsens, seek medical attention",
            "Consider bone density scan if at risk for osteoporosis",
        ],
        "warning_signs": [
            "Pain that worsens over time",
            "New swelling, bruising, or deformity",
            "Persistent pain lasting more than two weeks",
            "Signs of infection: fever, redness, warmth",
        ],
    },
}


@st.cache_resource
def load_model(model_key):
    import tensorflow as tf
    path = MODEL_PATHS.get(model_key)
    if not path or not os.path.exists(path):
        return None
    return tf.keras.models.load_model(path)


@st.cache_data
def load_benchmark():
    path = os.path.join(EVAL_RESULTS_DIR, "benchmark_results.json")
    if os.path.exists(path):
        with open(path) as f:
            return json.load(f)
    return {}


def show_treatment_plan(predicted_class):
    """Display treatment plan based on prediction."""
    plan = TREATMENT_DATA.get(predicted_class, TREATMENT_DATA["Non-Fracture"])

    st.markdown("---")
    st.subheader("Treatment Plan")
    st.warning("**Medical Disclaimer:** This information is for educational purposes only. "
               "Always consult a qualified healthcare professional.")

    col1, col2 = st.columns(2)
    with col1:
        st.markdown("**Recommended Next Steps:**")
        for step in plan["next_steps"]:
            st.markdown(f"- {step}")

        st.markdown("**Follow-Up Recommendations:**")
        for item in plan["follow_up"]:
            st.markdown(f"- {item}")

    with col2:
        st.markdown("**Lifestyle Recommendations:**")
        for item in plan["lifestyle"]:
            st.markdown(f"- {item}")

        st.error("**Warning Signs — Seek Immediate Care:**")
        for sign in plan["warning_signs"]:
            st.markdown(f"- {sign}")


def show_gradcam(model, uploaded_file, model_key):
    """Generate and display Grad-CAM visualization."""
    try:
        from src.gradcam import generate_gradcam, save_gradcam_figure
        import tempfile

        # Save uploaded file to temp
        with tempfile.NamedTemporaryFile(delete=False, suffix=".png") as tmp:
            tmp.write(uploaded_file.getvalue())
            tmp_path = tmp.name

        result = generate_gradcam(model, tmp_path, model_key=model_key)
        save_path = save_gradcam_figure(result)

        st.image(save_path, caption="Grad-CAM: Original | Heatmap | Overlay", use_column_width=True)
        st.info(f"**Predicted:** {result['predicted_class']} (P={result['probability']:.4f})\n\n"
                f"The red/orange regions show areas that most influenced the model's prediction. "
                f"Layer used: `{result['layer_used']}`")

        os.unlink(tmp_path)
    except Exception as e:
        st.error(f"Grad-CAM generation failed: {e}")


def ai_consultation_response(user_input, prediction_context=None):
    """Simple rule-based AI consultation."""
    lower = user_input.lower()
    responses = {
        "fracture": "A fracture prediction means the AI detected patterns associated with bone fractures. "
                    "This is NOT a medical diagnosis — confirm with an orthopedic specialist.",
        "pain": "Even without a fracture detection, your symptoms are real. If pain persists beyond 7-10 days "
                "or worsens, see a healthcare professional.",
        "heal": "Simple fractures typically heal in 6-8 weeks. Complex fractures may take 12+ weeks. "
                "Your doctor will provide a personalized timeline.",
        "warning": "Seek immediate care if you experience: severe worsening pain, numbness below the injury, "
                   "pale/blue skin, fever, or visible deformity.",
        "doctor": "Always confirm AI predictions with a real doctor. See an orthopedic specialist for fractures, "
                  "or your primary care physician for general bone health.",
        "grad-cam": "Grad-CAM shows which regions of your X-ray influenced the model's prediction. "
                    "Warm colors (red/orange) highlight high-influence areas.",
    }

    for keywords, response in responses.items():
        if any(kw in lower for kw in keywords.split()):
            if prediction_context:
                return f"Based on your result ({prediction_context}):\n\n{response}"
            return response

    return "I can help with questions about your X-ray prediction, fracture detection, treatment, "
           "and bone health. Try asking about your prediction, healing times, warning signs, or "
           "when to see a doctor."


def main():
    st.set_page_config(page_title="Bone Fracture AI Detection", page_icon="🦴", layout="wide")

    st.title("🦴 AI-Powered Bone Fracture Detection")
    st.markdown("Upload an X-ray image to detect fractures using deep learning with Grad-CAM explainability "
                "and treatment plan guidance.")

    # ── Sidebar ──────────────────────────────────────────────
    st.sidebar.header("Settings")

    available_models = {
        k: v for k, v in MODEL_DISPLAY.items()
        if os.path.exists(MODEL_PATHS.get(k, ""))
    }

    if not available_models:
        st.warning("No trained models found. Please train the models first.")
        st.info("Run: `python -m src.train` then `python -m src.evaluate`")
        return

    model_key = st.sidebar.selectbox(
        "Select Model",
        options=list(available_models.keys()),
        format_func=lambda k: available_models[k],
    )

    # Default to DenseNet121 if available (best accuracy)
    if "DENSENET121" in available_models and model_key != "DENSENET121":
        if st.sidebar.checkbox("Use best model (DenseNet-121)"):
            model_key = "DENSENET121"

    st.sidebar.markdown("---")
    st.sidebar.markdown("**Class Mapping:**")
    st.sidebar.markdown(f"- Index 0 → **{CLASS_LABELS[0]}**")
    st.sidebar.markdown(f"- Index 1 → **{CLASS_LABELS[1]}** (positive)")

    threshold = get_threshold(model_key)
    st.sidebar.markdown(f"**Threshold:** {threshold:.2f}")

    # Dataset stats
    st.sidebar.markdown("---")
    st.sidebar.markdown("**Dataset Statistics:**")
    try:
        stats = get_dataset_statistics()
        for split, counts in stats.items():
            st.sidebar.markdown(
                f"**{split.title()}**: {counts.get('total', 0)} "
                f"({counts.get('non_fracture', 0)} NF / {counts.get('fracture', 0)} F)"
            )
    except Exception:
        st.sidebar.text("Dataset not found")

    # ── Tabs ─────────────────────────────────────────────────
    tab1, tab2, tab3, tab4, tab5 = st.tabs([
        "Prediction", "Grad-CAM", "AI Doctor", "Benchmark", "Dataset Info"
    ])

    model = load_model(model_key)

    # ── Tab 1: Prediction + Treatment Plan ──────────────────
    with tab1:
        col1, col2 = st.columns([1, 1])

        with col1:
            uploaded = st.file_uploader("Upload X-ray Image", type=["png", "jpg", "jpeg", "bmp"])

            if uploaded:
                img = Image.open(uploaded)
                st.image(img, caption="Uploaded X-ray", use_column_width=True)

                if st.button("Predict", type="primary"):
                    with st.spinner("Running inference..."):
                        tmp_path = os.path.join("/tmp", uploaded.name)
                        img.save(tmp_path)
                        result = predict_image(tmp_path, model_key=model_key)
                        if os.path.exists(tmp_path):
                            os.remove(tmp_path)

                    with col2:
                        st.markdown("### Prediction Result")
                        is_fracture = result["predicted_index"] == 1
                        color = "#ef4444" if is_fracture else "#22c55e"

                        st.markdown(
                            f"<div style='text-align:center; padding:2rem; "
                            f"background:{color}22; border-radius:12px; border:2px solid {color};'>"
                            f"<h2 style='color:{color}; margin:0;'>{result['predicted_class']}</h2>"
                            f"</div>",
                            unsafe_allow_html=True,
                        )

                        st.metric("Probability (Fracture)", f"{result['probability']:.4f}")
                        st.metric("Confidence", f"{result['confidence']:.4f}")
                        st.metric("Model", result["model_used"])
                        st.metric("Threshold", f"{result['threshold']:.2f}")

                    # Show treatment plan
                    show_treatment_plan(result["predicted_class"])

                    # Store context for AI Doctor
                    st.session_state["prediction_context"] = (
                        f"Predicted: {result['predicted_class']} "
                        f"(P={result['probability']:.4f}, Model={result['model_used']})"
                    )

        if not uploaded:
            with col2:
                st.info("Upload an X-ray image and click **Predict** to see results and treatment plan.")

    # ── Tab 2: Grad-CAM ─────────────────────────────────────
    with tab2:
        st.header("Grad-CAM Explainability")
        st.markdown("Upload an X-ray to see which regions influenced the model's prediction.")

        gradcam_upload = st.file_uploader("Upload X-ray for Grad-CAM", type=["png", "jpg", "jpeg", "bmp"],
                                          key="gradcam_upload")
        if gradcam_upload and model is not None:
            if st.button("Generate Grad-CAM"):
                with st.spinner("Computing Grad-CAM..."):
                    show_gradcam(model, gradcam_upload, model_key)
        elif gradcam_upload and model is None:
            st.error("Model not loaded. Please train a model first.")
        else:
            st.info("Upload an X-ray to generate the Grad-CAM heatmap.")

    # ── Tab 3: AI Doctor Consultation ───────────────────────
    with tab3:
        st.header("AI Doctor Consultation")
        st.warning("**Disclaimer:** This AI assistant provides general health information only. "
                   "Always consult a real healthcare professional.")

        prediction_ctx = st.session_state.get("prediction_context")
        if prediction_ctx:
            st.info(f"**Current prediction context:** {prediction_ctx}")

        # Initialize chat history
        if "chat_history" not in st.session_state:
            st.session_state["chat_history"] = []

        # Display chat history
        for msg in st.session_state["chat_history"]:
            with st.chat_message(msg["role"]):
                st.write(msg["content"])

        # Chat input
        user_input = st.chat_input("Ask about your prediction, symptoms, or bone health...")
        if user_input:
            st.session_state["chat_history"].append({"role": "user", "content": user_input})
            with st.chat_message("user"):
                st.write(user_input)

            response = ai_consultation_response(user_input, prediction_ctx)
            st.session_state["chat_history"].append({"role": "assistant", "content": response})
            with st.chat_message("assistant"):
                st.write(response)

    # ── Tab 4: Benchmark ────────────────────────────────────
    with tab4:
        benchmark = load_benchmark()
        if not benchmark:
            st.info("No benchmark results found. Run `python -m src.evaluate` first.")
        else:
            st.header("Model Comparison")
            cols = st.columns(len(benchmark))
            for i, (key, res) in enumerate(benchmark.items()):
                m = res["metrics"]
                with cols[i]:
                    st.subheader(res["model_name"])
                    st.metric("Accuracy", f"{m['accuracy']:.4f}")
                    st.metric("Precision", f"{m['precision']:.4f}")
                    st.metric("Recall", f"{m['recall']:.4f}")
                    st.metric("Specificity", f"{m['specificity']:.4f}")
                    st.metric("F1", f"{m['f1']:.4f}")
                    st.metric("AUC", f"{m['roc_auc']:.4f}")

            st.markdown("---")
            st.header("Confusion Matrices")
            for key, res in benchmark.items():
                cm_path = res.get("confusion_matrix_path", "")
                if cm_path and os.path.exists(cm_path):
                    st.image(cm_path, caption=res["model_name"], use_column_width=True)

    # ── Tab 5: Dataset Info ─────────────────────────────────
    with tab5:
        st.header("Dataset Information")
        try:
            stats = get_dataset_statistics()
            for split, counts in stats.items():
                st.subheader(f"{split.title()} Set")
                st.write(f"Total: {counts.get('total', 0)}")
                st.write(f"  Non-Fracture: {counts.get('non_fracture', 0)}")
                st.write(f"  Fracture: {counts.get('fracture', 0)}")
        except Exception as e:
            st.error(f"Could not load dataset info: {e}")


if __name__ == "__main__":
    main()
