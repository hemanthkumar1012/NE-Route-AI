import json
from pathlib import Path
import sys

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.training.train_risk_model import FEATURES, generate_synthetic_dataset, train_and_save


def test_synthetic_generator_has_expected_features_and_both_classes():
    features, labels = generate_synthetic_dataset(n=512, random_state=19)
    assert list(features.keys()) == FEATURES
    assert all(len(values) == 512 for values in features.values())
    assert set(np.unique(labels).tolist()) == {0, 1}


def test_model_training_writes_artifacts_and_metrics(tmp_path):
    model, metrics = train_and_save(str(tmp_path))
    model_path = tmp_path / "risk_model.joblib"
    metadata_path = tmp_path / "model_metadata.json"
    assert model_path.is_file()
    assert metadata_path.is_file()
    metadata = json.loads(metadata_path.read_text())
    assert metadata["version"] == "rf-synthetic-v1"
    assert metadata["features"] == FEATURES
    for metric in ("accuracy", "precision", "recall", "f1", "roc_auc"):
        assert 0 <= metrics[metric] <= 1
    sample = np.array([[100, 15, 3, .4, .6, .5, 35, 110]], dtype=float)
    assert model.predict_proba(sample).shape == (1, 2)
