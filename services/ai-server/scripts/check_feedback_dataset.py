from __future__ import annotations

from pathlib import Path

import pandas as pd


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATASET_PATH = PROJECT_ROOT / "datasets" / "feedback_dataset.csv"

EXPECTED_COLUMNS = ["content", "sentiment", "category", "priority"]
EXPECTED_LABELS = {
    "sentiment": {"positive", "neutral", "negative"},
    "category": {
        "electricity",
        "water",
        "internet",
        "security",
        "cleanliness",
        "maintenance",
        "billing",
        "other",
    },
    "priority": {"low", "medium", "high", "urgent"},
}


def print_distribution(dataset: pd.DataFrame, column: str) -> None:
    counts = dataset[column].value_counts().sort_index()
    percentages = dataset[column].value_counts(normalize=True).sort_index() * 100
    print(f"\n{column}:")
    for label, count in counts.items():
        print(f"  {label}: {count} ({percentages[label]:.2f}%)")


def main() -> None:
    if not DATASET_PATH.exists():
        raise FileNotFoundError(
            f"Dataset not found at {DATASET_PATH}. Run generate_feedback_dataset.py first."
        )

    dataset = pd.read_csv(DATASET_PATH)
    failures: list[str] = []
    warnings: list[str] = []

    print(f"Dataset path: {DATASET_PATH}")
    print(f"Dataset size: {len(dataset)}")

    missing_columns = [column for column in EXPECTED_COLUMNS if column not in dataset.columns]
    if missing_columns:
        failures.append(f"Missing columns: {', '.join(missing_columns)}")

    if len(dataset) < 1500:
        failures.append("Dataset must contain at least 1500 rows.")

    if dataset[EXPECTED_COLUMNS].isna().any().any():
        failures.append("Dataset contains missing values.")

    duplicate_rate = dataset["content"].duplicated().mean() * 100
    print(f"Duplicate content rate: {duplicate_rate:.2f}%")
    if duplicate_rate > 3:
        failures.append("Duplicate content rate is above 3%.")

    content_lengths = dataset["content"].astype(str).str.split().str.len()
    print(
        "Content length words: "
        f"min={content_lengths.min()}, "
        f"median={content_lengths.median():.1f}, "
        f"max={content_lengths.max()}"
    )

    for column, expected_labels in EXPECTED_LABELS.items():
        actual_labels = set(dataset[column].dropna().unique())
        missing_labels = sorted(expected_labels - actual_labels)
        unknown_labels = sorted(actual_labels - expected_labels)

        if missing_labels:
            failures.append(f"{column} missing labels: {', '.join(missing_labels)}")
        if unknown_labels:
            failures.append(f"{column} has unknown labels: {', '.join(unknown_labels)}")

        print_distribution(dataset, column)

    category_counts = dataset["category"].value_counts()
    for category in EXPECTED_LABELS["category"]:
        count = int(category_counts.get(category, 0))
        if count < 160:
            failures.append(f"Category {category} has fewer than 160 rows.")
        if count > 230:
            failures.append(f"Category {category} exceeds 230 rows.")

    sentiment_distribution = dataset["sentiment"].value_counts(normalize=True)
    priority_distribution = dataset["priority"].value_counts(normalize=True)

    targets = {
        "negative": (sentiment_distribution.get("negative", 0), 0.55),
        "neutral": (sentiment_distribution.get("neutral", 0), 0.25),
        "positive": (sentiment_distribution.get("positive", 0), 0.20),
        "low": (priority_distribution.get("low", 0), 0.20),
        "medium": (priority_distribution.get("medium", 0), 0.35),
        "high": (priority_distribution.get("high", 0), 0.30),
        "urgent": (priority_distribution.get("urgent", 0), 0.15),
    }
    for label, (actual, target) in targets.items():
        if abs(actual - target) > 0.08:
            warnings.append(
                f"{label} distribution is {actual * 100:.2f}%, target is around {target * 100:.0f}%."
            )

    if warnings:
        print("\nWarnings:")
        for warning in warnings:
            print(f"  - {warning}")
    else:
        print("\nNo major imbalance warnings.")

    if failures:
        print("\nFailures:")
        for failure in failures:
            print(f"  - {failure}")
        raise SystemExit(1)

    print("\nDataset check passed.")


if __name__ == "__main__":
    main()
