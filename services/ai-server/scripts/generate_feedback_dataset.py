from __future__ import annotations

import csv
import random
import re
from pathlib import Path


random.seed(42)

PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATASET_PATH = PROJECT_ROOT / "datasets" / "feedback_dataset.csv"

CATEGORIES = [
    "electricity",
    "water",
    "internet",
    "security",
    "cleanliness",
    "maintenance",
    "billing",
    "other",
]

CATEGORY_QUOTA = 150

LABEL_QUOTAS = [
    ("positive", "low", 37),
    ("neutral", "low", 1),
    ("neutral", "medium", 37),
    ("negative", "medium", 15),
    ("negative", "high", 37),
    ("negative", "urgent", 23),
]

CONTEXTS = [
    "today",
    "this morning",
    "tonight",
    "again today",
    "in room A101",
    "in room A203",
    "near room B102",
    "on floor two",
    "near the hallway",
    "by the entrance",
    "after work",
    "before noon",
    "during the evening",
    "this week",
    "since yesterday",
    "near my room",
    "in the bathroom",
    "at the gate",
    "in the parking area",
    "near the stairs",
    "at night",
    "during class",
    "while studying",
    "before payment",
    "after cleaning",
    "near the kitchen",
    "in the laundry area",
    "on the third floor",
    "during the rain",
    "after moving in",
    "before checkout",
    "for my room",
    "for the hallway",
    "for the shared area",
    "near the meter",
    "beside the door",
    "at the window",
    "under the sink",
    "outside my room",
    "near the lobby",
]

EXACT_ANCHORS = [
    ("The room is very beautiful.", "positive", "other", "low"),
    ("The room is clean and bright.", "positive", "cleanliness", "low"),
    ("The room is comfortable.", "positive", "other", "low"),
    ("The room looks great.", "positive", "other", "low"),
    ("The room is quiet and nice.", "positive", "other", "low"),
    ("The Wi-Fi works very well.", "positive", "internet", "low"),
    ("The water pressure is good.", "positive", "water", "low"),
    ("The hallway light is bright.", "positive", "electricity", "low"),
    ("The camera works properly.", "positive", "security", "low"),
    ("The invoice is clear.", "positive", "billing", "low"),
    ("The invoice is clear and correct.", "positive", "billing", "low"),
    ("The air conditioner works well.", "positive", "maintenance", "low"),
    ("The Wi-Fi is very slow.", "negative", "internet", "medium"),
    ("There are sparks from the socket.", "negative", "electricity", "urgent"),
    ("The water pressure is weak.", "negative", "water", "medium"),
    ("The door lock is broken.", "negative", "security", "urgent"),
    ("I have a question about my invoice.", "neutral", "billing", "low"),
    ("The air conditioner is broken.", "negative", "maintenance", "high"),
    ("The hallway is dirty.", "negative", "cleanliness", "medium"),
]


