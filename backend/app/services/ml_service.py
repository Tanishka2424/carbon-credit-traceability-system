import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import pickle
import os
from app.utils.baseline import EMISSION_FACTORS

# Auto-build encoding from EMISSION_FACTORS so it's always in sync with all 8 materials
MATERIAL_ENCODING = {mat: idx for idx, mat in enumerate(EMISSION_FACTORS.keys())}

class MLService:
    """
    Anomaly detection service using Isolation Forest.

    Features used:
      - reported_intensity   : reported_co2 / quantity  (t CO2 per t material)
      - baseline_intensity   : baseline_co2 / quantity  (expected t CO2 per t material)
      - ratio                : reported / baseline       (should be ~1.0 for honest reports)
      - material_encoded     : numeric encoding of material type

    Training data is synthetically generated from IPCC factors with
    realistic noise, plus injected fraud samples for model calibration.
    """

    MODEL_PATH = "app/models/isolation_forest.pkl"
    SCALER_PATH = "app/models/scaler.pkl"

    def __init__(self):
        self.model: IsolationForest = None
        self.scaler: StandardScaler = None
        self._load_or_train()

    def _generate_training_data(self) -> np.ndarray:
        np.random.seed(42)
        samples = []

        for material, ef_data in EMISSION_FACTORS.items():
            factor = ef_data["factor"]
            mat_code = MATERIAL_ENCODING[material]
            n_normal = 300

            # Normal submissions: reported within ±15% of baseline with Gaussian noise
            quantities = np.random.uniform(100, 50000, n_normal)
            noise = np.random.normal(1.0, 0.08, n_normal)
            noise = np.clip(noise, 0.75, 1.25)

            for i in range(n_normal):
                qty = quantities[i]
                baseline = qty * factor
                reported = baseline * noise[i]
                reported_intensity = reported / qty
                baseline_intensity = factor
                ratio = reported / baseline
                samples.append([reported_intensity, baseline_intensity, ratio, mat_code])

            # Fraud samples: drastically under-reported (ratio 0.1–0.4)
            n_fraud = 40
            quantities_f = np.random.uniform(100, 50000, n_fraud)
            fraud_ratios = np.random.uniform(0.1, 0.4, n_fraud)
            for i in range(n_fraud):
                qty = quantities_f[i]
                baseline = qty * factor
                reported = baseline * fraud_ratios[i]
                reported_intensity = reported / qty
                baseline_intensity = factor
                ratio = reported / baseline
                samples.append([reported_intensity, baseline_intensity, ratio, mat_code])

        return np.array(samples)

    def train(self):
        X = self._generate_training_data()

        self.scaler = StandardScaler()
        X_scaled = self.scaler.fit_transform(X)

        # contamination=0.1 means ~10% of data expected to be anomalous
        self.model = IsolationForest(
            n_estimators=200,
            contamination=0.10,
            max_samples="auto",
            random_state=42,
            n_jobs=-1,
        )
        self.model.fit(X_scaled)

        os.makedirs("app/models", exist_ok=True)
        with open(self.MODEL_PATH, "wb") as f:
            pickle.dump(self.model, f)
        with open(self.SCALER_PATH, "wb") as f:
            pickle.dump(self.scaler, f)

        print("ML model trained and saved.")

    def _load_or_train(self):
        if os.path.exists(self.MODEL_PATH) and os.path.exists(self.SCALER_PATH):
            with open(self.MODEL_PATH, "rb") as f:
                self.model = pickle.load(f)
            with open(self.SCALER_PATH, "rb") as f:
                self.scaler = pickle.load(f)
            print("ML model loaded from disk.")
        else:
            self.train()

    def predict(
        self,
        material: str,
        quantity_tonnes: float,
        reported_co2: float,
        baseline_co2: float,
    ) -> dict:
        mat_code = MATERIAL_ENCODING.get(material.lower(), 0)
        reported_intensity = reported_co2 / quantity_tonnes
        baseline_intensity = baseline_co2 / quantity_tonnes
        ratio = reported_co2 / baseline_co2 if baseline_co2 > 0 else 0

        X = np.array([[reported_intensity, baseline_intensity, ratio, mat_code]])
        X_scaled = self.scaler.transform(X)

        prediction = self.model.predict(X_scaled)[0]       # 1 = normal, -1 = anomaly
        raw_score = self.model.decision_function(X_scaled)[0]

        # Normalise raw score to a 0-1 confidence value
        # More negative = more anomalous
        confidence = float(np.clip((raw_score + 0.5) / 1.0, 0.0, 1.0))
        is_anomaly = bool(prediction == -1)

        return {
            "anomaly_score": round(float(raw_score), 4),
            "is_anomaly": is_anomaly,
            "confidence": round(confidence, 4),
            "verdict": "SUSPICIOUS" if is_anomaly else "NORMAL",
        }
