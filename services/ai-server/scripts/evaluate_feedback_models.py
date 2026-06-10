from pathlib import Path
import sys


PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import joblib
import pandas as pd
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix

from app.config import CATEGORY_MODEL_PATH, DATASETS_DIR, PRIORITY_MODEL_PATH, SENTIMENT_MODEL_PATH
from app.utils.text_preprocessing import clean_text


DATASET_PATH = DATASETS_DIR / "feedback_dataset.csv"


def evaluate_model(name: str, model_path, data: pd.DataFrame, target_column: str) -> None:
    if not model_path.exists():
        raise FileNotFoundError(
            f"{name} model was not found. Run scripts/train_feedback_models.py first."
        )

    model = joblib.load(model_path)
    predictions = model.predict(data["clean_content"])

    print(f"\n{name.upper()} MODEL")
    print(f"Accuracy: {accuracy_score(data[target_column], predictions):.4f}")
    print("\nClassification report:")
    print(classification_report(data[target_column], predictions, zero_division=0))
    print("Confusion matrix:")
    print(confusion_matrix(data[target_column], predictions))


def main() -> None:
    dataset = pd.read_csv(DATASET_PATH)
    dataset["clean_content"] = dataset["content"].apply(clean_text)

    evaluate_model("sentiment", SENTIMENT_MODEL_PATH, dataset, "sentiment")
    evaluate_model("category", CATEGORY_MODEL_PATH, dataset, "category")
    evaluate_model("priority", PRIORITY_MODEL_PATH, dataset, "priority")


if __name__ == "__main__":
    main()
