from __future__ import annotations

import csv
import random
from dataclasses import dataclass
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATASET_PATH = PROJECT_ROOT / "datasets" / "feedback_dataset.csv"
RANDOM_STATE = 42

CATEGORY_COUNTS = {
    "electricity": 188,
    "water": 188,
    "internet": 188,
    "security": 188,
    "cleanliness": 187,
    "maintenance": 187,
    "billing": 187,
    "other": 187,
}

LABEL_PLAN = [
    ("positive", "low", 300),
    ("neutral", "medium", 375),
    ("negative", "medium", 150),
    ("negative", "high", 450),
    ("negative", "urgent", 225),
]

ANCHOR_EXAMPLES = [
    {
        "content": "There are sparks from the power socket.",
        "sentiment": "negative",
        "category": "electricity",
        "priority": "urgent",
        "count": 18,
    },
    {
        "content": "The door lock is broken and strangers can enter.",
        "sentiment": "negative",
        "category": "security",
        "priority": "urgent",
        "count": 18,
    },
]

ROOMS = [
    "A101",
    "A102",
    "A203",
    "B101",
    "B102",
    "B205",
    "C301",
    "C304",
    "D110",
    "D212",
]

LOCATIONS = [
    "my room",
    "the hallway",
    "the shared bathroom",
    "the front gate",
    "the parking area",
    "the laundry area",
    "the staircase",
    "the kitchen area",
]

TIMES = [
    "this morning",
    "since last night",
    "for two days",
    "during the evening",
    "after the rain",
    "this week",
    "every weekend",
    "for several hours",
]

REQUESTS = [
    "Please check it when possible.",
    "Could the team inspect this today?",
    "Please let me know when someone can review it.",
    "I would appreciate an update from the owner.",
    "Can maintenance take a look and confirm the next step?",
    "Please help me resolve this issue.",
]


@dataclass(frozen=True)
class TopicSet:
    low_positive: list[str]
    medium_neutral: list[str]
    medium_negative: list[str]
    high_negative: list[str]
    urgent_negative: list[str]


