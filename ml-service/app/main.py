from pathlib import Path
from typing import Any
import os
import numpy as np
import joblib
from fastapi import FastAPI, File, HTTPException, UploadFile
from pydantic import BaseModel, Field
from app.training.train_risk_model import FEATURES, train_and_save

ARTIFACTS = Path(os.getenv("MODEL_ARTIFACT_DIR", "/app/artifacts"))
MODEL_PATH = ARTIFACTS / "risk_model.joblib"
META_PATH = ARTIFACTS / "model_metadata.json"
model = None
metadata: dict[str, Any] = {}

app = FastAPI(title="NE-Route AI ML Service", version="3.0.0")

@app.on_event("startup")
def load_model():
    global model, metadata
    ARTIFACTS.mkdir(parents=True, exist_ok=True)
    if not MODEL_PATH.exists():
        train_and_save(str(ARTIFACTS))
    model = joblib.load(MODEL_PATH)
    if META_PATH.exists():
        import json
        metadata = json.loads(META_PATH.read_text())

class RiskInput(BaseModel):
    features: dict[str, float] = Field(default_factory=dict)
    horizon_hours: int = Field(default=6, ge=1, le=72)

@app.get("/health")
def health():
    return {"status": "ok", "service": "ne-route-ml", "model_loaded": model is not None,
            "model_version": metadata.get("version", "unknown"), "training_data": "SYNTHETIC"}

@app.get("/model-info")
def model_info():
    return metadata

@app.post("/predict-risk")
def predict_risk(payload: RiskInput):
    if model is None:
        raise HTTPException(status_code=503, detail="Model is not loaded")
    missing = [name for name in FEATURES if name not in payload.features]
    if missing:
        raise HTTPException(status_code=422, detail={"missing_features": missing})
    values = np.array([[float(payload.features[name]) for name in FEATURES]], dtype=float)
    probability = float(model.predict_proba(values)[0][1])
    score = round(probability * 100)
    contributions = model.feature_importances_ * np.abs(values[0])
    top = sorted(zip(FEATURES, contributions), key=lambda x: x[1], reverse=True)[:4]
    return {"disruption_probability": round(probability, 4), "risk_score": score,
        "risk_level": "HIGH_RISK" if score >= 65 else "CAUTION" if score >= 35 else "SAFE",
        "top_drivers": [{"feature": name, "importance_weighted_value": round(float(value), 4)} for name, value in top],
        "model_version": metadata.get("version", "unknown"), "data_mode": "SYNTHETIC_MODEL_OUTPUT",
        "warning": "Model is trained on synthetic labels; output is not a validated real-world forecast."}

@app.post("/predict-batch")
def predict_batch(payload: list[RiskInput]):
    return {"count": len(payload), "results": [predict_risk(item) for item in payload]}

@app.post("/classify-incident")
async def classify_incident(file: UploadFile = File(...)):
    # Deliberately fail closed: a randomly initialized vision model must never be presented as classification.
    image_bytes = await file.read()
    if not image_bytes:
        return {"model_ready": False, "status": "NO_IMAGE", "suggested_type": None, "confidence": None}
    try:
        from PIL import Image
        import io
        image = Image.open(io.BytesIO(image_bytes))
        image.verify()
    except Exception:
        return {"model_ready": False, "status": "INVALID_IMAGE", "suggested_type": None, "confidence": None}
    from app.vision.classifier import classify_image
    return classify_image(image_bytes)
