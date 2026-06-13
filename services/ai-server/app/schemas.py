from pydantic import BaseModel, Field


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
