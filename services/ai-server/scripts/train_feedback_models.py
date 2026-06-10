from pathlib import Path
import sys


PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import joblib
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer

from app.config import (
    CATEGORY_MODEL_PATH,
    DATASETS_DIR,
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
                    max_features=5000,
                ),
            ),
            (
                "classifier",
                LogisticRegression(
                    max_iter=1000,
                    class_weight="balanced",
                    random_state=RANDOM_STATE,
                ),
            ),
        ],
    )


def train_model(
    train_data: pd.DataFrame,
    test_data: pd.DataFrame,
    target_column: str,
    model_path: Path,
) -> None:
    model = create_pipeline()

    model.fit(train_data["clean_content"], train_data[target_column])
    predictions = model.predict(test_data["clean_content"])
    accuracy = accuracy_score(test_data[target_column], predictions)

    joblib.dump(model, model_path)
    print(f"{target_column} accuracy: {accuracy:.4f}")
    print(f"Saved {target_column} model to {model_path}")


def main() -> None:
    dataset = pd.read_csv(DATASET_PATH)
    dataset["clean_content"] = dataset["content"].apply(clean_text)

    print(f"Dataset size: {len(dataset)}")
    print("\nLabel distribution:")
    for column in ["sentiment", "category", "priority"]:
        print(f"\n{column}:")
        print(dataset[column].value_counts().sort_index())

    train_data, test_data = train_test_split(
        dataset,
        test_size=TEST_SIZE,
        random_state=RANDOM_STATE,
        shuffle=True,
    )

    print(f"\nTrain/test split: {len(train_data)} train / {len(test_data)} test")

    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    train_model(train_data, test_data, "sentiment", SENTIMENT_MODEL_PATH)
    train_model(train_data, test_data, "category", CATEGORY_MODEL_PATH)
    train_model(train_data, test_data, "priority", PRIORITY_MODEL_PATH)


if __name__ == "__main__":
    main()
