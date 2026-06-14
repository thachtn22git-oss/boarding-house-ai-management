import type { OCRMeterTemplate, OCRNormalizedRoi, UtilityType } from '../types/models'

export interface OCRPixelRoi {
  x: number
  y: number
  width: number
  height: number
}

export interface MeterReadingOCRResult {
  meter_type: UtilityType
  raw_text: string
  detected_reading: number
  confidence: number
  cropped_preview_base64?: string | null
  roi_used: boolean
  roi_used_normalized?: OCRNormalizedRoi | null
  scaled_roi?: OCRPixelRoi | null
  message: string
}

const aiServerUrl = process.env.EXPO_PUBLIC_AI_SERVER_URL || 'http://localhost:8000'

export async function detectMeterReadingFromImage(
  imageUri: string,
  imageName: string,
  meterType: UtilityType,
  template?: OCRMeterTemplate | null,
): Promise<MeterReadingOCRResult> {
  const formData = new FormData()
  const extension = imageName.toLowerCase().endsWith('.png') ? 'png' : 'jpg'

  formData.append('file', {
    uri: imageUri,
    name: imageName || `meter-reading.${extension}`,
    type: extension === 'png' ? 'image/png' : 'image/jpeg',
  } as unknown as Blob)
  formData.append('meter_type', meterType)

  if (template) {
    formData.append('roi_x_ratio', String(template.normalizedRoi.xRatio))
    formData.append('roi_y_ratio', String(template.normalizedRoi.yRatio))
    formData.append('roi_width_ratio', String(template.normalizedRoi.widthRatio))
    formData.append('roi_height_ratio', String(template.normalizedRoi.heightRatio))
  }

  const response = await fetch(`${aiServerUrl}/api/ocr/meter-reading`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    const message =
      payload?.detail?.message ??
      payload?.message ??
      'OCR service is unavailable. Please enter the reading manually.'

    throw new Error(message)
  }

  return (await response.json()) as MeterReadingOCRResult
}
