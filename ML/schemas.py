from pydantic import BaseModel, Field


class CropPredictionRequest(BaseModel):
    N: float = Field(..., description="Nitrogen content in soil")
    P: float = Field(..., description="Phosphorus content in soil")
    K: float = Field(..., description="Potassium content in soil")
    temperature: float
    humidity: float
    ph: float
    rainfall: float


class CropPredictionResponse(BaseModel):
    crop: str
    confidence: float