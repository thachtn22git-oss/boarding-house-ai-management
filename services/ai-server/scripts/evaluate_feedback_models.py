from pathlib import Path
import sys


PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import joblib
import pandas as pd
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, f1_score
from sklearn.model_selection import train_test_split

from app.config import CATEGORY_MODEL_PATH, DATASETS_DIR, PRIORITY_MODEL_PATH, SENTIMENT_MODEL_PATH
from app.utils.text_preprocessing import clean_text


DATASET_PATH = DATASETS_DIR / "feedback_dataset.csv"
RANDOM_STATE = 42
TEST_SIZE = 0.2

MANUAL_EXAMPLES = [
    (
        "There are sparks from the power socket.",
        {
            "sentiment": "negative",
            "category": "electricity",
            "priority": "urgent",
        },
    ),
    (
        "The Wi-Fi is slow again tonight.",
        {
            "sentiment": "negative",
            "category": "internet",
            "priority": "medium",
        },
    ),
    (
        "Thank you for cleaning the hallway.",
        {
            "sentiment": "positive",
            "category": "cleanliness",
            "priority": "low",
        },
    ),
    (
        "I have a question about my rent invoice.",
        {
            "sentiment": "neutral",
            "category": "billing",
            "priority": "low or medium",
        },
    ),
    (
        "The door lock is broken and strangers can enter.",
        {
            "sentiment": "negative",
            "category": "security",
            "priority": "urgent",
        },
    ),
]


def evaluate_model(name: str, model_path, data: pd.DataFrame, target_column: str) -> None:
    if not model_path.exists():
        raise FileNotFoundError(
            f"{name} model was not found. Run scripts/train_feedback_models.py first."
        )

    model = joblib.load(model_path)
    _, test_data = train_test_split(
        data,
        test_size=TEST_SIZE,
        random_state=RANDOM_STATE,
        shuffle=True,
        stratify=data[target_column],
    )
    predictions = model.predict(test_data["clean_content"])

    print(f"\n{name.upper()} MODEL")
    print(f"Accuracy: {accuracy_score(test_data[target_column], predictions):.4f}")
    print(f"Macro F1: {f1_score(test_data[target_column], predictions, average='macro'):.4f}")
    print(f"Weighted F1: {f1_score(test_data[target_column], predictions, average='weighted'):.4f}")
    print("\nClassification report:")
    print(classification_report(test_data[target_column], predictions, zero_division=0))
    print("Confusion matrix:")
    labels = sorted(data[target_column].unique())
    print(f"Labels: {labels}")
    print(confusion_matrix(test_data[target_column], predictions, labels=labels))


def run_manual_examples() -> None:
    models = {
        "sentiment": joblib.load(SENTIMENT_MODEL_PATH),
        "category": joblib.load(CATEGORY_MODEL_PATH),
        "priority": joblib.load(PRIORITY_MODEL_PATH),
    }

    print("\nMANUAL EXAMPLES")
    for text, expected in MANUAL_EXAMPLES:
        cleaned_text = clean_text(text)
        print(f"\nText: {text}")
        for name, model in models.items():
            prediction = str(model.predict([cleaned_text])[0])
            print(f"  {name}: {prediction} (expected {expected[name]})")


def main() -> None:
    dataset = pd.read_csv(DATASET_PATH)
    dataset["clean_content"] = dataset["content"].apply(clean_text)

    evaluate_model("sentiment", SENTIMENT_MODEL_PATH, dataset, "sentiment")
    evaluate_model("category", CATEGORY_MODEL_PATH, dataset, "category")
    evaluate_model("priority", PRIORITY_MODEL_PATH, dataset, "priority")
    run_manual_examples()


if __name__ == "__main__":
    main()
