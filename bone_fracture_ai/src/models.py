import os
import tensorflow as tf
from tensorflow.keras import layers, models

from src.config import (
    INPUT_SHAPE, LEARNING_RATE, DROPOUT_RATE,
    BEST_MODEL_PATH, CUSTOM_CNN_PATH,
)


def build_custom_cnn(input_shape=INPUT_SHAPE, dropout_rate=DROPOUT_RATE, name="Custom_CNN_Fracture"):
    """Custom CNN: 5 Conv blocks (32→64→128→256→256) + GAP + Dense(512) + Dense(256) + sigmoid.
    Deeper than v1 for better feature extraction from X-ray images."""
    inputs = layers.Input(shape=input_shape, name="xray_input")

    x = layers.Conv2D(32, (3, 3), padding="same", activation="relu", name="conv2d_1")(inputs)
    x = layers.BatchNormalization(name="bn_1")(x)
    x = layers.Conv2D(32, (3, 3), padding="same", activation="relu", name="conv2d_1b")(x)
    x = layers.BatchNormalization(name="bn_1b")(x)
    x = layers.MaxPooling2D(pool_size=(2, 2), name="maxpool_1")(x)

    x = layers.Conv2D(64, (3, 3), padding="same", activation="relu", name="conv2d_2")(x)
    x = layers.BatchNormalization(name="bn_2")(x)
    x = layers.MaxPooling2D(pool_size=(2, 2), name="maxpool_2")(x)

    x = layers.Conv2D(128, (3, 3), padding="same", activation="relu", name="conv2d_3")(x)
    x = layers.BatchNormalization(name="bn_3")(x)
    x = layers.MaxPooling2D(pool_size=(2, 2), name="maxpool_3")(x)

    x = layers.Conv2D(256, (3, 3), padding="same", activation="relu", name="conv2d_4")(x)
    x = layers.BatchNormalization(name="bn_4")(x)
    x = layers.MaxPooling2D(pool_size=(2, 2), name="maxpool_4")(x)

    x = layers.Conv2D(256, (3, 3), padding="same", activation="relu", name="last_conv_layer")(x)
    x = layers.BatchNormalization(name="bn_5")(x)
    x = layers.MaxPooling2D(pool_size=(2, 2), name="maxpool_5")(x)

    x = layers.GlobalAveragePooling2D(name="global_avg_pool")(x)
    x = layers.Dense(512, activation="relu", name="dense_512")(x)
    x = layers.BatchNormalization(name="bn_dense")(x)
    x = layers.Dropout(dropout_rate, name="dropout_1")(x)
    x = layers.Dense(256, activation="relu", name="dense_256")(x)
    x = layers.Dropout(dropout_rate, name="dropout_2")(x)
    outputs = layers.Dense(1, activation="sigmoid", name="prediction_probability")(x)

    return models.Model(inputs=inputs, outputs=outputs, name=name)


def build_vit_model(input_shape=INPUT_SHAPE):
    """Lightweight Vision Transformer with 2 transformer blocks."""
    inputs = layers.Input(shape=input_shape)

    x = layers.Conv2D(64, kernel_size=16, strides=16, padding="valid")(inputs)
    x = layers.Reshape((-1, 64))(x)

    for i in range(2):
        attention = layers.MultiHeadAttention(num_heads=4, key_dim=16)(x, x)
        x = layers.Add()([x, attention])
        x = layers.LayerNormalization()(x)
        ff = layers.Dense(128, activation="gelu")(x)
        ff = layers.Dense(64)(ff)
        x = layers.Add()([x, ff])
        x = layers.LayerNormalization()(x)

    x = layers.GlobalAveragePooling1D()(x)
    x = layers.Dense(128, activation="relu")(x)
    x = layers.Dropout(0.4)(x)
    outputs = layers.Dense(1, activation="sigmoid")(x)

    return models.Model(inputs, outputs, name="ViT")


