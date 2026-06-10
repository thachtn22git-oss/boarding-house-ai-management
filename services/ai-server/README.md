# Boarding House AI Server

Self-trained AI backend for boarding house feedback analysis. This service uses
Python, FastAPI, and scikit-learn. It does not call paid external AI APIs.

## Features

- Feedback sentiment analysis
- Feedback category classification
- Feedback priority suggestion

## Setup

```powershell
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

## Train Models

```powershell
python scripts/train_feedback_models.py
```

The training script reads `datasets/feedback_dataset.csv` and writes:

- `app/models/sentiment_model.pkl`
- `app/models/category_model.pkl`
- `app/models/priority_model.pkl`

## Evaluate Models

```powershell
python scripts/evaluate_feedback_models.py
```

## Run Server

```powershell
uvicorn app.main:app --reload --port 8000
```

Health checks:

- `GET http://localhost:8000/`
- `GET http://localhost:8000/health`

## Test Feedback Analysis

```powershell
curl -X POST http://localhost:8000/api/feedback/analyze ^
  -H "Content-Type: application/json" ^
  -d "{\"content\":\"Wifi phòng tôi rất yếu\"}"
```

Example response:

```json
{
  "content": "Wifi phòng tôi rất yếu",
  "sentiment": "negative",
  "category": "internet",
  "priority": "medium",
  "summary": "Tenant feedback is classified as negative, related to internet, with medium priority.",
  "confidence": {
    "sentiment": 0.91,
    "category": 0.87,
    "priority": 0.72
  }
}
```
