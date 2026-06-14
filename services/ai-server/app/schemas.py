from pydantic import BaseModel, Field
from typing import Literal


class FeedbackAnalyzeRequest(BaseModel):
    content: str = Field(..., min_length=1)


class FeedbackConfidence(BaseModel):
    sentiment: float
    category: float
    priority: float


class FeedbackAnalyzeResponse(BaseModel):
    content: str
    sentiment: str
    category: str
    priority: str
    summary: str
    suggested_resolution: str
    suggested_reply: str
    confidence: FeedbackConfidence


class HealthResponse(BaseModel):
    status: str
    service: str


class MeterReadingNormalizedROI(BaseModel):
    xRatio: float
    yRatio: float
    widthRatio: float
    heightRatio: float


class MeterReadingScaledROI(BaseModel):
    x: int
    y: int
    width: int
    height: int


class MeterReadingOCRResponse(BaseModel):
    meter_type: Literal["electricity", "water"]
    raw_text: str
    detected_reading: float
    confidence: float
    cropped_preview_base64: str | None = None
    roi_used: bool
    roi_used_normalized: MeterReadingNormalizedROI | None = None
    scaled_roi: MeterReadingScaledROI | None = None
    message: str
