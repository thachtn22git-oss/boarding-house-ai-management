from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent
MODELS_DIR = BASE_DIR / "models"
DATASETS_DIR = PROJECT_ROOT / "datasets"
TEMPLATES_DIR = BASE_DIR / "templates"
STATIC_DIR = BASE_DIR / "static"

SENTIMENT_MODEL_PATH = MODELS_DIR / "sentiment_model.pkl"
CATEGORY_MODEL_PATH = MODELS_DIR / "category_model.pkl"
PRIORITY_MODEL_PATH = MODELS_DIR / "priority_model.pkl"
METRICS_PATH = MODELS_DIR / "metrics.json"

SERVICE_NAME = "boarding-house-ai-server"

ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:8081",
    "http://localhost:19006",
]
