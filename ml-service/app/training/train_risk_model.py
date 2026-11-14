from pathlib import Path
import json
import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score
from sklearn.model_selection import train_test_split

FEATURES = ["rainfall_24h_mm", "slope_percent", "historical_incidents_30d", "traffic_index",
            "road_condition_score", "bridge_vulnerability", "forecast_rainfall_mm", "elevation_m"]


def generate_synthetic_dataset(n=5000, random_state=42):
    rng = np.random.default_rng(random_state)
    data = {
        "rainfall_24h_mm": rng.gamma(2.0, 30.0, n).clip(0, 300),
        "slope_percent": rng.uniform(0, 28, n),
        "historical_incidents_30d": rng.poisson(1.5, n).clip(0, 12),
        "traffic_index": rng.beta(2, 4, n),
        "road_condition_score": rng.beta(5, 2, n),
        "bridge_vulnerability": rng.beta(1.5, 5, n),
        "forecast_rainfall_mm": rng.gamma(1.8, 26.0, n).clip(0, 250),
        "elevation_m": rng.uniform(0, 2500, n),
    }
    raw = (
        0.25 * np.minimum(data["rainfall_24h_mm"] / 180, 1) +
        0.14 * np.minimum(data["forecast_rainfall_mm"] / 150, 1) +
        0.16 * np.minimum(data["slope_percent"] / 28, 1) +
        0.15 * np.minimum(data["historical_incidents_30d"] / 8, 1) +
        0.08 * data["traffic_index"] +
        0.12 * (1 - data["road_condition_score"]) +
        0.07 * data["bridge_vulnerability"] +
        0.03 * np.minimum(data["elevation_m"] / 2500, 1)
    )
    logits = (raw - 0.43) * 9 + rng.normal(0, 0.6, n)
    probability = 1 / (1 + np.exp(-logits))
    labels = (probability >= 0.5).astype(int)
    return data, labels


def train_and_save(output_dir: str):
    output = Path(output_dir)
    output.mkdir(parents=True, exist_ok=True)
    feature_data, y = generate_synthetic_dataset()
    # Keep the matrix column order identical to the inference feature contract.
    X = np.column_stack([feature_data[name] for name in FEATURES])
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    model = RandomForestClassifier(n_estimators=220, max_depth=12, min_samples_leaf=3,
                                   class_weight="balanced", random_state=42, n_jobs=-1)
    model.fit(X_train, y_train)
    predicted = model.predict(X_test)
    probabilities = model.predict_proba(X_test)[:, 1]
    metrics = {
        "accuracy": round(float(accuracy_score(y_test, predicted)), 4),
        "precision": round(float(precision_score(y_test, predicted, zero_division=0)), 4),
        "recall": round(float(recall_score(y_test, predicted, zero_division=0)), 4),
        "f1": round(float(f1_score(y_test, predicted, zero_division=0)), 4),
        "roc_auc": round(float(roc_auc_score(y_test, probabilities)), 4),
        "evaluation_data": "synthetic holdout; not evidence of real-world predictive performance",
    }
    joblib.dump(model, output / "risk_model.joblib")
    (output / "model_metadata.json").write_text(json.dumps({
        "model_name": "NE-Route Disruption Risk Random Forest", "version": "rf-synthetic-v1",
        "algorithm": "RandomForestClassifier", "features": FEATURES, "metrics": metrics,
        "training_data": "5000 generated synthetic NER-like road observations",
        "warning": "Synthetic training labels. Validate on authoritative, temporally separated incident and road data before operational use."
    }, indent=2))
    return model, metrics
