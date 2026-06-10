from pathlib import Path
import sys
import json
from datetime import datetime, timezone


PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import joblib
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, f1_score
from sklearn.multiclass import OneVsRestClassifier
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer

from app.config import (
    CATEGORY_MODEL_PATH,
    DATASETS_DIR,
    METRICS_PATH,
    MODELS_DIR,
    PRIORITY_MODEL_PATH,
    SENTIMENT_MODEL_PATH,
)
from app.utils.text_preprocessing import clean_text


DATASET_PATH = DATASETS_DIR / "feedback_dataset.csv"
RANDOM_STATE = 42
TEST_SIZE = 0.2


def create_pipeline() -> Pipeline:
    return Pipeline(
        steps=[
            (
                "tfidf",
                TfidfVectorizer(
                    ngram_range=(1, 2),
                    min_df=1,
                    max_df=0.95,
                    sublinear_tf=True,
                    strip_accents="unicode",
                ),
            ),
            (
                "classifier",
                OneVsRestClassifier(
                    LogisticRegression(
                        max_iter=2000,
                        class_weight="balanced",
                        random_state=RANDOM_STATE,
                        solver="liblinear",
                    ),
                ),
            ),
        ],
    )


def train_model(
    dataset: pd.DataFrame,
    target_column: str,
    model_path: Path,
) -> dict:
    train_data, test_data = train_test_split(
        dataset,
        test_size=TEST_SIZE,
        random_state=RANDOM_STATE,
        shuffle=True,
        stratify=dataset[target_column],
    )
    model = create_pipeline()

    model.fit(train_data["clean_content"], train_data[target_column])
    predictions = model.predict(test_data["clean_content"])
    accuracy = accuracy_score(test_data[target_column], predictions)
    macro_f1 = f1_score(test_data[target_column], predictions, average="macro")
    weighted_f1 = f1_score(test_data[target_column], predictions, average="weighted")

    final_model = create_pipeline()
    final_model.fit(dataset["clean_content"], dataset[target_column])
    joblib.dump(final_model, model_path)
    print(f"\n{target_column.upper()} MODEL")
    print(f"Train/test split: {len(train_data)} train / {len(test_data)} test")
    print(f"Accuracy: {accuracy:.4f}")
    print(f"Macro F1: {macro_f1:.4f}")
    print(f"Weighted F1: {weighted_f1:.4f}")
    print(f"Saved {target_column} model to {model_path}")
    return {
        "accuracy": round(float(accuracy), 4),
        "macro_f1": round(float(macro_f1), 4),
        "weighted_f1": round(float(weighted_f1), 4),
        "labels": sorted(dataset[target_column].dropna().unique().tolist()),
    }


def save_metrics(metrics: dict) -> None:
    metrics["updated_at"] = datetime.now(timezone.utc).isoformat()
    with METRICS_PATH.open("w", encoding="utf-8") as metrics_file:
        json.dump(metrics, metrics_file, indent=2)
    print(f"\nSaved metrics to {METRICS_PATH}")


def main() -> None:
    dataset = pd.read_csv(DATASET_PATH)
    dataset["clean_content"] = dataset["content"].apply(clean_text)

    print(f"Dataset size: {len(dataset)}")
    print("\nLabel distribution:")
    for column in ["sentiment", "category", "priority"]:
        print(f"\n{column}:")
        print(dataset[column].value_counts().sort_index())

    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    metrics = {
        "sentiment": train_model(dataset, "sentiment", SENTIMENT_MODEL_PATH),
        "category": train_model(dataset, "category", CATEGORY_MODEL_PATH),
        "priority": train_model(dataset, "priority", PRIORITY_MODEL_PATH),
    }
    save_metrics(metrics)


if __name__ == "__main__":
    main()