DATA = {
    "electricity": {
        "positive": [
            "The hallway light is bright",
            "The power works well",
            "The socket works safely",
            "The voltage is stable",
            "The electric meter is clear",
            "The breaker works properly",
            "The room light is fixed",
            "The ceiling light is clean",
        ],
        "neutral_low": [
            "I have a question about power",
            "Please explain the electric meter",
            "I need the breaker location",
            "Can you check the light switch",
        ],
        "neutral_medium": [
            "Please check the blinking light",
            "Can you inspect the loose socket",
            "Please test the room voltage",
            "Can you review the electric meter",
            "Please check the hallway power",
            "Can you inspect the breaker",
        ],
        "negative_medium": [
            "The light is flickering",
            "The socket is loose",
            "The voltage is unstable",
            "The electric meter looks wrong",
            "The hallway light is broken",
        ],
        "negative_high": [
            "The power is out",
            "The breaker keeps tripping",
            "The room has no power",
            "The electric meter is broken",
            "The main light is broken",
            "The voltage keeps dropping",
        ],
        "negative_urgent": [
            "There are sparks from the socket",
            "The socket smells burnt",
            "The breaker is smoking",
            "The wire is exposed",
            "The outlet is sparking",
            "There is a fire risk",
        ],
    },
    "water": {
        "positive": [
            "The water pressure is good",
            "The shower works well",
            "The faucet is fixed",
            "The drain is clear",
            "The water is clean",
            "The pipe repair helped",
            "The bathroom water is stable",
            "The sink works well",
        ],
        "neutral_low": [
            "Please check the water meter",
            "I have a question about water",
            "Can you show the water bill",
            "Please confirm the shower schedule",
        ],
        "neutral_medium": [
            "Please inspect the weak pressure",
            "Can you check the slow drain",
            "Please review the water meter",
            "Can you inspect the faucet",
            "Please check the shower flow",
            "Can you check the water tank",
        ],
        "negative_medium": [
            "The water pressure is weak",
            "The drain is clogged",
            "The faucet is dripping",
            "The shower pressure is low",
            "The water smells strange",
        ],
        "negative_high": [
            "The pipe is leaking",
            "The bathroom has no water",
            "The drain is fully blocked",
            "The water is dirty",
            "The shower is broken",
            "The sink pipe is leaking",
        ],
        "negative_urgent": [
            "The room is flooding",
            "A pipe burst inside",
            "There is no water all day",
            "The ceiling is leaking water",
            "Water is flooding the hallway",
            "The bathroom floor is flooded",
        ],
    },
    "internet": {
        "positive": [
            "The Wi-Fi works very well",
            "The internet is fast",
            "The router works properly",
            "The network is stable",
            "The signal is strong",
            "The connection is reliable",
            "The Wi-Fi speed improved",
            "The router setup is clear",
        ],
        "neutral_low": [
            "I need the Wi-Fi password",
            "Please explain the internet plan",
            "Can you share the network name",
            "I have a question about Wi-Fi",
        ],
        "neutral_medium": [
            "Please check the weak signal",
            "Can you restart the router",
            "Please review the internet speed",
            "Can you inspect the network",
            "Please test the Wi-Fi connection",
            "Can you check the router light",
        ],
        "negative_medium": [
            "The Wi-Fi is very slow",
            "The signal is weak",
            "The connection keeps dropping",
            "The network is unstable",
            "The router is slow",
        ],
        "negative_high": [
            "The internet is down",
            "The router is broken",
            "There is no internet",
            "The network stopped working",
            "The Wi-Fi has no signal",
            "The connection fails completely",
        ],
        "negative_urgent": [
            "The router is overheating",
            "The internet cable is exposed",
            "The router smells burnt",
            "The network box is sparking",
            "The cable is dangerously damaged",
            "The router area feels unsafe",
        ],
    },
    "security": {
        "positive": [
            "The camera works properly",
            "The gate feels secure",
            "The lock works well",
            "The parking area feels safe",
            "The entrance light helps security",
            "The guard checked quickly",
            "The new lock is strong",
            "The camera view is clear",
        ],
        "neutral_low": [
            "I need a new gate key",
            "Please explain the parking rule",
            "I have a question about visitors",
            "Can you confirm camera coverage",
        ],
        "neutral_medium": [
            "Please check the gate lock",
            "Can you inspect the camera",
            "Please review parking safety",
            "Can you check the entrance gate",
            "Please inspect the room lock",
            "Can you test the security camera",
        ],
        "negative_medium": [
            "The gate lock is loose",
            "The camera view is blurry",
            "The parking area feels unsafe",
            "The room lock is weak",
            "Strangers wait near the gate",
        ],
        "negative_high": [
            "The camera is broken",
            "The gate lock is damaged",
            "The door lock is damaged",
            "The parking light is broken",
            "The entrance gate stays open",
            "The room key does not work",
        ],
        "negative_urgent": [
            "The door lock is broken",
            "Strangers can enter the building",
            "My item was stolen",
            "The gate lock is broken",
            "Someone forced the door",
            "The parking area is dangerous",
        ],
    },
    "cleanliness": {
        "positive": [
            "The room is clean and bright",
            "The hallway smells fresh today",
            "The bathroom is very clean",
            "The garbage area is tidy",
            "The kitchen is clean",
            "The hallway is spotless",
            "The shared bathroom looks clean",
            "The cleaning schedule works well",
        ],
        "neutral_low": [
            "Please share the cleaning schedule",
            "I have a question about cleaning",
            "Can you confirm garbage pickup",
            "Please explain bathroom cleaning times",
        ],
        "neutral_medium": [
            "Please clean the hallway",
            "Can you check the bathroom smell",
            "Please inspect the garbage area",
            "Can you remove the insects",
            "Please review the cleaning schedule",
            "Can you clean the shared bathroom",
        ],
        "negative_medium": [
            "The hallway is dirty",
            "The bathroom smells bad",
            "The garbage smell is strong",
            "There are insects inside",
            "The kitchen floor is dirty",
        ],
        "negative_high": [
            "The bathroom is unusable",
            "Mold is spreading",
            "The garbage area is overflowing",
            "The hallway smells terrible",
            "The shared bathroom is filthy",
            "Many insects are inside",
        ],
        "negative_urgent": [
            "The bathroom has sewage smell",
            "Mold is causing breathing problems",
            "Trash blocks the hallway",
            "Dirty water covers the bathroom",
            "Insects are entering rooms",
            "The toilet area is unsafe",
        ],
    },
    "maintenance": {
        "positive": [
            "The air conditioner works well",
            "The fan works properly",
            "The door repair looks good",
            "The wall looks fixed",
            "The ceiling repair helped",
            "The furniture is comfortable",
            "The window opens smoothly",
            "The room repair was quick",
        ],
        "neutral_low": [
            "Can you inspect the room fan",
            "Please check the door hinge",
            "I need furniture information",
            "Can you inspect the window",
        ],
        "neutral_medium": [
            "Please check the noisy fan",
            "Can you inspect the damaged wall",
            "Please review the ceiling stain",
            "Can you check the room door",
            "Please inspect the window frame",
            "Can you check the furniture",
        ],
        "negative_medium": [
            "The fan is noisy",
            "The door is hard to close",
            "The wall has cracks",
            "The window is stuck",
            "The furniture is loose",
        ],
        "negative_high": [
            "The air conditioner is broken",
            "The ceiling is leaking",
            "The door is damaged",
            "The fan stopped working",
            "The furniture is broken",
            "The window glass is cracked",
        ],
        "negative_urgent": [
            "The ceiling may collapse",
            "The fan is overheating",
            "The door is stuck shut",
            "The wall crack is dangerous",
            "The bed frame collapsed",
            "The ceiling leak reaches wires",
        ],
    },
    "billing": {
        "positive": [
            "The invoice is clear",
            "The invoice is clear and correct",
            "The rent receipt arrived quickly",
            "The payment record is correct",
            "The deposit details are clear",
            "The fee explanation is helpful",
            "The bill is easy to read",
            "The charge is correct",
        ],
        "neutral_low": [
            "I have a question about my invoice",
            "Please explain the rent payment",
            "Can you confirm my deposit",
            "I need a payment receipt",
        ],
        "neutral_medium": [
            "Please review the unclear invoice",
            "Can you check the rent charge",
            "Please explain the late fee",
            "Can you review the water charge",
            "Please check the payment status",
            "Can you explain this bill",
        ],
        "negative_medium": [
            "The invoice is unclear",
            "The rent charge seems wrong",
            "The late fee is confusing",
            "The bill has an extra fee",
            "The payment status is wrong",
        ],
        "negative_high": [
            "The invoice is incorrect",
            "The rent was charged twice",
            "The deposit amount is wrong",
            "The bill has a large error",
            "The payment was not recorded",
            "The fee was added incorrectly",
        ],
        "negative_urgent": [
            "The paid rent shows unpaid",
            "The duplicate rent charge is urgent",
            "The deposit issue blocks move out",
            "The payment error affects renewal",
            "The late fee notice is wrong",
            "The invoice error needs immediate review",
        ],
    },
    "other": {
        "positive": [
            "The room is very beautiful",
            "The room is comfortable",
            "The room looks great",
            "The room is quiet and nice",
            "The parking area is convenient",
            "The package service is helpful",
            "The move out guide is clear",
            "The roommate rule is fair",
        ],
        "neutral_low": [
            "I need information about parking",
            "I have a general question",
            "Please confirm package pickup",
            "Can you explain move out steps",
        ],
        "neutral_medium": [
            "Please check the parking space",
            "Can you review the noise issue",
            "Please confirm roommate rules",
            "Can you check package delivery",
            "Please explain move out timing",
            "Can you answer my general question",
        ],
        "negative_medium": [
            "The noise is disturbing",
            "The parking space is blocked",
            "My package is missing",
            "The roommate issue continues",
            "The move out process is unclear",
        ],
        "negative_high": [
            "The noise continues every night",
            "The parking gate is blocked",
            "My important package is missing",
            "The roommate conflict is serious",
            "Move out information is missing",
            "The general complaint was ignored",
        ],
        "negative_urgent": [
            "A roommate conflict feels unsafe",
            "A stranger is shouting inside",
            "A car blocks the emergency exit",
            "My valuable package was stolen",
            "The noise sounds dangerous",
            "The hallway disturbance is unsafe",
        ],
    },
}


def normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text.strip().lower())


def word_count(text: str) -> int:
    return len(re.findall(r"\b[\w'-]+\b", text))


def punctuate(text: str) -> str:
    return text if text.endswith((".", "?", "!")) else f"{text}."


def make_sentence(base: str, context: str | None) -> str:
    if context:
        return punctuate(f"{base} {context}")
    return punctuate(base)


def generate_bucket(
    category: str,
    sentiment: str,
    priority: str,
    count: int,
    used: set[str],
) -> list[dict[str, str]]:
    key = {
        ("positive", "low"): "positive",
        ("neutral", "low"): "neutral_low",
        ("neutral", "medium"): "neutral_medium",
        ("negative", "medium"): "negative_medium",
        ("negative", "high"): "negative_high",
        ("negative", "urgent"): "negative_urgent",
    }[(sentiment, priority)]
    phrases = DATA[category][key]
    rows: list[dict[str, str]] = []

    for phrase in phrases:
        candidate = make_sentence(phrase, None)
        normalized = normalize(candidate)
        if normalized not in used and 5 <= word_count(candidate) <= 16:
            rows.append(
                {
                    "content": candidate,
                    "sentiment": sentiment,
                    "category": category,
                    "priority": priority,
                }
            )
            used.add(normalized)
            if len(rows) == count:
                return rows

    for context in CONTEXTS:
        for phrase in phrases:
            candidate = make_sentence(phrase, context)
            normalized = normalize(candidate)
            if normalized in used:
                continue
            if not 5 <= word_count(candidate) <= 16:
                continue

            rows.append(
                {
                    "content": candidate,
                    "sentiment": sentiment,
                    "category": category,
                    "priority": priority,
                }
            )
            used.add(normalized)
            if len(rows) == count:
                return rows

    raise RuntimeError(
        f"Unable to generate {count} unique rows for {category} {sentiment} {priority}."
    )


