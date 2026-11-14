# ML methodology

The risk service trains a scikit-learn RandomForestClassifier on 5,000 generated synthetic road-condition examples. Features: 24-hour rainfall, slope, recent incident count, traffic index, road-condition score, bridge vulnerability, forecast rainfall and elevation. The binary target is synthetic disruption likelihood generated from a transparent weighted risk process plus noise. Holdout metrics are useful only for validating the code path; they do not measure real-world forecasting accuracy.

The score is predicted probability multiplied by 100. The API separately overrides a segment to BLOCKED when its operational status is CLOSED. Production training requires trusted historic events, a time-based split, calibration, class-imbalance analysis, geography-aware validation, drift checks, threshold review and domain-expert validation. The CV adapter fails closed unless a reviewed TorchScript checkpoint is provided; officer verification remains mandatory.
