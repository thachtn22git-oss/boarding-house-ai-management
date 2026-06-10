from __future__ import annotations

import re
from pathlib import Path

import pandas as pd


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATASET_PATH = PROJECT_ROOT / "datasets" / "feedback_dataset.csv"

EXPECTED_COLUMNS = ["content", "sentiment", "category", "priority"]
EXPECTED_ROW_COUNT = 1200
EXPECTED_CATEGORY_COUNT = 150
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


def normalize(text: str) -> str:
    return re.sub(r"\s+", " ", str(text).strip().lower())


def word_count(text: str) -> int:
    return len(re.findall(r"\b[\w'-]+\b", str(text)))


def print_distribution(dataset: pd.DataFrame, column: str) -> None:
    counts = dataset[column].value_counts().sort_index()
    percentages = dataset[column].value_counts(normalize=True).sort_index() * 100
    print(f"\n{column}:")
    for label, count in counts.items():
        print(f"  {label}: {count} ({percentages[label]:.2f}%)")


def print_examples(dataset: pd.DataFrame) -> None:
    print("\nExamples by category:")
    for category in sorted(EXPECTED_LABELS["category"]):
        print(f"\n{category}:")
        examples = dataset[dataset["category"] == category]["content"].head(5)
        for example in examples:
            print(f"  - {example}")


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

    if len(dataset) != EXPECTED_ROW_COUNT:
        failures.append(f"Dataset must contain exactly {EXPECTED_ROW_COUNT} rows.")

    if dataset[EXPECTED_COLUMNS].isna().any().any():
        failures.append("Dataset contains missing values.")

    normalized_content = dataset["content"].map(normalize)
    duplicate_count = int(normalized_content.duplicated().sum())
    duplicate_rate = duplicate_count / max(len(dataset), 1) * 100
    print(f"Duplicate content count: {duplicate_count}")
    print(f"Duplicate content rate: {duplicate_rate:.2f}%")
    if duplicate_count > 0:
        warnings.append("Duplicate ratio is above 0%.")
        failures.append("Dataset contains duplicate content.")

    lengths = dataset["content"].map(word_count)
    print(
        "Content length words: "
        f"min={lengths.min()}, "
        f"median={lengths.median():.1f}, "
        f"max={lengths.max()}"
    )
    long_count = int((lengths > 20).sum())
    if long_count > 0:
        warnings.append(f"{long_count} sentences have more than 20 words.")

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
        if count != EXPECTED_CATEGORY_COUNT:
            failures.append(
                f"Category {category} must have {EXPECTED_CATEGORY_COUNT} rows, found {count}."
            )

    print_examples(dataset)

    if warnings:
        print("\nWarnings:")
        for warning in warnings:
            print(f"  - {warning}")
    else:
        print("\nNo dataset warnings.")

    if failures:
        print("\nFailures:")
        for failure in failures:
            print(f"  - {failure}")
        raise SystemExit(1)

    print("\nDataset check passed.")


if __name__ == "__main__":
    main()
