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


EXAMPLES = [
    "There are sparks from the power socket.",
    "The Wi-Fi is slow again tonight.",
    "Thank you for cleaning the hallway.",
    "I have a question about my rent invoice.",
    "The door lock is broken and strangers can enter.",
    "Water pressure is very weak in the morning.",
    "The bathroom has a bad smell and needs cleaning.",
    "My air conditioner has stopped working completely.",
    "I was charged twice for rent this month.",
    "The security camera near the entrance is not working.",
    "The hallway light was fixed quickly, thank you.",
    "Dirty water is coming from the faucet.",
    "My package delivery was misplaced.",
    "There is mold spreading on the bathroom wall.",
    "The internet has been down for the whole day.",
    "I want to ask about my deposit refund.",
    "The ceiling is leaking water near my bed.",
    "The parking area feels unsafe at night.",
    "The payment receipt arrived quickly.",
    "Someone is trying to force the entrance door.",
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

    for index, text in enumerate(EXAMPLES, start=1):
        cleaned_text = clean_text(text)
        print(f"\nExample {index}")
        print(f"Text: {text}")
        for model_name, model in models.items():
            label, confidence = predict_with_confidence(model, cleaned_text)
            print(f"{model_name}: {label} ({confidence:.4f})")


if __name__ == "__main__":
    main()
