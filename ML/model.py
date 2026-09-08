import joblib
from pathlib import Path


MODEL_PATH = Path(__file__).parent.parent / "ML" / "models" / "crop_model.joblib"

model = joblib.load(MODEL_PATH)