def build_swin_model(input_shape=INPUT_SHAPE):
    """Simplified Swin-style transformer with 2 attention blocks."""
    inputs = layers.Input(shape=input_shape)

    x = layers.Conv2D(64, kernel_size=4, strides=4, padding="same")(inputs)
    x = layers.BatchNormalization()(x)
    x = layers.Activation("relu")(x)

    x = layers.Conv2D(128, kernel_size=7, padding="same")(x)
    x = layers.BatchNormalization()(x)
    x = layers.Activation("relu")(x)

    x_seq = layers.Reshape((-1, 128))(x)
    for i in range(2):
        attention = layers.MultiHeadAttention(num_heads=4, key_dim=32)
        attn_output = attention(x_seq, x_seq)
        x_seq = layers.Add()([x_seq, attn_output])
        x_seq = layers.LayerNormalization()(x_seq)

    x = layers.GlobalAveragePooling1D()(x_seq)
    x = layers.Dense(128, activation="relu")(x)
    x = layers.Dropout(0.4)(x)
    outputs = layers.Dense(1, activation="sigmoid")(x)

    return models.Model(inputs, outputs, name="Swin")


def build_transfer_learning_model(base_arch="resnet50", input_shape=INPUT_SHAPE, dropout_rate=DROPOUT_RATE):
    """Transfer learning: ResNet50 / DenseNet121 / VGG16 / MobileNetV2 with ImageNet weights."""
    inputs = layers.Input(shape=input_shape)

    arch = base_arch.lower()
    if arch == "resnet50":
        base_model = tf.keras.applications.ResNet50(
            weights="imagenet", include_top=False, input_tensor=inputs)
        freeze_until = -10
    elif arch == "densenet121":
        base_model = tf.keras.applications.DenseNet121(
            weights="imagenet", include_top=False, input_tensor=inputs)
        freeze_until = -20
    elif arch == "vgg16":
        base_model = tf.keras.applications.VGG16(
            weights="imagenet", include_top=False, input_tensor=inputs)
        freeze_until = -4
    elif arch == "mobilenetv2":
        base_model = tf.keras.applications.MobileNetV2(
            weights="imagenet", include_top=False, input_tensor=inputs)
        freeze_until = -10
    else:
        raise ValueError(f"Unsupported architecture: {base_arch}")

    base_model.trainable = False

    x = base_model.output
    x = layers.GlobalAveragePooling2D()(x)
    x = layers.Dense(512, activation="relu")(x)
    x = layers.BatchNormalization()(x)
    x = layers.Dropout(dropout_rate)(x)
    x = layers.Dense(256, activation="relu")(x)
    x = layers.Dropout(dropout_rate)(x)
    outputs = layers.Dense(1, activation="sigmoid")(x)

    model = models.Model(inputs=inputs, outputs=outputs, name=f"Transfer_{base_arch}")
    model._freeze_until = freeze_until  # store for fine-tuning phase
    return model


def compile_model(model, learning_rate=LEARNING_RATE):
    """Compile with Adam + BinaryCrossentropy + Accuracy/Precision/Recall/AUC."""
    optimizer = tf.keras.optimizers.Adam(learning_rate=learning_rate)
    loss = tf.keras.losses.BinaryCrossentropy()
    metrics = [
        "accuracy",
        tf.keras.metrics.Precision(name="precision"),
        tf.keras.metrics.Recall(name="recall"),
        tf.keras.metrics.AUC(name="auc"),
    ]
    model.compile(optimizer=optimizer, loss=loss, metrics=metrics)
    return model


def unfreeze_top_layers(model, freeze_until=-10, learning_rate=1e-5):
    """Unfreeze the top N layers of a transfer learning model for fine-tuning."""
    base = None
    for layer in model.layers:
        if hasattr(layer, 'layers') and len(layer.layers) > 10:
            base = layer
            break

    if base is None:
        # Find the base model by name pattern
        for layer in model.layers:
            if "resnet" in layer.name.lower() or "densenet" in layer.name.lower() or "vgg" in layer.name.lower() or "mobilenet" in layer.name.lower():
                base = layer
                break

    if base is not None:
        base.trainable = True
        for layer in base.layers[:freeze_until]:
            layer.trainable = False
        print(f"[INFO] Fine-tuning: unfroze top {abs(freeze_until)} layers of {base.name}")
    else:
        print("[WARN] Could not find base model for fine-tuning. Training all layers.")
        for layer in model.layers:
            layer.trainable = True

    compile_model(model, learning_rate=learning_rate)
    return model


def load_or_create_model(model_path=BEST_MODEL_PATH):
    """Load trained model if available, otherwise return fresh compiled Custom CNN."""
    if model_path and os.path.exists(model_path):
        try:
            model = tf.keras.models.load_model(model_path)
            print(f"[INFO] Loaded model from {model_path}")
            return model
        except Exception as e:
            print(f"[WARNING] Error loading {model_path}: {e}. Creating fresh model.")
    model = build_custom_cnn()
    compile_model(model)
    return model