TOPICS: dict[str, TopicSet] = {
    "electricity": TopicSet(
        low_positive=[
            "the hallway light was fixed quickly",
            "the new light bulb works well",
            "the electric meter reading was explained clearly",
            "the room lighting is much better now",
            "the power socket replacement was helpful",
            "the fan switch repair was handled well",
        ],
        medium_neutral=[
            "I want to ask about the electric meter reading",
            "one light in the corridor is blinking",
            "the room light sometimes turns off",
            "the power socket feels loose",
            "the voltage seems unstable at night",
            "I need clarification about electricity usage",
        ],
        medium_negative=[
            "the bedroom light keeps flickering",
            "the socket is damaged and hard to use",
            "the electric meter number looks incorrect",
            "the power keeps cutting for a few minutes",
            "the voltage drops when I use the air conditioner",
            "the hallway is too dark because several lights are broken",
        ],
        high_negative=[
            "there has been no power in my room for hours",
            "the voltage is unstable and my devices keep shutting down",
            "the main breaker trips repeatedly",
            "several lights are broken in the staircase",
            "the electric meter appears to be faulty",
            "the power outage has affected my work all day",
        ],
        urgent_negative=[
            "sparks are coming from the wall socket",
            "there are sparks from the power socket",
            "sparks from the power socket may cause a fire",
            "the outlet smells like burning plastic",
            "the electrical panel is making a buzzing sound",
            "there is a fire risk near the damaged socket",
            "smoke came from the power adapter area",
            "the exposed wire near the door is dangerous",
        ],
    ),
    "water": TopicSet(
        low_positive=[
            "the water pressure is better after the repair",
            "thank you for fixing the leaking faucet",
            "the water bill explanation was clear",
            "the drain cleaning helped a lot",
            "the bathroom water issue was handled quickly",
            "the new shower head works well",
        ],
        medium_neutral=[
            "I want to ask about this month's water bill",
            "the water pressure is weak in the morning",
            "the bathroom drain is slow",
            "the water color looks different today",
            "the faucet drips sometimes",
            "I need the latest water meter reading",
        ],
        medium_negative=[
            "the water pressure is very weak",
            "dirty water came from the faucet",
            "the shower drain is clogged again",
            "the sink keeps dripping at night",
            "the water bill seems higher than usual",
            "the pipe under the sink leaks slowly",
        ],
        high_negative=[
            "there is no water in my room for many hours",
            "a pipe leak is spreading water across the bathroom",
            "the drain is fully clogged and cannot be used",
            "the water is brown and smells bad",
            "the water tank seems empty again",
            "the leak near the shared bathroom is getting worse",
        ],
        urgent_negative=[
            "water is flooding the room from a broken pipe",
            "there has been no water since yesterday",
            "the ceiling is leaking water heavily",
            "the bathroom floor is flooded and unsafe",
            "a pipe burst near the hallway",
            "water is entering the electrical outlet area",
        ],
    ),
    "internet": TopicSet(
        low_positive=[
            "the Wi-Fi is much better after the router reset",
            "thank you for upgrading the internet speed",
            "the connection is stable now",
            "the new router location improved the signal",
            "the internet issue was fixed quickly",
            "the Wi-Fi password update was clear",
        ],
        medium_neutral=[
            "I want to ask about the Wi-Fi password",
            "I want to ask about the internet speed plan",
            "the connection drops during video calls",
            "the router light keeps blinking",
            "my laptop cannot connect to the network sometimes",
            "the signal is weak near my bed",
        ],
        medium_negative=[
            "the Wi-Fi keeps disconnecting every few minutes",
            "the Wi-Fi is slow again tonight",
            "the wifi is slow again at night",
            "the internet is too slow to study online",
            "the router often stops responding",
            "the network is unstable at night",
            "the connection drops whenever many tenants are online",
            "the signal is poor in my room",
        ],
        high_negative=[
            "there has been no internet for the whole day",
            "the router is not working after several restarts",
            "I cannot work because the internet has been down for hours",
            "the network outage has lasted since last night",
            "all devices in my room cannot connect",
            "the internet fails during every online meeting",
        ],
        urgent_negative=[
            "the internet outage is affecting an urgent online exam",
            "I cannot contact my family during an emergency because the network is down",
            "the router area smells burnt and the internet is down",
            "the network equipment is sparking near the hallway",
            "the internet cable is damaged and exposed",
            "the shared router is overheating badly",
        ],
    ),
    "security": TopicSet(
        low_positive=[
            "thank you for improving the gate lighting",
            "the parking area feels safer now",
            "the new lock works smoothly",
            "the security reminder was helpful",
            "the camera sign makes the entrance feel safer",
            "the staff checked the gate quickly",
        ],
        medium_neutral=[
            "I want to ask about parking access at night",
            "the gate sometimes stays open",
            "the camera near the entrance points away from the door",
            "I need a replacement key card",
            "the parking area is crowded in the evening",
            "the front door lock is hard to turn",
        ],
        medium_negative=[
            "the gate lock is loose",
            "strangers often stand near the gate",
            "the parking area feels unsafe at night",
            "the camera image is unclear",
            "the room door lock is difficult to close",
            "people keep entering without checking in",
        ],
        high_negative=[
            "the security camera is not working",
            "the front gate lock is broken",
            "someone tried to open my door last night",
            "the parking area has no working lights",
            "my package may have been taken from the lobby",
            "the entrance door does not close properly",
        ],
        urgent_negative=[
            "the door lock is broken and strangers can enter",
            "the room door lock is broken and strangers can enter",
            "strangers can enter because the door lock is broken",
            "my item was stolen from the parking area",
            "there is suspicious activity near the gate right now",
            "someone is trying to force the entrance door",
            "the room lock failed and I do not feel safe",
            "unknown people are entering the building late at night",
        ],
    ),
    "cleanliness": TopicSet(
        low_positive=[
            "thank you for cleaning the hallway",
            "the shared bathroom is cleaner this week",
            "the garbage area smells better now",
            "the new cleaning schedule is helpful",
            "the kitchen area looks tidy after cleaning",
            "the mold removal improved the room",
        ],
        medium_neutral=[
            "I want to ask about the cleaning schedule",
            "the hallway needs cleaning this week",
            "the shared bathroom has a smell",
            "garbage pickup seems delayed",
            "there are a few insects near the kitchen",
            "the laundry area floor is dirty",
        ],
        medium_negative=[
            "the bathroom has a bad smell and needs cleaning",
            "garbage smell is spreading into the hallway",
            "there are insects near the shared kitchen",
            "the hallway floor is dirty again",
            "mold is appearing near the bathroom wall",
            "the cleaning schedule is not being followed",
        ],
        high_negative=[
            "there are many insects in the shared bathroom",
            "mold is spreading across the wall",
            "the garbage area has a strong smell for days",
            "the shared kitchen is too dirty to use",
            "the hallway has standing dirty water",
            "the bathroom cleanliness is affecting tenant health",
        ],
        urgent_negative=[
            "sewage smell is very strong in the bathroom",
            "there is severe mold causing breathing discomfort",
            "many insects are coming into rooms from the drain",
            "trash is blocking the hallway and creating a safety risk",
            "dirty water from the bathroom is spreading outside",
            "the shared bathroom is unusable due to hygiene concerns",
        ],
    ),
    "maintenance": TopicSet(
        low_positive=[
            "thank you for fixing the broken fan",
            "the air conditioner works well after service",
            "the door repair was completed quickly",
            "the furniture replacement was helpful",
            "the wall crack repair looks good",
            "maintenance handled the request politely",
        ],
        medium_neutral=[
            "I want to request a fan inspection",
            "the door hinge makes noise",
            "the chair in my room is loose",
            "the air conditioner filter may need cleaning",
            "there is a small crack on the wall",
            "the ceiling has a small stain",
        ],
        medium_negative=[
            "the fan is noisy and shakes",
            "the door does not close smoothly",
            "the bed frame is damaged",
            "the air conditioner is not cold enough",
            "the wall crack is getting longer",
            "the wardrobe door is broken",
        ],
        high_negative=[
            "the air conditioner is broken and the room is too hot",
            "the ceiling leak is getting worse",
            "the door cannot be locked properly",
            "the furniture is damaged and unsafe",
            "the fan stopped working completely",
            "water from the ceiling is damaging the bed",
        ],
        urgent_negative=[
            "part of the ceiling looks like it may fall",
            "water is leaking through the ceiling near electrical items",
            "the door is stuck and I cannot leave the room easily",
            "the broken fan is overheating",
            "a large crack appeared in the wall suddenly",
            "the bed frame collapsed and caused an injury risk",
        ],
    ),
    "billing": TopicSet(
        low_positive=[
            "thank you for explaining the rent invoice clearly",
            "the deposit information was helpful",
            "the payment receipt arrived quickly",
            "the billing reminder was clear",
            "the invoice format is easier to understand now",
            "the rent payment confirmation was fast",
        ],
        medium_neutral=[
            "I have a question about my rent invoice",
            "I want to ask about my deposit refund",
            "please explain the electricity charge",
            "I need a copy of my payment receipt",
            "I want to confirm the payment due date",
            "there is a late fee line I do not understand",
        ],
        medium_negative=[
            "the invoice amount looks incorrect",
            "the electricity charge is unclear",
            "I may have been charged a duplicate fee",
            "the rent payment status has not updated",
            "the water charge seems higher than expected",
            "the deposit deduction is not clear",
        ],
        high_negative=[
            "there is a large billing error on my invoice",
            "I was charged twice for rent",
            "my deposit refund amount is much lower than expected",
            "the invoice includes fees I did not use",
            "the late fee was added even though I paid on time",
            "the electricity charge is much higher than the meter reading",
        ],
        urgent_negative=[
            "my account shows unpaid even after payment and I may lose access",
            "a serious duplicate rent charge needs immediate correction",
            "the invoice error may affect my contract renewal today",
            "I received an urgent late fee notice for a paid invoice",
            "the payment system marked my rent as missing incorrectly",
            "the deposit issue is blocking my move-out process today",
        ],
    ),
    "other": TopicSet(
        low_positive=[
            "thank you for helping with package delivery",
            "the move-out information was useful",
            "the parking arrangement worked well",
            "the owner answered my general question quickly",
            "the roommate guidance was helpful",
            "the quiet hours reminder improved the building",
        ],
        medium_neutral=[
            "I want to ask about parking availability",
            "I have a question about moving out",
            "a package was delivered for me",
            "I want to discuss a roommate issue",
            "please confirm the visitor policy",
            "I need general information about the boarding house",
        ],
        medium_negative=[
            "there is too much noise after quiet hours",
            "my roommate keeps leaving shared items outside",
            "parking spaces are often blocked",
            "my package delivery was misplaced",
            "the move-out process is unclear",
            "visitors are making noise late at night",
        ],
        high_negative=[
            "the noise complaint has continued for several nights",
            "a roommate conflict is affecting my safety",
            "my package with valuable items is missing",
            "parking access is blocked every evening",
            "the move-out issue needs urgent owner review",
            "repeated noise is preventing me from sleeping",
        ],
        urgent_negative=[
            "a roommate conflict is becoming unsafe",
            "there is a serious disturbance happening right now",
            "someone is blocking the emergency exit with parked vehicles",
            "a visitor is threatening tenants in the hallway",
            "my important package may have been stolen",
            "noise and shouting are creating a safety concern tonight",
        ],
    ),
}


