import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'

import { useAuth } from '../../auth/useAuth'
import {
  detectMeterReading,
  generateOCRTemplate,
  getOCRMeterTemplates,
  getOCRTrainingSamples,
  saveOCRTrainingSample,
  type MeterReadingOCRResult,
  type OCRMeterTemplate,
  type OCRPixelRoi,
  type OCRTrainingSample,
} from '../../utilities/services/ocr.service'
import type { UtilityType } from '../../utilities/types'
import '../../rooms/pages/RoomManagementPage.css'
import '../../utilities/pages/UtilitiesManagementPage.css'
import './OCRLabPage.css'

type TabKey = 'train' | 'test'

const meterTypeOptions: Array<{ label: string; value: UtilityType }> = [
  { label: 'Electricity', value: 'electricity' },
  { label: 'Water', value: 'water' },
]

const defaultRoi: OCRPixelRoi = {
  x: 20,
  y: 20,
  width: 220,
  height: 80,
}

function formatTimestamp(value: unknown) {
  if (!value) return 'Not available'

  const date =
    typeof value === 'object' && value !== null && 'toDate' in value
      ? (value as { toDate: () => Date }).toDate()
      : typeof value === 'string'
        ? new Date(value)
        : null

  if (!date || Number.isNaN(date.getTime())) return 'Not available'

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function clampRoi(roi: OCRPixelRoi, imageWidth: number, imageHeight: number): OCRPixelRoi {
  const x = Math.max(0, Math.min(roi.x, Math.max(imageWidth - 1, 0)))
  const y = Math.max(0, Math.min(roi.y, Math.max(imageHeight - 1, 0)))
  const width = Math.max(1, Math.min(roi.width, Math.max(imageWidth - x, 1)))
  const height = Math.max(1, Math.min(roi.height, Math.max(imageHeight - y, 1)))

  return { x, y, width, height }
}

function OCRLabPage() {
  const { currentUser } = useAuth()
  const imageRef = useRef<HTMLImageElement | null>(null)
  const [activeTab, setActiveTab] = useState<TabKey>('train')
  const [meterType, setMeterType] = useState<UtilityType>('electricity')
  const [samples, setSamples] = useState<OCRTrainingSample[]>([])
  const [templates, setTemplates] = useState<OCRMeterTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [trainFile, setTrainFile] = useState<File | null>(null)
  const [trainPreview, setTrainPreview] = useState('')
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 })
  const [roi, setRoi] = useState<OCRPixelRoi>(defaultRoi)
  const [labelValue, setLabelValue] = useState('')
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null)
  const [testFile, setTestFile] = useState<File | null>(null)
  const [testPreview, setTestPreview] = useState('')
  const [testTemplateId, setTestTemplateId] = useState('')
  const [testResult, setTestResult] = useState<MeterReadingOCRResult | null>(null)
  const [detecting, setDetecting] = useState(false)

  const meterTemplates = useMemo(
    () => templates.filter((template) => template.meterType === meterType),
    [meterType, templates],
  )
  const selectedTestTemplate = useMemo(
    () => meterTemplates.find((template) => template.id === testTemplateId) ?? null,
    [meterTemplates, testTemplateId],
  )
  const sampleStats = useMemo(
    () => ({
      electricity: samples.filter((sample) => sample.meterType === 'electricity').length,
      water: samples.filter((sample) => sample.meterType === 'water').length,
    }),
    [samples],
  )

  const loadOCRData = useCallback(async () => {
    if (!currentUser) return

    setLoading(true)
    setError('')

    try {
      const [nextSamples, nextTemplates] = await Promise.all([
        getOCRTrainingSamples(currentUser.uid),
        getOCRMeterTemplates(currentUser.uid),
      ])
      setSamples(nextSamples)
      setTemplates(nextTemplates)
    } catch (loadError) {
      console.warn('OCR Lab data load failed.', loadError)
      setError('Unable to load OCR training data. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [currentUser])

  useEffect(() => {
    void loadOCRData()
  }, [loadOCRData])

  useEffect(() => {
    if (!trainFile) {
      setTrainPreview('')
      return undefined
    }

    const url = URL.createObjectURL(trainFile)
    setTrainPreview(url)

    return () => URL.revokeObjectURL(url)
  }, [trainFile])

  useEffect(() => {
    if (!testFile) {
      setTestPreview('')
      return undefined
    }

    const url = URL.createObjectURL(testFile)
    setTestPreview(url)

    return () => URL.revokeObjectURL(url)
  }, [testFile])

  function getImagePoint(event: MouseEvent<HTMLDivElement>) {
    const image = imageRef.current
    if (!image || imageSize.width === 0 || imageSize.height === 0) return null

    const rect = image.getBoundingClientRect()
    return {
      x: Math.round(((event.clientX - rect.left) / rect.width) * imageSize.width),
      y: Math.round(((event.clientY - rect.top) / rect.height) * imageSize.height),
    }
  }

  function beginRoiDrag(event: MouseEvent<HTMLDivElement>) {
    const point = getImagePoint(event)
    if (!point) return

    setDragStart(point)
    setRoi({ x: point.x, y: point.y, width: 1, height: 1 })
  }

  function updateRoiDrag(event: MouseEvent<HTMLDivElement>) {
    if (!dragStart) return

    const point = getImagePoint(event)
    if (!point) return

    const nextRoi = clampRoi(
      {
        x: Math.min(dragStart.x, point.x),
        y: Math.min(dragStart.y, point.y),
        width: Math.abs(point.x - dragStart.x),
        height: Math.abs(point.y - dragStart.y),
      },
      imageSize.width,
      imageSize.height,
    )
    setRoi(nextRoi)
  }

  async function handleSaveSample() {
    if (!currentUser) {
      setError('You must be signed in to train OCR templates.')
      return
    }

    if (!trainFile || imageSize.width === 0 || imageSize.height === 0) {
      setError('Please upload a training image first.')
      return
    }

    const numericLabel = Number(labelValue)
    if (!Number.isFinite(numericLabel) || numericLabel < 0) {
      setError('Please enter the verified meter reading value.')
      return
    }

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      await saveOCRTrainingSample(currentUser.uid, {
        meterType,
        imageName: trainFile.name,
        imageWidth: imageSize.width,
        imageHeight: imageSize.height,
        roi: clampRoi(roi, imageSize.width, imageSize.height),
        labelValue: numericLabel,
      })
      setSuccess('Training sample saved.')
      setLabelValue('')
      await loadOCRData()
    } catch (saveError) {
      console.warn('OCR training sample save failed.', saveError)
      setError('Unable to save training sample. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleGenerateTemplate() {
    if (!currentUser) {
      setError('You must be signed in to generate OCR templates.')
      return
    }

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const template = await generateOCRTemplate(currentUser.uid, meterType)
      setSuccess(`${template.name} generated from ${template.sampleCount} samples.`)
      await loadOCRData()
    } catch (templateError) {
      console.warn('OCR template generation failed.', templateError)
      setError(
        templateError instanceof Error
          ? templateError.message
          : 'Unable to generate OCR template. Please try again.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleDetectWithTemplate() {
    if (!testFile) {
      setError('Please upload a test image first.')
      return
    }

    if (!selectedTestTemplate) {
      setError('Please select a trained template first.')
      return
    }

    setDetecting(true)
    setError('')
    setSuccess('')
    setTestResult(null)

    try {
      const result = await detectMeterReading(testFile, meterType, selectedTestTemplate)
      setTestResult(result)
      setSuccess('OCR test completed. Verify the detected reading before using it.')
    } catch (detectError) {
      console.warn('OCR test failed.', detectError)
      setError('OCR could not detect the reading. Please adjust the template or image.')
    } finally {
      setDetecting(false)
    }
  }

  const roiStyle =
    trainPreview && imageSize.width > 0 && imageSize.height > 0
      ? {
          left: `${(roi.x / imageSize.width) * 100}%`,
          top: `${(roi.y / imageSize.height) * 100}%`,
          width: `${(roi.width / imageSize.width) * 100}%`,
          height: `${(roi.height / imageSize.height) * 100}%`,
        }
      : undefined

  return (
    <div className="ocr-lab-page">
      <div className="room-page-actions ocr-lab-actions">
        <div className="ocr-lab-tabs" role="tablist" aria-label="OCR Lab tabs">
          <button
            className={activeTab === 'train' ? 'is-active' : ''}
            type="button"
            onClick={() => setActiveTab('train')}
          >
            Train
          </button>
          <button
            className={activeTab === 'test' ? 'is-active' : ''}
            type="button"
            onClick={() => setActiveTab('test')}
          >
            Test
          </button>
        </div>
      </div>

      {error ? <div className="room-error">{error}</div> : null}
      {success ? <div className="room-success">{success}</div> : null}

      <div className="stats-grid ocr-lab-stats">
        <article className="dashboard-card">
          <span>Electricity Samples</span>
          <strong>{sampleStats.electricity}</strong>
        </article>
        <article className="dashboard-card">
          <span>Water Samples</span>
          <strong>{sampleStats.water}</strong>
        </article>
        <article className="dashboard-card">
          <span>Templates</span>
          <strong>{templates.length}</strong>
        </article>
      </div>

      <section className="dashboard-card ocr-lab-card">
        <div className="ocr-lab-card-header">
          <div>
            <p className="page-eyebrow">Owner OCR Lab</p>
            <h2>{activeTab === 'train' ? 'Train Meter Template' : 'Test Meter Template'}</h2>
          </div>
          <label className="room-form-field ocr-meter-select">
            <span>Meter type</span>
            <select
              value={meterType}
              onChange={(event) => {
                setMeterType(event.target.value as UtilityType)
                setTestTemplateId('')
              }}
            >
              {meterTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {loading ? (
          <div className="room-loading">Loading OCR training data...</div>
        ) : activeTab === 'train' ? (
          <div className="ocr-lab-grid">
            <div className="ocr-lab-panel">
              <label className="room-form-field">
                <span>Training image</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null
                    setTrainFile(file)
                    setImageSize({ width: 0, height: 0 })
                    setRoi(defaultRoi)
                  }}
                />
              </label>

              {trainPreview ? (
                <div
                  className="ocr-image-workspace"
                  role="presentation"
                  onMouseDown={beginRoiDrag}
                  onMouseMove={updateRoiDrag}
                  onMouseUp={() => setDragStart(null)}
                  onMouseLeave={() => setDragStart(null)}
                >
                  <img
                    ref={imageRef}
                    src={trainPreview}
                    alt="Training meter"
                    onLoad={(event) => {
                      const image = event.currentTarget
                      setImageSize({
                        width: image.naturalWidth,
                        height: image.naturalHeight,
                      })
                      setRoi(clampRoi(defaultRoi, image.naturalWidth, image.naturalHeight))
                    }}
                    draggable={false}
                  />
                  {roiStyle ? <div className="ocr-roi-box" style={roiStyle} /> : null}
                </div>
              ) : (
                <div className="ocr-empty-preview">Upload a sample image and drag over the meter digits.</div>
              )}
            </div>

            <div className="ocr-lab-panel">
              <h3>Training Details</h3>
              <div className="ocr-roi-inputs">
                <label>
                  <span>X</span>
                  <input
                    type="number"
                    value={roi.x}
                    onChange={(event) =>
                      setRoi((current) =>
                        clampRoi({ ...current, x: event.target.valueAsNumber || 0 }, imageSize.width, imageSize.height),
                      )
                    }
                  />
                </label>
                <label>
                  <span>Y</span>
                  <input
                    type="number"
                    value={roi.y}
                    onChange={(event) =>
                      setRoi((current) =>
                        clampRoi({ ...current, y: event.target.valueAsNumber || 0 }, imageSize.width, imageSize.height),
                      )
                    }
                  />
                </label>
                <label>
                  <span>Width</span>
                  <input
                    type="number"
                    value={roi.width}
                    onChange={(event) =>
                      setRoi((current) =>
                        clampRoi({ ...current, width: event.target.valueAsNumber || 1 }, imageSize.width, imageSize.height),
                      )
                    }
                  />
                </label>
                <label>
                  <span>Height</span>
                  <input
                    type="number"
                    value={roi.height}
                    onChange={(event) =>
                      setRoi((current) =>
                        clampRoi({ ...current, height: event.target.valueAsNumber || 1 }, imageSize.width, imageSize.height),
                      )
                    }
                  />
                </label>
              </div>
              <label className="room-form-field">
                <span>Verified reading</span>
                <input
                  type="number"
                  min="0"
                  step={meterType === 'water' ? '0.01' : '1'}
                  value={labelValue}
                  onChange={(event) => setLabelValue(event.target.value)}
                  placeholder="Enter the actual reading"
                />
              </label>
              <div className="room-form-actions ocr-lab-button-row">
                <button className="secondary-button" type="button" disabled={saving} onClick={() => void handleSaveSample()}>
                  {saving ? 'Saving...' : 'Save Sample'}
                </button>
                <button className="primary-button" type="button" disabled={saving} onClick={() => void handleGenerateTemplate()}>
                  Generate Template
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="ocr-lab-grid">
            <div className="ocr-lab-panel">
              <label className="room-form-field">
                <span>OCR template</span>
                <select value={testTemplateId} onChange={(event) => setTestTemplateId(event.target.value)}>
                  <option value="">Select a template</option>
                  {meterTemplates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name} ({template.sampleCount} samples)
                    </option>
                  ))}
                </select>
              </label>
              <label className="room-form-field">
                <span>Test image</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  onChange={(event) => setTestFile(event.target.files?.[0] ?? null)}
                />
              </label>
              {testPreview ? (
                <img className="ocr-test-preview" src={testPreview} alt="Test meter preview" />
              ) : (
                <div className="ocr-empty-preview">Upload a meter image to test the selected template.</div>
              )}
              <button className="primary-button" type="button" disabled={detecting || !testFile || !selectedTestTemplate} onClick={() => void handleDetectWithTemplate()}>
                {detecting ? 'Detecting...' : 'Detect Reading'}
              </button>
            </div>

            <div className="ocr-lab-panel">
              <h3>Test Result</h3>
              {testResult ? (
                <div className="utility-ocr-result">
                  <strong>Detected Reading: {testResult.detected_reading}</strong>
                  <span>Confidence: {Math.round(testResult.confidence * 100)}%</span>
                  <span>ROI Used: {testResult.roi_used ? 'Yes' : 'No'}</span>
                  {testResult.cropped_preview_base64 ? (
                    <img
                      className="ocr-cropped-preview"
                      src={`data:image/png;base64,${testResult.cropped_preview_base64}`}
                      alt="Cropped meter digits"
                    />
                  ) : null}
                  <span>Raw OCR Text</span>
                  <pre>{testResult.raw_text}</pre>
                  <small>{testResult.message}</small>
                </div>
              ) : (
                <div className="ocr-empty-preview">Run a test to review detected values and ROI crop.</div>
              )}
            </div>
          </div>
        )}
      </section>

      <section className="dashboard-card ocr-template-list">
        <div className="ocr-lab-card-header">
          <div>
            <p className="page-eyebrow">Generated Templates</p>
            <h2>Templates</h2>
          </div>
        </div>
        {templates.length === 0 ? (
          <div className="room-empty-state">
            <h2>No OCR templates found.</h2>
            <p>Save training samples and generate your first template.</p>
          </div>
        ) : (
          <div className="room-table-wrapper">
            <table className="room-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Samples</th>
                  <th>ROI Ratios</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {templates.map((template) => (
                  <tr key={template.id}>
                    <td>{template.name}</td>
                    <td>{template.meterType === 'electricity' ? 'Electricity' : 'Water'}</td>
                    <td>{template.sampleCount}</td>
                    <td>
                      {template.normalizedRoi.xRatio.toFixed(3)}, {template.normalizedRoi.yRatio.toFixed(3)}, {template.normalizedRoi.widthRatio.toFixed(3)}, {template.normalizedRoi.heightRatio.toFixed(3)}
                    </td>
                    <td>{formatTimestamp(template.updatedAt ?? template.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

export default OCRLabPage
