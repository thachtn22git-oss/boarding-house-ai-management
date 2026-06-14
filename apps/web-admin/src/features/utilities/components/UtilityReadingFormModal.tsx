import { useEffect, useMemo, useState, type FormEvent } from 'react'

import type { Room } from '../../rooms/types'
import type { Tenant } from '../../tenants/types'
import type {
  UtilityReading,
  UtilityReadingFormValues,
  UtilityReadingStatus,
  UtilityType,
} from '../types'
import {
  detectMeterReading,
  type MeterReadingOCRResult,
  type OCRMeterTemplate,
} from '../services/ocr.service'

type UtilityReadingFormModalProps = {
  reading: UtilityReading | null
  open: boolean
  rooms: Room[]
  tenants: Tenant[]
  templates: OCRMeterTemplate[]
  submitting: boolean
  onClose: () => void
  onSubmit: (values: UtilityReadingFormValues) => Promise<void>
}

type UtilityReadingFormErrors = Partial<Record<keyof UtilityReadingFormValues, string>>

const utilityTypeOptions: Array<{ label: string; value: UtilityType }> = [
  { label: 'Electricity', value: 'electricity' },
  { label: 'Water', value: 'water' },
]

const statusOptions: Array<{ label: string; value: UtilityReadingStatus }> = [
  { label: 'Draft', value: 'draft' },
  { label: 'Confirmed', value: 'confirmed' },
  { label: 'Billed', value: 'billed' },
  { label: 'Paid', value: 'paid' },
]

const defaultValues: UtilityReadingFormValues = {
  roomId: '',
  tenantId: '',
  utilityType: 'electricity',
  billingMonth: '',
  previousReading: 0,
  currentReading: 0,
  unitPrice: 0,
  status: 'draft',
  note: '',
}

