import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore'

import { db } from '../../../config/firebase'
import type { UtilityType } from '../types'

export interface OCRPixelRoi {
  x: number
  y: number
  width: number
  height: number
}

export interface OCRNormalizedRoi {
  xRatio: number
  yRatio: number
  widthRatio: number
  heightRatio: number
}

export interface OCRTrainingSample {
  id: string
  ownerId: string
  meterType: UtilityType
  imageName: string
  imageWidth: number
  imageHeight: number
  roi: OCRPixelRoi
  labelValue: number
  createdAt?: unknown
  updatedAt?: unknown
}

export interface OCRTrainingSampleInput {
  meterType: UtilityType
  imageName: string
  imageWidth: number
  imageHeight: number
  roi: OCRPixelRoi
  labelValue: number
}

export interface OCRMeterTemplate {
  id: string
  ownerId: string
  meterType: UtilityType
  name: string
  sampleCount: number
  normalizedRoi: OCRNormalizedRoi
  createdAt?: unknown
  updatedAt?: unknown
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

const aiServerUrl = import.meta.env.VITE_AI_SERVER_URL || 'http://localhost:8000'
const samplesCollection = collection(db, 'ocrTrainingSamples')
const templatesCollection = collection(db, 'ocrMeterTemplates')

function getErrorMessage(error: unknown) {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return 'OCR service is unavailable. Please enter the reading manually.'
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'OCR service is unavailable. Please enter the reading manually.'
}

function mapTrainingSample(documentId: string, data: Record<string, unknown>): OCRTrainingSample {
  const roi = data.roi && typeof data.roi === 'object' ? data.roi as Partial<OCRPixelRoi> : {}

  return {
    id: documentId,
    ownerId: String(data.ownerId ?? ''),
    meterType: data.meterType === 'water' ? 'water' : 'electricity',
    imageName: String(data.imageName ?? ''),
    imageWidth: Number(data.imageWidth ?? 0),
    imageHeight: Number(data.imageHeight ?? 0),
    roi: {
      x: Number(roi.x ?? 0),
      y: Number(roi.y ?? 0),
      width: Number(roi.width ?? 0),
      height: Number(roi.height ?? 0),
    },
    labelValue: Number(data.labelValue ?? 0),
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  }
}

function mapTemplate(documentId: string, data: Record<string, unknown>): OCRMeterTemplate {
  const normalizedRoi =
    data.normalizedRoi && typeof data.normalizedRoi === 'object'
      ? data.normalizedRoi as Partial<OCRNormalizedRoi>
      : {}

  return {
    id: documentId,
    ownerId: String(data.ownerId ?? ''),
    meterType: data.meterType === 'water' ? 'water' : 'electricity',
    name: String(data.name ?? 'Meter Template'),
    sampleCount: Number(data.sampleCount ?? 0),
    normalizedRoi: {
      xRatio: Number(normalizedRoi.xRatio ?? 0),
      yRatio: Number(normalizedRoi.yRatio ?? 0),
      widthRatio: Number(normalizedRoi.widthRatio ?? 1),
      heightRatio: Number(normalizedRoi.heightRatio ?? 1),
    },
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  }
}

function sortByUpdatedAt<T extends { updatedAt?: unknown; createdAt?: unknown }>(items: T[]) {
  return [...items].sort((left, right) => getTime(right.updatedAt ?? right.createdAt) - getTime(left.updatedAt ?? left.createdAt))
}

function getTime(value: unknown) {
  if (value && typeof value === 'object' && 'toDate' in value) {
    return (value as { toDate: () => Date }).toDate().getTime()
  }

  if (typeof value === 'string') {
    const time = new Date(value).getTime()
    return Number.isNaN(time) ? 0 : time
  }

  return 0
}

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1)
}

export async function getOCRTrainingSamples(ownerId: string): Promise<OCRTrainingSample[]> {
  const snapshot = await getDocs(
    query(samplesCollection, where('ownerId', '==', ownerId), orderBy('createdAt', 'desc')),
  ).catch(() => getDocs(query(samplesCollection, where('ownerId', '==', ownerId))))

  return sortByUpdatedAt(snapshot.docs.map((sampleDoc) => mapTrainingSample(sampleDoc.id, sampleDoc.data())))
}

