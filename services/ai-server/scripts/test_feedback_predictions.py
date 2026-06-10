from __future__ import annotations

from pathlib import Path
import sys
from typing import Any


PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import joblib

from app.config import CATEGORY_MODEL_PATH, PRIORITY_MODEL_PATH, SENTIMENT_MODEL_PATH
from app.utils.text_preprocessing import clean_text


TEST_CASES = [
    {
        "text": "The room is very beautiful.",
        "expected": "positive, other or cleanliness, low",
    },
    {
        "text": "The Wi-Fi is very slow.",
        "expected": "negative, internet, medium",
    },
    {
        "text": "There are sparks from the socket.",
        "expected": "negative, electricity, urgent",
    },
    {
        "text": "The water pressure is weak.",
        "expected": "negative, water, medium",
    },
    {
        "text": "The door lock is broken.",
        "expected": "negative, security, urgent",
    },
    {
        "text": "I have a question about my invoice.",
        "expected": "neutral, billing, low or medium",
    },
    {
        "text": "The air conditioner is broken.",
        "expected": "negative, maintenance, high",
    },
    {
        "text": "The hallway is dirty.",
        "expected": "negative, cleanliness, medium",
    },
    {
        "text": "The invoice is clear and correct.",
        "expected": "positive, billing, low",
    },
    {
        "text": "The camera works properly.",
        "expected": "positive, security, low",
    },
]


def load_models() -> dict[str, Any]:
    model_paths = {
        "sentiment": SENTIMENT_MODEL_PATH,
        "category": CATEGORY_MODEL_PATH,
        "priority": PRIORITY_MODEL_PATH,
    }
    missing = [name for name, path in model_paths.items() if not path.exists()]
    if missing:
        raise FileNotFoundError(
            f"Missing models: {', '.join(missing)}. Run train_feedback_models.py first."
        )

    return {name: joblib.load(path) for name, path in model_paths.items()}


def predict_with_confidence(model: Any, text: str) -> tuple[str, float]:
    label = str(model.predict([text])[0])
    if hasattr(model, "predict_proba"):
        probabilities = model.predict_proba([text])[0]
        confidence = float(max(probabilities))
    else:
        confidence = 0.0

    return label, round(confidence, 4)


def main() -> None:
    models = load_models()

    for index, test_case in enumerate(TEST_CASES, start=1):
        text = test_case["text"]
        cleaned_text = clean_text(text)
        print(f"\nTest case {index}")
        print(f"Input: {text}")
        print(f"Expected: {test_case['expected']}")
        for model_name, model in models.items():
            label, confidence = predict_with_confidence(model, cleaned_text)
            print(f"{model_name}: {label} ({confidence:.4f})")


if __name__ == "__main__":
    main()
