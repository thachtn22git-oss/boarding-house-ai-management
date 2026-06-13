from functools import lru_cache
from typing import Any

import joblib

from app.config import CATEGORY_MODEL_PATH, PRIORITY_MODEL_PATH, SENTIMENT_MODEL_PATH
from app.schemas import FeedbackAnalyzeResponse, FeedbackConfidence
from app.utils.text_preprocessing import clean_text


MODEL_NOT_TRAINED_MESSAGE = (
    "AI models are not trained yet. Run scripts/train_feedback_models.py first."
)
LOW_CONFIDENCE_THRESHOLD = 0.55

RESOLUTION_RULES = [
    {
        "keywords": [
            "leak",
            "water",
            "pipe",
            "bathroom",
            "toilet",
            "door",
            "window",
            "broken",
            "repair",
        ],
        "resolution": "Inspect the reported issue and schedule maintenance as soon as possible. Verify the affected equipment and replace damaged parts if necessary.",
        "reply": "Thank you for reporting this issue. We will arrange maintenance staff to inspect and resolve it as soon as possible.",
    },
    {
        "keywords": ["wifi", "internet", "network", "signal", "slow internet"],
        "resolution": "Check router status, internet connection quality, and signal strength in the affected room. Restart networking equipment if necessary.",
        "reply": "Thank you for your feedback. We will inspect the network equipment and internet connection quality shortly.",
    },
    {
        "keywords": ["electricity", "power", "light", "socket", "switch"],
        "resolution": "Inspect electrical equipment and verify power supply stability. Schedule an electrician if required.",
        "reply": "Thank you for reporting this issue. We will inspect the electrical system and address the problem promptly.",
    },
    {
        "keywords": ["water pressure", "water supply", "no water", "dirty water"],
        "resolution": "Inspect water supply system and verify pressure levels. Check for blockage or service interruption.",
        "reply": "Thank you for informing us. We will inspect the water system and resolve the issue as soon as possible.",
    },
    {
        "keywords": ["noise", "loud", "party", "disturbing"],
        "resolution": "Review reported disturbance and contact involved tenants if necessary. Monitor repeated complaints.",
        "reply": "Thank you for your report. We will investigate the situation and take appropriate action.",
    },
    {
        "keywords": ["security", "theft", "suspicious", "unsafe"],
        "resolution": "Review security records, inspect relevant areas, and take immediate preventive measures.",
        "reply": "Thank you for reporting this concern. We take security seriously and will investigate immediately.",
    },
]

DEFAULT_RESOLUTION = "Review the feedback and determine appropriate action based on the reported issue."
DEFAULT_REPLY = "Thank you for your feedback. We will review the issue and follow up accordingly."


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


def _get_suggested_resolution(content: str) -> tuple[str, str]:
    normalized_content = content.lower()

    for rule in RESOLUTION_RULES:
        if any(keyword in normalized_content for keyword in rule["keywords"]):
            return rule["resolution"], rule["reply"]

    return DEFAULT_RESOLUTION, DEFAULT_REPLY


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
        f"This feedback appears to be {sentiment}, related to {category}, "
        f"and should be handled with {priority} priority."
    )
    if min(sentiment_confidence, category_confidence, priority_confidence) < LOW_CONFIDENCE_THRESHOLD:
        summary = f"{summary} Model confidence is low; manual review is recommended."
    suggested_resolution, suggested_reply = _get_suggested_resolution(content)

    return FeedbackAnalyzeResponse(
        content=content,
        sentiment=sentiment,
        category=category,
        priority=priority,
        summary=summary,
        suggested_resolution=suggested_resolution,
        suggested_reply=suggested_reply,
        confidence=FeedbackConfidence(
            sentiment=sentiment_confidence,
            category=category_confidence,
            priority=priority_confidence,
        ),
    )
