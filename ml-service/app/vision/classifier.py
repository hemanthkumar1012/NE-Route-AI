"""Optional MobileNetV3 inference adapter.

The repository intentionally ships without a trained incident-image checkpoint.
Install a reviewed TorchScript model at /app/artifacts/incident_mobilenetv3.pt and
install torch/torchvision before enabling inference. Otherwise the service fails
closed and requires officer verification.
"""
from pathlib import Path
import os

CHECKPOINT = Path(os.getenv("MODEL_ARTIFACT_DIR", str(Path(__file__).resolve().parents[2] / "artifacts"))) / "incident_mobilenetv3.pt"
LABELS = ["FLOOD", "LANDSLIDE", "DAMAGED_ROAD", "DAMAGED_BRIDGE", "FALLEN_TREE", "OTHER"]


def classify_image(image_bytes: bytes) -> dict:
    if not CHECKPOINT.exists():
        return {"model_ready": False, "status": "MODEL_NOT_CONFIGURED", "suggested_type": None,
                "confidence": None, "message": "No trained incident-image model checkpoint is installed. Human verification is required."}
    try:
        import io
        import torch
        from PIL import Image
        from torchvision import transforms
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        model = torch.jit.load(str(CHECKPOINT), map_location="cpu")
        model.eval()
        tensor = transforms.Compose([transforms.Resize((224, 224)), transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])])(image).unsqueeze(0)
        with torch.no_grad():
            probs = torch.softmax(model(tensor), dim=1)[0]
        score, index = torch.max(probs, dim=0)
        confidence = float(score.item())
        label = LABELS[int(index.item())] if int(index.item()) < len(LABELS) else "OTHER"
        return {"model_ready": True, "status": "SUGGESTED" if confidence >= 0.65 else "LOW_CONFIDENCE",
                "suggested_type": label if confidence >= 0.65 else None, "confidence": round(confidence, 4),
                "message": "Model suggestion only. Officer verification remains mandatory."}
    except Exception as exc:
        return {"model_ready": False, "status": "MODEL_LOAD_ERROR", "suggested_type": None,
                "confidence": None, "message": f"Vision model unavailable: {type(exc).__name__}. Human verification is required."}
