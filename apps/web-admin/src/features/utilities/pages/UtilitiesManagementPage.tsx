import { useCallback, useEffect, useMemo, useState } from 'react'

import { StatCard } from '../../../components/dashboard'
import { useAuth } from '../../auth/useAuth'
import { getRoomsByOwner } from '../../rooms/services/room.service'
import type { Room } from '../../rooms/types'
import { getTenantsByOwner } from '../../tenants/services/tenant.service'
import type { Tenant } from '../../tenants/types'
import UtilityReadingFormModal from '../components/UtilityReadingFormModal'
import {
  confirmUtilityReading,
  createUtilityReading,
  deleteUtilityReading,
  getUtilityReadingsByOwner,
  markUtilityReadingAsBilled,
  simulateDemoVietQRUtilityPayment,
  updateUtilityReading,
} from '../services/utility.service'
import type {
  UtilityReading,
  UtilityReadingFormValues,
  UtilityReadingStatus,
  UtilityType,
} from '../types'
import '../../rooms/pages/RoomManagementPage.css'
import '../../tenants/pages/TenantManagementPage.css'
import '../../contracts/pages/ContractManagementPage.css'
import '../../invoices/pages/InvoiceManagementPage.css'
import './UtilitiesManagementPage.css'

type UtilityTypeFilter = 'all' | UtilityType
type StatusFilter = 'all' | UtilityReadingStatus

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

function getUtilityTypeLabel(utilityType: UtilityType) {
  return utilityType === 'electricity' ? 'Electricity' : 'Water'
}

function getStatusLabel(status: UtilityReadingStatus) {
  if (status === 'draft') return 'Draft'
  if (status === 'confirmed') return 'Confirmed'
  if (status === 'paid' || status === 'billed_paid') return 'Paid'
  return 'Billed'
}

function getPaymentStatus(reading: UtilityReading) {
  return reading.paymentStatus ?? (reading.status === 'paid' || reading.status === 'billed_paid' ? 'paid' : 'unpaid')
}