export async function saveOCRTrainingSample(
  ownerId: string,
  values: OCRTrainingSampleInput,
): Promise<string> {
  const sampleRef = await addDoc(samplesCollection, {
    ...values,
    ownerId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  return sampleRef.id
}

export async function deleteOCRTrainingSample(sampleId: string): Promise<void> {
  await deleteDoc(doc(db, 'ocrTrainingSamples', sampleId))
}

export async function deleteOCRTrainingSamplesByMeterType(
  ownerId: string,
  meterType: UtilityType,
): Promise<number> {
  const snapshot = await getDocs(
    query(samplesCollection, where('ownerId', '==', ownerId), where('meterType', '==', meterType)),
  )

  await Promise.all(snapshot.docs.map((sampleDoc) => deleteDoc(sampleDoc.ref)))

  return snapshot.size
}

export async function getOCRMeterTemplates(
  ownerId: string,
  meterType?: UtilityType,
): Promise<OCRMeterTemplate[]> {
  const constraints = meterType
    ? [where('ownerId', '==', ownerId), where('meterType', '==', meterType)]
    : [where('ownerId', '==', ownerId)]
  const snapshot = await getDocs(
    query(templatesCollection, ...constraints, orderBy('updatedAt', 'desc')),
  ).catch(() => getDocs(query(templatesCollection, ...constraints)))

  return sortByUpdatedAt(snapshot.docs.map((templateDoc) => mapTemplate(templateDoc.id, templateDoc.data())))
}

export async function deleteOCRMeterTemplate(templateId: string): Promise<void> {
  await deleteDoc(doc(db, 'ocrMeterTemplates', templateId))
}

export async function generateOCRTemplate(
  ownerId: string,
  meterType: UtilityType,
): Promise<OCRMeterTemplate> {
  const samples = (await getOCRTrainingSamples(ownerId)).filter(
    (sample) => sample.meterType === meterType && sample.imageWidth > 0 && sample.imageHeight > 0,
  )

  if (samples.length === 0) {
    throw new Error('At least one training sample is required to generate a template.')
  }

  const normalizedRoi: OCRNormalizedRoi = {
    xRatio: average(samples.map((sample) => sample.roi.x / sample.imageWidth)),
    yRatio: average(samples.map((sample) => sample.roi.y / sample.imageHeight)),
    widthRatio: average(samples.map((sample) => sample.roi.width / sample.imageWidth)),
    heightRatio: average(samples.map((sample) => sample.roi.height / sample.imageHeight)),
  }

  const templateRef = await addDoc(templatesCollection, {
    ownerId,
    meterType,
    name: `${meterType === 'electricity' ? 'Electricity' : 'Water'} Meter Template`,
    sampleCount: samples.length,
    normalizedRoi,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  return {
    id: templateRef.id,
    ownerId,
    meterType,
    name: `${meterType === 'electricity' ? 'Electricity' : 'Water'} Meter Template`,
    sampleCount: samples.length,
    normalizedRoi,
  }
}

export async function detectMeterReading(
  file: File,
  meterType: UtilityType,
  template?: OCRMeterTemplate | null,
): Promise<MeterReadingOCRResult> {
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), 15_000)
  const formData = new FormData()

  formData.append('file', file)
  formData.append('meter_type', meterType)

  if (template) {
    formData.append('roi_x_ratio', String(template.normalizedRoi.xRatio))
    formData.append('roi_y_ratio', String(template.normalizedRoi.yRatio))
    formData.append('roi_width_ratio', String(template.normalizedRoi.widthRatio))
    formData.append('roi_height_ratio', String(template.normalizedRoi.heightRatio))
  }

  try {
    const response = await fetch(`${aiServerUrl}/api/ocr/meter-reading`, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    })

    if (!response.ok) {
      const payload = await response.json().catch(() => null)
      const message =
        payload?.detail?.message ??
        payload?.message ??
        'OCR could not detect the reading. Please enter it manually.'

      throw new Error(message)
    }

    return (await response.json()) as MeterReadingOCRResult
  } catch (error) {
    throw new Error(getErrorMessage(error))
  } finally {
    window.clearTimeout(timeoutId)
  }
}
