# Trainable OCR Template System

This document describes the demo trainable OCR flow for electricity and water meter readings.

## Firestore Collections

### `ocrTrainingSamples`

Stores owner-provided sample images and verified regions of interest.

Fields:

- `ownerId`
- `meterType`: `electricity` or `water`
- `imageName`
- `imageWidth`
- `imageHeight`
- `roi`: `{ x, y, width, height }` in original image pixels
- `labelValue`: verified meter reading
- `createdAt`
- `updatedAt`

### `ocrMeterTemplates`

Stores averaged ROI templates generated from training samples.

Fields:

- `ownerId`
- `meterType`: `electricity` or `water`
- `name`
- `sampleCount`
- `normalizedRoi`: `{ xRatio, yRatio, widthRatio, heightRatio }`
- `createdAt`
- `updatedAt`

### `utilityReadings.ocr`

Utility readings can include OCR metadata:

- `used`
- `templateId`
- `meterType`
- `detectedReading`
- `finalReading`
- `confidence`
- `rawText`
- `roiUsed`
- `imageName`
- `verifiedByOwner`
- `createdAt`

## Web Owner OCR Lab

Route: `/owner/ocr-lab`

Tabs:

- `Train`: upload a meter image, drag/select the digit ROI, enter the verified reading, then save a training sample.
- `Test`: select a generated template, upload a meter image, and run OCR against the template ROI.

Generating a template averages normalized ROI ratios from all samples for the selected meter type.

## AI Server Endpoint

Endpoint:

```http
POST /api/ocr/meter-reading
```

Form fields:

- `file`
- `meter_type`
- `roi_x_ratio`
- `roi_y_ratio`
- `roi_width_ratio`
- `roi_height_ratio`

Response:

```json
{
  "meter_type": "electricity",
  "raw_text": "000001",
  "detected_reading": 1,
  "confidence": 0.86,
  "cropped_preview_base64": "...",
  "roi_used": true,
  "roi_used_normalized": {
    "xRatio": 0.15,
    "yRatio": 0.22,
    "widthRatio": 0.45,
    "heightRatio": 0.18
  },
  "scaled_roi": {
    "x": 120,
    "y": 80,
    "width": 260,
    "height": 90
  },
  "message": "Reading detected. Please verify the value before saving."
}
```

## OCR Cleanup Rules

The AI server normalizes common OCR mistakes:

- `O` and `o` to `0`
- `I` and `l` to `1`
- `S` to `5`
- `B` to `8`
- removes spaces

Electricity readings are normalized to integer values. Water readings can include decimals.

## Mobile Owner Utility Flow

Mobile owner does not train templates. It can:

1. Load existing `ocrMeterTemplates`.
2. Select a template in the utility reading form.
3. Upload or capture a meter image.
4. Detect the reading through the AI server.
5. Confirm or edit the detected value before saving.

Set `EXPO_PUBLIC_AI_SERVER_URL` to the computer LAN address when testing on a physical phone.

Example:

```env
EXPO_PUBLIC_AI_SERVER_URL=http://192.168.1.10:8000
```

## Operational Notes

- This is a demo OCR workflow, not a certified meter-reading system.
- Owners must verify detected readings before saving.
- The template system is owner-scoped through `ownerId`.
- Utility OCR metadata is saved with the final owner-verified reading.