type OCRState = {
  result: MeterReadingOCRResult | null
  imageName?: string
  templateId?: string
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

function getInitialValues(
  reading: UtilityReading | null,
): UtilityReadingFormValues {
  if (!reading) {
    return defaultValues
  }

  return {
    roomId: reading.roomId,
    tenantId: reading.tenantId ?? '',
    utilityType: reading.utilityType,
    billingMonth: reading.billingMonth,
    previousReading: reading.previousReading,
    currentReading: reading.currentReading,
    unitPrice: reading.unitPrice,
    status: reading.status,
    note: reading.note ?? '',
  }
}

function getCalculatedValues(values: UtilityReadingFormValues) {
  const usage = Number(values.currentReading) - Number(values.previousReading)
  const totalAmount = usage * Number(values.unitPrice)

  return {
    usage,
    totalAmount,
  }
}

function validateReading(values: UtilityReadingFormValues) {
  const errors: UtilityReadingFormErrors = {}

  if (!values.roomId) {
    errors.roomId = 'Room is required.'
  }

  if (!values.utilityType) {
    errors.utilityType = 'Utility type is required.'
  }

  if (!values.billingMonth) {
    errors.billingMonth = 'Billing month is required.'
  }

  if (Number.isNaN(values.previousReading) || values.previousReading < 0) {
    errors.previousReading = 'Previous reading must be 0 or greater.'
  }

  if (
    Number.isNaN(values.currentReading) ||
    values.currentReading < values.previousReading
  ) {
    errors.currentReading =
      'Current reading must be greater than or equal to previous reading.'
  }

  if (Number.isNaN(values.unitPrice) || values.unitPrice <= 0) {
    errors.unitPrice = 'Unit price must be greater than 0.'
  }

  if (!values.status) {
    errors.status = 'Status is required.'
  }

  return errors
}

function UtilityReadingFormModal({
  reading,
  open,
  rooms,
  tenants,
  templates,
  submitting,
  onClose,
  onSubmit,
}: UtilityReadingFormModalProps) {
  const [values, setValues] = useState<UtilityReadingFormValues>(() =>
    getInitialValues(reading),
  )
  const [errors, setErrors] = useState<UtilityReadingFormErrors>({})
  const [ocrFile, setOcrFile] = useState<File | null>(null)
  const [ocrPreviewUrl, setOcrPreviewUrl] = useState('')
  const [ocrState, setOcrState] = useState<OCRState>(() => ({
    result: reading?.ocr
      ? {
          meter_type: reading.ocr.meterType,
          raw_text: reading.ocr.rawText ?? '',
          detected_reading: reading.ocr.detectedReading ?? 0,
          confidence: reading.ocr.confidence ?? 0,
          roi_used: Boolean(reading.ocr.roiUsed),
          message: 'Please verify the detected reading before saving.',
        }
      : null,
    imageName: reading?.ocr?.imageName,
    templateId: reading?.ocr?.templateId,
  }))
  const [selectedTemplateId, setSelectedTemplateId] = useState(reading?.ocr?.templateId ?? '')
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrError, setOcrError] = useState('')
  const calculatedValues = useMemo(() => getCalculatedValues(values), [values])
  const filteredTemplates = useMemo(
    () => templates.filter((template) => template.meterType === values.utilityType),
    [templates, values.utilityType],
  )
  const selectedTemplate = useMemo(
    () => filteredTemplates.find((template) => template.id === selectedTemplateId) ?? null,
    [filteredTemplates, selectedTemplateId],
  )

  useEffect(() => {
    if (!open) return

    setValues(getInitialValues(reading))
    setErrors({})
    setOcrFile(null)
    setOcrError('')
    setSelectedTemplateId(reading?.ocr?.templateId ?? '')
    setOcrState({
      result: reading?.ocr
        ? {
            meter_type: reading.ocr.meterType,
            raw_text: reading.ocr.rawText ?? '',
            detected_reading: reading.ocr.detectedReading ?? 0,
            confidence: reading.ocr.confidence ?? 0,
            roi_used: Boolean(reading.ocr.roiUsed),
            message: 'Please verify the detected reading before saving.',
          }
        : null,
      imageName: reading?.ocr?.imageName,
      templateId: reading?.ocr?.templateId,
    })
  }, [open, reading])

  useEffect(() => {
    if (!ocrFile) {
      setOcrPreviewUrl('')
      return undefined
    }

    const nextPreviewUrl = URL.createObjectURL(ocrFile)
    setOcrPreviewUrl(nextPreviewUrl)

    return () => URL.revokeObjectURL(nextPreviewUrl)
  }, [ocrFile])

  if (!open) {
    return null
  }

  const isEditing = Boolean(reading)

  function updateValue<Field extends keyof UtilityReadingFormValues>(
    field: Field,
    value: UtilityReadingFormValues[Field],
  ) {
    setValues((current) => ({
      ...current,
      [field]: value,
    }))
    setErrors((current) => ({
      ...current,
      [field]: undefined,
    }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextValues = {
      ...values,
      tenantId: values.tenantId || undefined,
      note: values.note?.trim() || undefined,
      ocr: ocrState.result
        ? {
            used: true,
            meterType: ocrState.result.meter_type,
            detectedReading: ocrState.result.detected_reading,
            finalReading: values.currentReading,
            confidence: ocrState.result.confidence,
            rawText: ocrState.result.raw_text,
            templateId: ocrState.templateId,
            roiUsed: ocrState.result.roi_used,
            imageName: ocrState.imageName,
            verifiedByOwner: true,
          }
        : undefined,
    }
    const nextErrors = validateReading(nextValues)

    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    await onSubmit(nextValues)
  }

  async function handleDetectReading() {
    if (!ocrFile) {
      setOcrError('Please upload a meter image first.')
      return
    }

    if (!selectedTemplate) {
      setOcrError('Please select a trained OCR template before detection.')
      return
    }

    setOcrLoading(true)
    setOcrError('')

    try {
      const result = await detectMeterReading(ocrFile, values.utilityType, selectedTemplate)
      setOcrState({ result, imageName: ocrFile.name, templateId: selectedTemplate.id })
      updateValue('currentReading', result.detected_reading)
    } catch (error) {
      console.warn('Meter OCR failed.', error)
      setOcrError('OCR could not detect the reading. Please enter it manually.')
    } finally {
      setOcrLoading(false)
    }
  }

  return (
    <div className="room-modal-backdrop" role="presentation">
      <section
        className="room-modal utility-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="utility-modal-title"
      >
        <div className="room-modal-header">
          <div>
            <p className="page-eyebrow">Utilities Management</p>
            <h2 id="utility-modal-title">
              {isEditing ? 'Edit Reading' : 'Create Reading'}
            </h2>
          </div>
          <button
            className="room-modal-close"
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close utility reading form"
          >
            x
          </button>
        </div>

        <form className="room-form utility-form" onSubmit={handleSubmit}>
          <label className="room-form-field">
            <span>Room</span>
            <select
              value={values.roomId}
              disabled={submitting}
              aria-invalid={Boolean(errors.roomId)}
              onChange={(event) => updateValue('roomId', event.target.value)}
            >
              <option value="">Select a room</option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.roomNumber} - {room.roomType}
                </option>
              ))}
            </select>
            {errors.roomId ? (
              <small className="field-error">{errors.roomId}</small>
            ) : null}
          </label>

          <label className="room-form-field">
            <span>Tenant</span>
            <select
              value={values.tenantId}
              disabled={submitting}
              onChange={(event) => updateValue('tenantId', event.target.value)}
            >
              <option value="">No tenant</option>
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.fullName} - {tenant.email}
                </option>
              ))}
            </select>
          </label>

          <label className="room-form-field">
            <span>Utility type</span>
            <select
              value={values.utilityType}
              disabled={submitting}
              aria-invalid={Boolean(errors.utilityType)}
              onChange={(event) => {
                updateValue('utilityType', event.target.value as UtilityType)
                setSelectedTemplateId('')
              }}
            >
              {utilityTypeOptions.map((utilityType) => (
                <option key={utilityType.value} value={utilityType.value}>
                  {utilityType.label}
                </option>
              ))}
            </select>
          </label>

          <label className="room-form-field">
            <span>Billing month</span>
            <input
              type="month"
              value={values.billingMonth}
              disabled={submitting}
              aria-invalid={Boolean(errors.billingMonth)}
              onChange={(event) => updateValue('billingMonth', event.target.value)}
            />
            {errors.billingMonth ? (
              <small className="field-error">{errors.billingMonth}</small>
            ) : null}
          </label>

          <section className="utility-ocr-card room-form-field--full">
            <div>
              <h3>Meter OCR</h3>
              <p>
                OCR is used to suggest the meter reading. Please verify the value
                before saving.
              </p>
            </div>

            <div className="utility-ocr-grid">
              <label className="room-form-field">
                <span>Upload meter image</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  disabled={submitting || ocrLoading}
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null
                    setOcrFile(file)
                    setOcrError('')
                    if (file) {
                      setOcrState((current) => ({ ...current, imageName: file.name }))
                    }
                  }}
                />
              </label>

              <label className="room-form-field">
                <span>Meter type</span>
                <select
                  value={values.utilityType}
                  disabled={submitting || ocrLoading}
                  onChange={(event) => {
                    updateValue('utilityType', event.target.value as UtilityType)
                    setSelectedTemplateId('')
                  }}
                >
                  {utilityTypeOptions.map((utilityType) => (
                    <option key={utilityType.value} value={utilityType.value}>
                      {utilityType.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="room-form-field">
                <span>OCR template</span>
                <select
                  value={selectedTemplateId}
                  disabled={submitting || ocrLoading}
                  onChange={(event) => {
                    setSelectedTemplateId(event.target.value)
                    setOcrError('')
                  }}
                >
                  <option value="">Select a trained template</option>
                  {filteredTemplates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name} ({template.sampleCount} samples)
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {filteredTemplates.length === 0 ? (
              <small className="field-error">
                No OCR template is available for this meter type. Create one in OCR Lab.
              </small>
            ) : null}

            {ocrPreviewUrl ? (
              <img
                className="utility-ocr-preview"
                src={ocrPreviewUrl}
                alt="Selected meter preview"
              />
            ) : null}

            <div className="room-form-actions utility-ocr-actions">
              <button
                className="secondary-button"
                type="button"
                disabled={submitting || ocrLoading || !ocrFile}
                onClick={() => void handleDetectReading()}
              >
                {ocrLoading ? 'Detecting...' : 'Detect Reading'}
              </button>
            </div>

            {ocrError ? <small className="field-error">{ocrError}</small> : null}

            {ocrState.result ? (
              <div className="utility-ocr-result">
                <strong>Detected Reading: {ocrState.result.detected_reading}</strong>
                <span>Confidence: {Math.round(ocrState.result.confidence * 100)}%</span>
                <span>ROI Used: {ocrState.result.roi_used ? 'Yes' : 'No'}</span>
                <span>Raw OCR Text</span>
                <pre>{ocrState.result.raw_text}</pre>
                <small>{ocrState.result.message}</small>
              </div>
            ) : null}
          </section>

          <label className="room-form-field">
            <span>Previous reading</span>
            <input
              type="number"
              min="0"
              value={values.previousReading}
              disabled={submitting}
              aria-invalid={Boolean(errors.previousReading)}
              onChange={(event) =>
                updateValue('previousReading', event.target.valueAsNumber)
              }
            />
            {errors.previousReading ? (
              <small className="field-error">{errors.previousReading}</small>
            ) : null}
          </label>

          <label className="room-form-field">
            <span>Current reading</span>
            <input
              type="number"
              min="0"
              value={values.currentReading}
              disabled={submitting}
              aria-invalid={Boolean(errors.currentReading)}
              onChange={(event) =>
                updateValue('currentReading', event.target.valueAsNumber)
              }
            />
            {errors.currentReading ? (
              <small className="field-error">{errors.currentReading}</small>
            ) : null}
          </label>

          <label className="room-form-field">
            <span>Unit price</span>
            <input
              type="number"
              min="0"
              value={values.unitPrice}
              disabled={submitting}
              aria-invalid={Boolean(errors.unitPrice)}
              onChange={(event) =>
                updateValue('unitPrice', event.target.valueAsNumber)
              }
            />
            {errors.unitPrice ? (
              <small className="field-error">{errors.unitPrice}</small>
            ) : null}
          </label>

          <label className="room-form-field">
            <span>Status</span>
            <select
              value={values.status}
              disabled={submitting}
              aria-invalid={Boolean(errors.status)}
              onChange={(event) =>
                updateValue('status', event.target.value as UtilityReadingStatus)
              }
            >
              {statusOptions.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </label>

          <div className="invoice-total-card utility-total-card">
            <span>Usage</span>
            <strong>{Math.max(calculatedValues.usage, 0)}</strong>
            <span>Total Amount</span>
            <strong>
              {currencyFormatter.format(Math.max(calculatedValues.totalAmount, 0))}
            </strong>
          </div>

          <label className="room-form-field room-form-field--full">
            <span>Note</span>
            <textarea
              value={values.note}
              rows={3}
              disabled={submitting}
              onChange={(event) => updateValue('note', event.target.value)}
            />
          </label>

          <div className="room-form-actions">
            <button
              className="secondary-button"
              type="button"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button className="primary-button" type="submit" disabled={submitting}>
              {submitting
                ? 'Saving...'
                : isEditing
                  ? 'Update Reading'
                  : 'Create Reading'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

export default UtilityReadingFormModal
