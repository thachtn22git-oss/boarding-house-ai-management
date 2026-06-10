from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.config import ALLOWED_ORIGINS, SERVICE_NAME
from app.schemas import FeedbackAnalyzeRequest, FeedbackAnalyzeResponse, HealthResponse
from app.services.feedback_ai_service import analyze_feedback


app = FastAPI(
    title="Boarding House AI Server",
    description="Self-trained AI services for boarding house management.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def health_response() -> HealthResponse:
    return HealthResponse(status="ok", service=SERVICE_NAME)


@app.get("/", response_model=HealthResponse)
def root() -> HealthResponse:
    return health_response()


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return health_response()


@app.post("/api/feedback/analyze", response_model=FeedbackAnalyzeResponse)
def analyze_feedback_endpoint(
    payload: FeedbackAnalyzeRequest,
) -> FeedbackAnalyzeResponse:
    try:
        return analyze_feedback(payload.content)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except RuntimeError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