def generate_rows() -> list[dict[str, str]]:
    used: set[str] = set()
    rows: list[dict[str, str]] = []

    for category in CATEGORIES:
        category_rows: list[dict[str, str]] = []
        for sentiment, priority, count in LABEL_QUOTAS:
            category_rows.extend(
                generate_bucket(category, sentiment, priority, count, used)
            )

        if len(category_rows) != CATEGORY_QUOTA:
            raise RuntimeError(f"{category} generated {len(category_rows)} rows.")
        rows.extend(category_rows)

    apply_exact_anchors(rows)

    if len(rows) != 1200:
        raise RuntimeError(f"Expected 1200 rows, generated {len(rows)} rows.")

    normalized_rows = [normalize(row["content"]) for row in rows]
    if len(normalized_rows) != len(set(normalized_rows)):
        raise RuntimeError("Duplicate content found before saving.")

    random.shuffle(rows)
    return rows


def apply_exact_anchors(rows: list[dict[str, str]]) -> None:
    used_indexes: set[int] = set()
    for content, sentiment, category, priority in EXACT_ANCHORS:
        normalized_content = normalize(content)
        existing_index = next(
            (
                index
                for index, row in enumerate(rows)
                if normalize(row["content"]) == normalized_content
                and row["sentiment"] == sentiment
                and row["category"] == category
                and row["priority"] == priority
            ),
            None,
        )
        if existing_index is not None:
            used_indexes.add(existing_index)
            continue

        for index, row in enumerate(rows):
            if index in used_indexes:
                continue
            if (
                row["sentiment"] == sentiment
                and row["category"] == category
                and row["priority"] == priority
            ):
                row["content"] = content
                used_indexes.add(index)
                break
        else:
            raise RuntimeError(f"Unable to add exact anchor: {content}")


def main() -> None:
    rows = generate_rows()
    DATASET_PATH.parent.mkdir(parents=True, exist_ok=True)

    with DATASET_PATH.open("w", newline="", encoding="utf-8") as csv_file:
        writer = csv.DictWriter(
            csv_file,
            fieldnames=["content", "sentiment", "category", "priority"],
        )
        writer.writeheader()
        writer.writerows(rows)

    print(f"Generated {len(rows)} clean feedback rows.")
    print(f"Saved dataset to {DATASET_PATH}")


if __name__ == "__main__":
    main()
