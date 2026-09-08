import pandas as pd

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.model import model
from app.schemas import (
    CropPredictionRequest,
    CropPredictionResponse,
)


app = FastAPI(
    title="Crop Recommendation API",
    description="ML API for recommending crops based on soil and weather conditions.",
    version="1.0.0",
)


# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "message": "Crop Recommendation API is running"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }


@app.post(
    "/predict",
    response_model=CropPredictionResponse,
)
def predict_crop(data: CropPredictionRequest):

    input_data = pd.DataFrame(
        [[
            data.N,
            data.P,
            data.K,
            data.temperature,
            data.humidity,
            data.ph,
            data.rainfall,
        ]],
        columns=[
            "N",
            "P",
            "K",
            "temperature",
            "humidity",
            "ph",
            "rainfall",
        ],
    )

    prediction = model.predict(input_data)[0]

    probabilities = model.predict_proba(input_data)[0]

    confidence = float(max(probabilities))

    return {
        "crop": prediction,
        "confidence": confidence,
    }