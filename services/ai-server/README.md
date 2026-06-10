# Boarding House AI Server

Self-trained AI backend for boarding house feedback analysis. This service uses
Python, FastAPI, and scikit-learn. It does not call paid external AI APIs.

## Features

- Feedback sentiment analysis
- Feedback category classification
- Feedback priority suggestion
- Confidence scores for every prediction
- Local model training from a synthetic boarding house dataset

## Setup

```powershell
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

## Run Server

```powershell
uvicorn app.main:app --reload --port 8000
```

Open:

- Dashboard: `http://localhost:8000/dashboard`
- API docs: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/health`

## Dataset

The feedback dataset is synthetic and generated locally for boarding house and
apartment rental management scenarios. It uses concise, high-signal English
sentences with one issue per row. Labels are designed for boarding house tenant
feedback across electricity, water, internet, security, cleanliness,
maintenance, billing, and general requests.

The generated dataset contains 1200 rows with exactly 150 examples per category.
Models should be retrained after every dataset change.

No external AI API is used to generate or train the models.

Generate and check the dataset:

```powershell
python scripts/generate_feedback_dataset.py
python scripts/check_feedback_dataset.py
```

The generated dataset is written to:

- `datasets/feedback_dataset.csv`

Columns:

- `content`
- `sentiment`
- `category`
- `priority`

## Train Models

```powershell
python scripts/train_feedback_models.py
```

The training script reads `datasets/feedback_dataset.csv` and writes:

- `app/models/sentiment_model.pkl`
- `app/models/category_model.pkl`
- `app/models/priority_model.pkl`

Each model uses TF-IDF features and Logistic Regression. Training prints dataset
size, label distributions, accuracy, macro F1, and weighted F1.

## Evaluate Models

```powershell
python scripts/evaluate_feedback_models.py
python scripts/test_feedback_predictions.py
```

Evaluation prints:

- Accuracy
- Macro F1
- Weighted F1
- Classification report
- Confusion matrix
- Manual prediction examples

The prediction debug script prints labels and confidence values for manual
boarding house feedback examples.

## Dashboard and Charts

The AI server includes a simple web dashboard for thesis and demo presentations:

```text
http://localhost:8000/dashboard
```

The dashboard provides:

- A feedback prediction tester
- Model overview cards
- Dataset distribution charts
- Model performance charts from `app/models/metrics.json`
- Example prediction buttons for common feedback cases

The charts are loaded from the local API endpoints:

- `GET /api/model/info`
- `GET /api/model/dataset-stats`
- `GET /api/model/metrics`

## Full Local Workflow

```powershell
python scripts/generate_feedback_dataset.py
python scripts/check_feedback_dataset.py
python scripts/train_feedback_models.py
python scripts/evaluate_feedback_models.py
python scripts/test_feedback_predictions.py
```

## Test Feedback Analysis

```powershell
curl -X POST http://localhost:8000/api/feedback/analyze ^
  -H "Content-Type: application/json" ^
  -d "{\"content\":\"The Wi-Fi keeps disconnecting every few minutes.\"}"
```

Example response:

```json
{
  "content": "The Wi-Fi keeps disconnecting every few minutes.",
  "sentiment": "negative",
  "category": "internet",
  "priority": "medium",
  "summary": "This feedback appears to be negative, related to internet, and should be handled with medium priority.",
  "confidence": {
    "sentiment": 0.91,
    "category": 0.87,
    "priority": 0.72
  }
}
```
