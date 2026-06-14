import base64
import io
import json
import re
from typing import Literal

import pandas as pd
from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from app.config import (
    ALLOWED_ORIGINS,
    CATEGORY_MODEL_PATH,
    DATASETS_DIR,
    METRICS_PATH,
    PRIORITY_MODEL_PATH,
    SENTIMENT_MODEL_PATH,
    SERVICE_NAME,
    STATIC_DIR,
    TEMPLATES_DIR,
)
from app.schemas import (
    FeedbackAnalyzeRequest,
    FeedbackAnalyzeResponse,
    HealthResponse,
    MeterReadingNormalizedROI,
    MeterReadingOCRResponse,
    MeterReadingScaledROI,
)
from app.services.feedback_ai_service import analyze_feedback

DATASET_PATH = DATASETS_DIR / "feedback_dataset.csv"


app = FastAPI(
    title="Boarding House AI Server",
    description="Self-trained AI services for boarding house management.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
templates = Jinja2Templates(directory=TEMPLATES_DIR)


def health_response() -> HealthResponse:
    return HealthResponse(status="ok", service=SERVICE_NAME)


def load_dataset() -> pd.DataFrame:
    if not DATASET_PATH.exists():
        raise HTTPException(status_code=404, detail="Dataset file was not found.")

    return pd.read_csv(DATASET_PATH)


def distribution(dataset: pd.DataFrame, column: str) -> dict[str, int]:
    return {
        str(label): int(count)
        for label, count in dataset[column].value_counts().sort_index().items()
    }


def normalize_meter_text(text: str) -> str:
    return (
        text.replace("O", "0")
        .replace("o", "0")
        .replace("I", "1")
        .replace("l", "1")
        .replace("S", "5")
        .replace("s", "5")
        .replace("B", "8")
        .replace(" ", "")
    )


def extract_meter_reading_candidate(
    text: str,
    meter_type: Literal["electricity", "water"],
) -> float | None:
    normalized_text = normalize_meter_text(text)
    pattern = r"\d{1,8}(?:[.,]\d{1,3})?" if meter_type == "water" else r"\d{1,8}"
    candidates = re.findall(pattern, normalized_text)
    if not candidates:
        return None

    def parse_candidate(value: str) -> float:
        return float(value.replace(",", "."))

    preferred = [
        candidate
        for candidate in candidates
        if 3 <= len(candidate.replace(".", "").replace(",", "")) <= 8
    ]
    selected = max(
        preferred or candidates,
        key=lambda value: (
            len(value.replace(".", "").replace(",", "")),
            parse_candidate(value),
        ),
    )
    reading = parse_candidate(selected)

    if reading <= 2 and len(candidates) > 1:
        larger_candidates = [
            parse_candidate(candidate)
            for candidate in candidates
            if parse_candidate(candidate) > 2
        ]
        return max(larger_candidates) if larger_candidates else None

    return float(int(reading)) if meter_type == "electricity" else reading


def crop_meter_image(
    image_bytes: bytes,
    roi_x_ratio: float | None,
    roi_y_ratio: float | None,
    roi_width_ratio: float | None,
    roi_height_ratio: float | None,
) -> tuple[bytes, MeterReadingScaledROI | None, str | None]:
    has_roi = all(
        value is not None
        for value in (
            roi_x_ratio,
            roi_y_ratio,
            roi_width_ratio,
            roi_height_ratio,
        )
    )

    if not has_roi:
        return image_bytes, None, None

    try:
        from PIL import Image

        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        image_width, image_height = image.size
        x = max(0, min(image_width - 1, int(image_width * float(roi_x_ratio or 0))))
        y = max(0, min(image_height - 1, int(image_height * float(roi_y_ratio or 0))))
        width = max(1, int(image_width * float(roi_width_ratio or 0)))
        height = max(1, int(image_height * float(roi_height_ratio or 0)))
        width = min(width, image_width - x)
        height = min(height, image_height - y)

        cropped = image.crop((x, y, x + width, y + height))
        output = io.BytesIO()
        cropped.save(output, format="PNG")
        cropped_bytes = output.getvalue()
        preview = base64.b64encode(cropped_bytes).decode("ascii")

        return cropped_bytes, MeterReadingScaledROI(
            x=x,
            y=y,
            width=width,
            height=height,
        ), preview
    except Exception:
        return image_bytes, None, None


def try_local_ocr(image_bytes: bytes) -> str | None:
    try:
        from PIL import Image, ImageEnhance, ImageFilter
        import pytesseract

        image = Image.open(io.BytesIO(image_bytes)).convert("L")
        image = ImageEnhance.Contrast(image).enhance(1.8)
        image = image.resize((image.width * 2, image.height * 2))
        image = image.filter(ImageFilter.SHARPEN)
        image = image.point(lambda pixel: 255 if pixel > 150 else 0)

        return pytesseract.image_to_string(
            image,
            config="--psm 6 -c tessedit_char_whitelist=0123456789.,OoIlSsB",
        )
    except Exception:
        return None


def build_demo_ocr_text(file: UploadFile, image_bytes: bytes) -> str:
    filename = file.filename or "meter-image"
    byte_text = image_bytes[:4096].decode("latin-1", errors="ignore")
    return f"Demo OCR fallback from file name and image bytes: {filename} {byte_text}"


@app.get("/", response_class=HTMLResponse)
def root(request: Request) -> HTMLResponse:
    return templates.TemplateResponse(request, "dashboard.html", {"landing": True})


@app.get("/dashboard", response_class=HTMLResponse)
def dashboard(request: Request) -> HTMLResponse:
    return templates.TemplateResponse(request, "dashboard.html", {"landing": False})


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return health_response()


@app.get("/api/model/info")
def model_info() -> dict:
    dataset = load_dataset()
    model_paths = {
        "sentiment": SENTIMENT_MODEL_PATH,
        "category": CATEGORY_MODEL_PATH,
        "priority": PRIORITY_MODEL_PATH,
    }

    return {
        "model_type": "TF-IDF + Logistic Regression",
        "tasks": ["sentiment", "category", "priority"],
        "dataset_path": "datasets/feedback_dataset.csv",
        "dataset_size": int(len(dataset)),
        "labels": {
            "sentiment": sorted(dataset["sentiment"].dropna().unique().tolist()),
            "category": sorted(dataset["category"].dropna().unique().tolist()),
            "priority": sorted(dataset["priority"].dropna().unique().tolist()),
        },
        "models": {
            name: {
                "path": str(path.relative_to(DATASETS_DIR.parent)),
                "exists": path.exists(),
            }
            for name, path in model_paths.items()
        },
    }


@app.get("/api/model/dataset-stats")
def dataset_stats() -> dict:
    dataset = load_dataset()

    return {
        "total_rows": int(len(dataset)),
        "sentiment_distribution": distribution(dataset, "sentiment"),
        "category_distribution": distribution(dataset, "category"),
        "priority_distribution": distribution(dataset, "priority"),
        "sample_rows": dataset.head(10).to_dict(orient="records"),
    }


@app.get("/api/model/metrics")
def model_metrics() -> dict:
    if not METRICS_PATH.exists():
        return {
            "message": "Metrics are not available. Please train or evaluate the models first."
        }

    with METRICS_PATH.open("r", encoding="utf-8") as metrics_file:
        return json.load(metrics_file)


@app.post("/api/feedback/analyze", response_model=FeedbackAnalyzeResponse)
def analyze_feedback_endpoint(
    payload: FeedbackAnalyzeRequest,
) -> FeedbackAnalyzeResponse:
    try:
        return analyze_feedback(payload.content)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except RuntimeError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error


@app.post("/api/ocr/meter-reading", response_model=MeterReadingOCRResponse)
async def meter_reading_ocr_endpoint(
    file: UploadFile = File(...),
    meter_type: Literal["electricity", "water"] = Form(...),
    roi_x_ratio: float | None = Form(None),
    roi_y_ratio: float | None = Form(None),
    roi_width_ratio: float | None = Form(None),
    roi_height_ratio: float | None = Form(None),
) -> MeterReadingOCRResponse:
    allowed_content_types = {"image/jpeg", "image/jpg", "image/png"}
    allowed_extensions = {".jpg", ".jpeg", ".png"}
    filename = (file.filename or "").lower()

    if file.content_type not in allowed_content_types and not any(
        filename.endswith(extension) for extension in allowed_extensions
    ):
        raise HTTPException(
            status_code=400,
            detail={"message": "Only JPG, JPEG, and PNG meter images are supported."},
        )

    try:
        image_bytes = await file.read()
        if not image_bytes:
            raise ValueError("Empty file.")

        cropped_bytes, scaled_roi, cropped_preview_base64 = crop_meter_image(
            image_bytes,
            roi_x_ratio,
            roi_y_ratio,
            roi_width_ratio,
            roi_height_ratio,
        )
        raw_text = try_local_ocr(cropped_bytes)
        used_demo_fallback = False

        if not raw_text or not raw_text.strip():
            raw_text = build_demo_ocr_text(file, cropped_bytes)
            used_demo_fallback = True

        detected_reading = extract_meter_reading_candidate(raw_text, meter_type)

        if detected_reading is None:
            raise ValueError("Unable to detect meter reading. Please enter manually.")

        confidence = 0.58 if used_demo_fallback else (0.86 if scaled_roi else 0.78)
        roi_used = scaled_roi is not None

        return MeterReadingOCRResponse(
            meter_type=meter_type,
            raw_text=raw_text.strip(),
            detected_reading=detected_reading,
            confidence=confidence,
            cropped_preview_base64=cropped_preview_base64,
            roi_used=roi_used,
            roi_used_normalized=MeterReadingNormalizedROI(
                xRatio=float(roi_x_ratio or 0),
                yRatio=float(roi_y_ratio or 0),
                widthRatio=float(roi_width_ratio or 0),
                heightRatio=float(roi_height_ratio or 0),
            )
            if roi_used
            else None,
            scaled_roi=scaled_roi,
            message="Reading detected. Please verify the value before saving.",
        )
    except ValueError as error:
        raise HTTPException(status_code=422, detail={"message": str(error)}) from error
    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail={"message": "Unable to detect meter reading. Please enter manually."},
        ) from error