def build_label_plan() -> list[tuple[str, str]]:
    labels: list[tuple[str, str]] = []
    for sentiment, priority, count in LABEL_PLAN:
        labels.extend([(sentiment, priority)] * count)
    return labels


def topic_for(category: str, sentiment: str, priority: str, row_index: int) -> str:
    topic_set = TOPICS[category]
    if sentiment == "positive":
        topics = topic_set.low_positive
    elif priority == "urgent":
        topics = topic_set.urgent_negative
    elif priority == "high":
        topics = topic_set.high_negative
    elif sentiment == "negative":
        topics = topic_set.medium_negative
    else:
        topics = topic_set.medium_neutral

    return topics[row_index % len(topics)]


def render_content(
    category: str,
    sentiment: str,
    priority: str,
    row_index: int,
    rng: random.Random,
) -> str:
    topic = topic_for(category, sentiment, priority, row_index)
    room = ROOMS[row_index % len(ROOMS)]
    location = LOCATIONS[(row_index + len(category)) % len(LOCATIONS)]
    time_text = TIMES[(row_index * 3) % len(TIMES)]
    request = REQUESTS[(row_index * 5) % len(REQUESTS)]
    reference = f"Room {room}"

    short_templates = [
        f"{topic.capitalize()} in {reference}.",
        f"{reference}: {topic}.",
        f"Please note that {topic} in {location}.",
    ]
    medium_templates = [
        f"{topic.capitalize()} in {reference} {time_text}. {request}",
        f"I noticed that {topic} around {location} {time_text}. {request}",
        f"{reference} has an issue: {topic}. It happens {time_text}.",
    ]
    long_templates = [
        (
            f"I am reporting this from {reference}. {topic.capitalize()} in "
            f"{location} {time_text}. It is affecting daily living, so {request.lower()}"
        ),
        (
            f"Hello, {topic} near {location} {time_text}. I checked again before "
            f"sending this message, and the problem is still present. {request}"
        ),
        (
            f"This is a follow-up for {reference}. {topic.capitalize()} {time_text}, "
            f"and it is becoming difficult to manage. {request}"
        ),
    ]

    if sentiment == "positive":
        templates = [
            f"{topic.capitalize()}. I appreciate the quick support for {reference}.",
            f"Thank you, {topic}. The service has been helpful for tenants.",
            f"{reference}: {topic}. I am satisfied with the response.",
        ]
    elif priority == "urgent":
        templates = [
            f"Urgent: {topic} in {reference} {time_text}. Please handle this immediately.",
            f"{topic.capitalize()} near {location}. I do not feel safe and need urgent help.",
            f"Emergency report from {reference}: {topic}. Please respond as soon as possible.",
        ]
    else:
        templates = short_templates + medium_templates + long_templates

    content = templates[rng.randrange(len(templates))]
    return f"{content} Tenant note {row_index:04d}."


