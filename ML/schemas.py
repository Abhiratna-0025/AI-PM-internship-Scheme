from pydantic import BaseModel, Field


class CropPredictionRequest(BaseModel):
    temperature: float
    humidity: float
    rainfall: float


class CropPredictionResponse(BaseModel):
    crop: str
    confidence: float