function formatPaymentDate(value: unknown) {
  if (!value) return '-'

  const date =
    typeof value === 'object' && value !== null && 'toDate' in value
      ? (value as { toDate: () => Date }).toDate()
      : typeof value === 'string'
        ? new Date(value)
        : value instanceof Date
          ? value
          : null

  if (!date || Number.isNaN(date.getTime())) {
    return '-'
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function UtilityViewModal({
  reading,
  room,
  tenant,
  processingWebhook,
  onClose,
  onSimulateWebhook,
}: {
  reading: UtilityReading
  room?: Room
  tenant?: Tenant
  processingWebhook: boolean
  onClose: () => void
  onSimulateWebhook: () => void
}) {
  const canSimulateWebhook =
    import.meta.env.DEV && getPaymentStatus(reading) !== 'paid'

  return (
    <div className="room-modal-backdrop" role="presentation">
      <section
        className="room-modal utility-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="utility-view-title"
      >
        <div className="room-modal-header">
          <div>
            <p className="page-eyebrow">Utility Details</p>
            <h2 id="utility-view-title">{getUtilityTypeLabel(reading.utilityType)}</h2>
          </div>
          <button
            className="room-modal-close"
            type="button"
            onClick={onClose}
            aria-label="Close utility details"
          >
            x
          </button>
        </div>

        <div className="contract-summary invoice-summary">
          <dl>
            <div>
              <dt>Utility type</dt>
              <dd>{getUtilityTypeLabel(reading.utilityType)}</dd>
            </div>
            <div>
              <dt>Billing month</dt>
              <dd>{reading.billingMonth}</dd>
            </div>
            <div>
              <dt>Room</dt>
              <dd>{room ? `${room.roomNumber} - ${room.roomType}` : '-'}</dd>
            </div>
            <div>
              <dt>Tenant</dt>
              <dd>{tenant ? `${tenant.fullName} - ${tenant.email}` : '-'}</dd>
            </div>
            <div>
              <dt>Usage</dt>
              <dd>{reading.usage}</dd>
            </div>
            <div>
              <dt>Total amount</dt>
              <dd>{currencyFormatter.format(reading.totalAmount)}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{getStatusLabel(reading.status)}</dd>
            </div>
          </dl>

          <div className="utility-payment-info">
            <h3>Payment Information</h3>
            <dl>
              <div>
                <dt>Payment status</dt>
                <dd>{getPaymentStatus(reading)}</dd>
              </div>
              <div>
                <dt>Payment method</dt>
                <dd>
                  {reading.paymentMethod === 'demo_vietqr' ? (
                    <span className="status-badge invoice-payment-badge--vietqr">
                      Demo VietQR
                    </span>
                  ) : (
                    reading.paymentMethod ?? '-'
                  )}
                </dd>
              </div>
              <div>
                <dt>Payment reference</dt>
                <dd>{reading.paymentReference ?? '-'}</dd>
              </div>
              <div>
                <dt>Paid amount</dt>
                <dd>{currencyFormatter.format(reading.paidAmount ?? 0)}</dd>
              </div>
              <div>
                <dt>Paid at</dt>
                <dd>{formatPaymentDate(reading.paidAt)}</dd>
              </div>
              <div>
                <dt>QR provider</dt>
                <dd>{reading.qrProvider ?? '-'}</dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="room-form-actions">
          <button className="secondary-button" type="button" onClick={onClose}>
            Close
          </button>
          {canSimulateWebhook ? (
            <button
              className="primary-button"
              type="button"
              onClick={onSimulateWebhook}
              disabled={processingWebhook}
            >
              {processingWebhook ? 'Processing...' : 'Simulate VietQR Callback'}
            </button>
          ) : null}
        </div>
      </section>
    </div>
  )
}

function UtilitiesManagementPage() {
  const { currentUser } = useAuth()
  const [readings, setReadings] = useState<UtilityReading[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingReading, setEditingReading] = useState<UtilityReading | null>(null)
  const [viewingReading, setViewingReading] = useState<UtilityReading | null>(null)
  const [processingWebhookReadingId, setProcessingWebhookReadingId] = useState<string | null>(null)
  const [utilityTypeFilter, setUtilityTypeFilter] =
    useState<UtilityTypeFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [billingMonthFilter, setBillingMonthFilter] = useState('')

  const ownerReadings = useMemo(
    () => readings.filter((reading) => reading.ownerId === currentUser?.uid),
    [readings, currentUser?.uid],
  )
  const ownerRooms = useMemo(
    () => rooms.filter((room) => room.ownerId === currentUser?.uid),
    [rooms, currentUser?.uid],
  )
  const ownerTenants = useMemo(
    () => tenants.filter((tenant) => tenant.ownerId === currentUser?.uid),
    [tenants, currentUser?.uid],
  )

  const filteredReadings = useMemo(() => {
    return ownerReadings.filter((reading) => {
      const matchesType =
        utilityTypeFilter === 'all' || reading.utilityType === utilityTypeFilter
      const matchesStatus =
        statusFilter === 'all' || reading.status === statusFilter
      const matchesBillingMonth =
        !billingMonthFilter || reading.billingMonth === billingMonthFilter

      return matchesType && matchesStatus && matchesBillingMonth
    })
  }, [billingMonthFilter, ownerReadings, statusFilter, utilityTypeFilter])

  const roomById = useMemo(
    () => new Map(ownerRooms.map((room) => [room.id, room])),
    [ownerRooms],
  )
  const tenantById = useMemo(
    () => new Map(ownerTenants.map((tenant) => [tenant.id, tenant])),
    [ownerTenants],
  )

  const stats = useMemo(
    () => ({
      total: ownerReadings.length,
      electricityUsage: ownerReadings
        .filter((reading) => reading.utilityType === 'electricity')
        .reduce((sum, reading) => sum + reading.usage, 0),
      waterUsage: ownerReadings
        .filter((reading) => reading.utilityType === 'water')
        .reduce((sum, reading) => sum + reading.usage, 0),
      confirmed: ownerReadings.filter((reading) => reading.status === 'confirmed')
        .length,
      billed: ownerReadings.filter((reading) => reading.status === 'billed')
        .length,
      totalAmount: ownerReadings.reduce(
        (sum, reading) => sum + reading.totalAmount,
        0,
      ),
    }),
    [ownerReadings],
  )

  const loadUtilitiesData = useCallback(async () => {
    if (!currentUser) {
      setError('You must be signed in to manage utility readings.')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const [nextReadings, nextRooms, nextTenants] = await Promise.all([
        getUtilityReadingsByOwner(currentUser.uid),
        getRoomsByOwner(currentUser.uid),
        getTenantsByOwner(currentUser.uid),
      ])

      setReadings(
        nextReadings.filter((reading) => reading.ownerId === currentUser.uid),
      )
      setRooms(nextRooms.filter((room) => room.ownerId === currentUser.uid))
      setTenants(
        nextTenants.filter((tenant) => tenant.ownerId === currentUser.uid),
      )
    } catch {
      setError('Unable to load utility readings. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [currentUser])

  useEffect(() => {
    void Promise.resolve().then(loadUtilitiesData)
  }, [loadUtilitiesData])

  function openCreateModal() {
    setEditingReading(null)
    setModalOpen(true)
  }

  function openEditModal(reading: UtilityReading) {
    setEditingReading(reading)
    setModalOpen(true)
  }

  async function handleSubmit(values: UtilityReadingFormValues) {
    if (!currentUser) {
      setError('You must be signed in to manage utility readings.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      if (editingReading) {
        if (editingReading.ownerId !== currentUser.uid) {
          throw new Error('You can only update your own utility readings.')
        }

        await updateUtilityReading(editingReading.id, values)
      } else {
        await createUtilityReading(currentUser.uid, values)
      }

      setModalOpen(false)
      setEditingReading(null)
      await loadUtilitiesData()
    } catch {
      setError('Unable to save this utility reading. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleConfirm(reading: UtilityReading) {
    if (!currentUser) {
      setError('You must be signed in to manage utility readings.')
      return
    }

    if (reading.ownerId !== currentUser.uid) {
      setError('You can only update your own utility readings.')
      return
    }

    try {
      await confirmUtilityReading(reading.id)
      await loadUtilitiesData()
    } catch {
      setError('Unable to confirm this utility reading. Please try again.')
    }
  }

  async function handleMarkBilled(reading: UtilityReading) {
    if (!currentUser) {
      setError('You must be signed in to manage utility readings.')
      return
    }

    if (reading.ownerId !== currentUser.uid) {
      setError('You can only update your own utility readings.')
      return
    }

    try {
      await markUtilityReadingAsBilled(reading.id)
      await loadUtilitiesData()
    } catch {
      setError('Unable to mark this utility reading as billed. Please try again.')
    }
  }

  async function handleDelete(reading: UtilityReading) {
    if (!currentUser) {
      setError('You must be signed in to manage utility readings.')
      return
    }

    if (reading.ownerId !== currentUser.uid) {
      setError('You can only delete your own utility readings.')
      return
    }

    if (!window.confirm('Are you sure you want to delete this utility reading?')) {
      return
    }

    try {
      await deleteUtilityReading(reading.id)
      await loadUtilitiesData()
    } catch {
      setError('Unable to delete this utility reading. Please try again.')
    }
  }

  return (
    <div className="room-management-page">
      <div className="room-page-actions utilities-actions">
        <button
          className="secondary-button"
          type="button"
          disabled
          title="OCR coming soon"
        >
          OCR coming soon
        </button>
        <button
          className="primary-button"
          type="button"
          onClick={openCreateModal}
          disabled={ownerRooms.length === 0}
        >
          Add Reading
        </button>
      </div>

      {ownerRooms.length === 0 && !loading ? (
        <div className="tenant-room-warning">
          Please create a room before adding utility readings.
        </div>
      ) : null}

      <div className="stats-grid utilities-stats-grid">
        <StatCard
          label="Total Readings"
          value={String(stats.total)}
          tone="primary"
        />
        <StatCard
          label="Electricity Usage"
          value={String(stats.electricityUsage)}
          tone="warning"
        />
        <StatCard
          label="Water Usage"
          value={String(stats.waterUsage)}
          tone="primary"
        />
        <StatCard label="Confirmed" value={String(stats.confirmed)} tone="success" />
        <StatCard label="Billed" value={String(stats.billed)} tone="primary" />
        <StatCard
          label="Total Utility Amount"
          value={currencyFormatter.format(stats.totalAmount)}
          tone="primary"
        />
      </div>

      <section className="dashboard-card utilities-filter-card">
        <label>
          <span>Utility type</span>
          <select
            value={utilityTypeFilter}
            onChange={(event) =>
              setUtilityTypeFilter(event.target.value as UtilityTypeFilter)
            }
          >
            <option value="all">All</option>
            <option value="electricity">Electricity</option>
            <option value="water">Water</option>
          </select>
        </label>
        <label>
          <span>Status</span>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
          >
            <option value="all">All</option>
            <option value="draft">Draft</option>
            <option value="confirmed">Confirmed</option>
            <option value="billed">Billed</option>
            <option value="paid">Paid</option>
          </select>
        </label>
        <label>
          <span>Billing month</span>
          <input
            type="month"
            value={billingMonthFilter}
            onChange={(event) => setBillingMonthFilter(event.target.value)}
          />
        </label>
      </section>

      {error ? <div className="room-error">{error}</div> : null}

      <section className="dashboard-card room-table-card">
        {loading ? (
          <div className="room-loading">Loading utility readings...</div>
        ) : filteredReadings.length === 0 ? (
          <div className="room-empty-state">
            <h2>No utility readings found.</h2>
            <p>Create your first reading to track electricity and water usage.</p>
            <button
              className="primary-button"
              type="button"
              onClick={openCreateModal}
              disabled={ownerRooms.length === 0}
            >
              Add your first reading
            </button>
          </div>
        ) : (
          <div className="room-table-wrap">
            <table className="room-table utilities-table">
              <thead>
                <tr>
                  <th>Room</th>
                  <th>Tenant</th>
                  <th>Type</th>
                  <th>Billing Month</th>
                  <th>Previous</th>
                  <th>Current</th>
                  <th>Usage</th>
                  <th>Unit Price</th>
                  <th>Total Amount</th>
                  <th>Status</th>
                  <th>Payment Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredReadings.map((reading) => {
                  const room = roomById.get(reading.roomId)
                  const tenant = reading.tenantId
                    ? tenantById.get(reading.tenantId)
                    : undefined

                  return (
                    <tr key={reading.id}>
                      <td>{room ? `${room.roomNumber} - ${room.roomType}` : '-'}</td>
                      <td>{tenant?.fullName ?? '-'}</td>
                      <td>
                        <span
                          className={`status-badge utility-type-badge--${reading.utilityType}`}
                        >
                          {getUtilityTypeLabel(reading.utilityType)}
                        </span>
                      </td>
                      <td>{reading.billingMonth}</td>
                      <td>{reading.previousReading}</td>
                      <td>{reading.currentReading}</td>
                      <td>{reading.usage}</td>
                      <td>{currencyFormatter.format(reading.unitPrice)}</td>
                      <td>{currencyFormatter.format(reading.totalAmount)}</td>
                      <td>
                        <span
                          className={`status-badge utility-status-badge--${reading.status}`}
                        >
                          {getStatusLabel(reading.status)}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`status-badge utility-payment-badge--${getPaymentStatus(reading)}`}
                        >
                          {getPaymentStatus(reading)}
                        </span>
                        {getPaymentStatus(reading) === 'paid' && reading.paidAt ? (
                          <span className="tenant-paid-date">
                            Paid {formatPaymentDate(reading.paidAt)}
                          </span>
                        ) : null}
                      </td>
                      <td>
                        <div className="room-table-actions">
                          <button
                            className="table-action-button"
                            type="button"
                            onClick={() => setViewingReading(reading)}
                          >
                            View
                          </button>
                          <button
                            className="table-action-button"
                            type="button"
                            onClick={() => openEditModal(reading)}
                          >
                            Edit
                          </button>
                          {reading.status === 'draft' ? (
                            <button
                              className="table-action-button"
                              type="button"
                              onClick={() => void handleConfirm(reading)}
                            >
                              Confirm
                            </button>
                          ) : null}
                          {reading.status === 'confirmed' ? (
                            <button
                              className="table-action-button"
                              type="button"
                              onClick={() => void handleMarkBilled(reading)}
                            >
                              Mark Billed
                            </button>
                          ) : null}
                          <button
                            className="table-action-button danger"
                            type="button"
                            onClick={() => void handleDelete(reading)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {modalOpen ? (
        <UtilityReadingFormModal
          key={editingReading?.id ?? 'create-reading'}
          reading={editingReading}
          open={modalOpen}
          rooms={ownerRooms}
          tenants={ownerTenants}
          submitting={submitting}
          onClose={() => {
            if (!submitting) {
              setModalOpen(false)
              setEditingReading(null)
            }
          }}
          onSubmit={handleSubmit}
        />
      ) : null}

      {viewingReading ? (
        <UtilityViewModal
          reading={viewingReading}
          room={roomById.get(viewingReading.roomId)}
          tenant={viewingReading.tenantId ? tenantById.get(viewingReading.tenantId) : undefined}
          processingWebhook={processingWebhookReadingId === viewingReading.id}
          onClose={() => setViewingReading(null)}
          onSimulateWebhook={() => {
            const room = roomById.get(viewingReading.roomId)
            const tenant = viewingReading.tenantId
              ? tenantById.get(viewingReading.tenantId)
              : undefined

            setProcessingWebhookReadingId(viewingReading.id)
            void simulateDemoVietQRUtilityPayment(
              viewingReading.id,
              tenant?.fullName ?? 'Tenant',
              room?.roomNumber,
            )
              .then(loadUtilitiesData)
              .then(() => {
                setViewingReading(null)
                window.alert('Demo VietQR utility callback processed successfully.')
              })
              .catch(() => {
                setError('Unable to process demo utility callback. Please try again.')
              })
              .finally(() => setProcessingWebhookReadingId(null))
          }}
        />
      ) : null}
    </div>
  )
}

export default UtilitiesManagementPage
