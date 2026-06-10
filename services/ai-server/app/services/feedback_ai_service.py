from functools import lru_cache
from typing import Any

import joblib

from app.config import CATEGORY_MODEL_PATH, PRIORITY_MODEL_PATH, SENTIMENT_MODEL_PATH
from app.schemas import FeedbackAnalyzeResponse, FeedbackConfidence
from app.utils.text_preprocessing import clean_text


MODEL_NOT_TRAINED_MESSAGE = (
    "AI models are not trained yet. Run scripts/train_feedback_models.py first."
)


def _load_model(path) -> Any:
    if not path.exists():
        raise RuntimeError(MODEL_NOT_TRAINED_MESSAGE)

    return joblib.load(path)


@lru_cache(maxsize=1)
def load_models() -> dict[str, Any]:
    return {
        "sentiment": _load_model(SENTIMENT_MODEL_PATH),
        "category": _load_model(CATEGORY_MODEL_PATH),
        "priority": _load_model(PRIORITY_MODEL_PATH),
    }


def _predict_label_and_confidence(model: Any, text: str) -> tuple[str, float]:
    label = str(model.predict([text])[0])

    if hasattr(model, "predict_proba"):
        probabilities = model.predict_proba([text])[0]
        confidence = float(max(probabilities))
    else:
        confidence = 0.0

    return label, round(confidence, 4)


def analyze_feedback(content: str) -> FeedbackAnalyzeResponse:
    cleaned_content = clean_text(content)

    if not cleaned_content:
        raise ValueError("Feedback content is required.")

    models = load_models()

    sentiment, sentiment_confidence = _predict_label_and_confidence(
        models["sentiment"],
        cleaned_content,
    )
    category, category_confidence = _predict_label_and_confidence(
        models["category"],
        cleaned_content,
    )
    priority, priority_confidence = _predict_label_and_confidence(
        models["priority"],
        cleaned_content,
    )
    summary = (
        f"Tenant feedback is classified as {sentiment}, related to {category}, "
        f"with {priority} priority."
    )

    return FeedbackAnalyzeResponse(
        content=content,
        sentiment=sentiment,
        category=category,
        priority=priority,
        summary=summary,
        confidence=FeedbackConfidence(
            sentiment=sentiment_confidence,
            category=category_confidence,
            priority=priority_confidence,
        ),
    )