def generate_rows() -> list[dict[str, str]]:
    rng = random.Random(RANDOM_STATE)
    labels = build_label_plan()
    rng.shuffle(labels)

    categories: list[str] = []
    for category, count in CATEGORY_COUNTS.items():
        categories.extend([category] * count)
    rng.shuffle(categories)

    rows: list[dict[str, str]] = []
    for row_index, (category, (sentiment, priority)) in enumerate(
        zip(categories, labels, strict=True),
        start=1,
    ):
        rows.append(
            {
                "content": render_content(category, sentiment, priority, row_index, rng),
                "sentiment": sentiment,
                "category": category,
                "priority": priority,
            }
        )

    apply_anchor_examples(rows)
    rng.shuffle(rows)
    return rows


def apply_anchor_examples(rows: list[dict[str, str]]) -> None:
    used_indexes: set[int] = set()
    for anchor in ANCHOR_EXAMPLES:
        replacements = 0
        for index, row in enumerate(rows):
            if index in used_indexes:
                continue
            if (
                row["sentiment"] == anchor["sentiment"]
                and row["category"] == anchor["category"]
                and row["priority"] == anchor["priority"]
            ):
                row["content"] = str(anchor["content"])
                used_indexes.add(index)
                replacements += 1
                if replacements >= int(anchor["count"]):
                    break

        if replacements < int(anchor["count"]):
            raise RuntimeError(
                f"Unable to place {anchor['count']} anchor examples for {anchor['content']}"
            )


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

    print(f"Generated {len(rows)} feedback rows.")
    print(f"Saved dataset to {DATASET_PATH}")


if __name__ == "__main__":
    main()
