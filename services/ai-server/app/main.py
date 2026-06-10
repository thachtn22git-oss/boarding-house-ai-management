import json

import pandas as pd
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from app.config import (
    ALLOWED_ORIGINS,
    CATEGORY_MODEL_PATH,
    DATASETS_DIR,
    METRICS_PATH,
    PRIORITY_MODEL_PATH,
    SENTIMENT_MODEL_PATH,
    SERVICE_NAME,
    STATIC_DIR,
    TEMPLATES_DIR,
)
from app.schemas import FeedbackAnalyzeRequest, FeedbackAnalyzeResponse, HealthResponse
from app.services.feedback_ai_service import analyze_feedback

DATASET_PATH = DATASETS_DIR / "feedback_dataset.csv"


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

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
templates = Jinja2Templates(directory=TEMPLATES_DIR)


def health_response() -> HealthResponse:
    return HealthResponse(status="ok", service=SERVICE_NAME)


def load_dataset() -> pd.DataFrame:
    if not DATASET_PATH.exists():
        raise HTTPException(status_code=404, detail="Dataset file was not found.")

    return pd.read_csv(DATASET_PATH)


def distribution(dataset: pd.DataFrame, column: str) -> dict[str, int]:
    return {
        str(label): int(count)
        for label, count in dataset[column].value_counts().sort_index().items()
    }


@app.get("/", response_class=HTMLResponse)
def root(request: Request) -> HTMLResponse:
    return templates.TemplateResponse(request, "dashboard.html", {"landing": True})


@app.get("/dashboard", response_class=HTMLResponse)
def dashboard(request: Request) -> HTMLResponse:
    return templates.TemplateResponse(request, "dashboard.html", {"landing": False})


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return health_response()


@app.get("/api/model/info")
def model_info() -> dict:
    dataset = load_dataset()
    model_paths = {
        "sentiment": SENTIMENT_MODEL_PATH,
        "category": CATEGORY_MODEL_PATH,
        "priority": PRIORITY_MODEL_PATH,
    }

    return {
        "model_type": "TF-IDF + Logistic Regression",
        "tasks": ["sentiment", "category", "priority"],
        "dataset_path": "datasets/feedback_dataset.csv",
        "dataset_size": int(len(dataset)),
        "labels": {
            "sentiment": sorted(dataset["sentiment"].dropna().unique().tolist()),
            "category": sorted(dataset["category"].dropna().unique().tolist()),
            "priority": sorted(dataset["priority"].dropna().unique().tolist()),
        },
        "models": {
            name: {
                "path": str(path.relative_to(DATASETS_DIR.parent)),
                "exists": path.exists(),
            }
            for name, path in model_paths.items()
        },
    }


@app.get("/api/model/dataset-stats")
def dataset_stats() -> dict:
    dataset = load_dataset()

    return {
        "total_rows": int(len(dataset)),
        "sentiment_distribution": distribution(dataset, "sentiment"),
        "category_distribution": distribution(dataset, "category"),
        "priority_distribution": distribution(dataset, "priority"),
        "sample_rows": dataset.head(10).to_dict(orient="records"),
    }


@app.get("/api/model/metrics")
def model_metrics() -> dict:
    if not METRICS_PATH.exists():
        return {
            "message": "Metrics are not available. Please train or evaluate the models first."
        }

    with METRICS_PATH.open("r", encoding="utf-8") as metrics_file:
        return json.load(metrics_file)


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
