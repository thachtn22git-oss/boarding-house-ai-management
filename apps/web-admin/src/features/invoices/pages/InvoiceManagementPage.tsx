import { useCallback, useEffect, useMemo, useState } from 'react'

import { StatCard } from '../../../components/dashboard'
import { getInvoiceDisplayStatus } from '../../../utils/payment-status'
import { useAuth } from '../../auth/useAuth'
import { getContractsByOwner } from '../../contracts/services/contract.service'
import type { Contract } from '../../contracts/types'
import { getRoomsByOwner } from '../../rooms/services/room.service'
import type { Room } from '../../rooms/types'
import { getTenantsByOwner } from '../../tenants/services/tenant.service'
import type { Tenant } from '../../tenants/types'
import InvoiceFormModal from '../components/InvoiceFormModal'
import InvoiceViewModal from '../components/InvoiceViewModal'
import {
  createInvoice,
  deleteInvoice,
  getInvoicesByOwner,
  markInvoiceAsPaid,
  simulateDemoVietQRInvoicePayment,
  updateInvoice,
} from '../services/invoice.service'
import type { Invoice, InvoiceFormValues } from '../types'
import '../../rooms/pages/RoomManagementPage.css'
import '../../tenants/pages/TenantManagementPage.css'
import '../../contracts/pages/ContractManagementPage.css'
import './InvoiceManagementPage.css'

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

function getStatusLabel(status: string) {
  if (status === 'draft') return 'Draft'
  if (status === 'unpaid') return 'Unpaid'
  if (status === 'paid') return 'Paid'
  if (status === 'pending') return 'Pending'
  if (status === 'failed') return 'Failed'
  if (status === 'overdue') return 'Overdue'
  return 'Cancelled'
}

function formatDate(value: string) {
  if (!value) return '-'

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(new Date(value))
}

function InvoiceManagementPage() {
  const { currentUser } = useAuth()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null)
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null)
  const [processingWebhookInvoiceId, setProcessingWebhookInvoiceId] = useState<
    string | null
  >(null)

  const ownerInvoices = useMemo(
    () => invoices.filter((invoice) => invoice.ownerId === currentUser?.uid),
    [invoices, currentUser?.uid],
  )
  const ownerTenants = useMemo(
    () => tenants.filter((tenant) => tenant.ownerId === currentUser?.uid),
    [tenants, currentUser?.uid],
  )
  const ownerRooms = useMemo(
    () => rooms.filter((room) => room.ownerId === currentUser?.uid),
    [rooms, currentUser?.uid],
  )
  const ownerContracts = useMemo(
    () => contracts.filter((contract) => contract.ownerId === currentUser?.uid),
    [contracts, currentUser?.uid],
  )

  const tenantById = useMemo(
    () => new Map(ownerTenants.map((tenant) => [tenant.id, tenant])),
    [ownerTenants],
  )
  const roomById = useMemo(
    () => new Map(ownerRooms.map((room) => [room.id, room])),
    [ownerRooms],
  )
  const contractById = useMemo(
    () => new Map(ownerContracts.map((contract) => [contract.id, contract])),
    [ownerContracts],
  )

  const stats = useMemo(
    () => ({
      total: ownerInvoices.length,
      unpaid: ownerInvoices.filter((invoice) => getInvoiceDisplayStatus(invoice) === 'unpaid')
        .length,
      paid: ownerInvoices.filter((invoice) => getInvoiceDisplayStatus(invoice) === 'paid').length,
      overdue: ownerInvoices.filter((invoice) => getInvoiceDisplayStatus(invoice) === 'overdue')
        .length,
      revenue: ownerInvoices.reduce(
        (sum, invoice) => sum + invoice.paidAmount,
        0,
      ),
    }),
    [ownerInvoices],
  )

  const loadInvoiceData = useCallback(async () => {
    if (!currentUser) {
      setError('You must be signed in to manage invoices.')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const [nextInvoices, nextTenants, nextRooms, nextContracts] =
        await Promise.all([
          getInvoicesByOwner(currentUser.uid),
          getTenantsByOwner(currentUser.uid),
          getRoomsByOwner(currentUser.uid),
          getContractsByOwner(currentUser.uid),
        ])

      setInvoices(
        nextInvoices.filter((invoice) => invoice.ownerId === currentUser.uid),
      )
      setTenants(
        nextTenants.filter((tenant) => tenant.ownerId === currentUser.uid),
      )
      setRooms(nextRooms.filter((room) => room.ownerId === currentUser.uid))
      setContracts(
        nextContracts.filter((contract) => contract.ownerId === currentUser.uid),
      )
    } catch {
      setError('Unable to load invoices. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [currentUser])

  useEffect(() => {
    void Promise.resolve().then(loadInvoiceData)
  }, [loadInvoiceData])

  function openCreateModal() {
    setEditingInvoice(null)
    setModalOpen(true)
  }

  function openEditModal(invoice: Invoice) {
    setEditingInvoice(invoice)
    setModalOpen(true)
  }

  async function handleSubmit(values: InvoiceFormValues) {
    if (!currentUser) {
      setError('You must be signed in to manage invoices.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      if (editingInvoice) {
        if (editingInvoice.ownerId !== currentUser.uid) {
          throw new Error('You can only update your own invoices.')
        }

        await updateInvoice(editingInvoice.id, values)
      } else {
        await createInvoice(currentUser.uid, values)
      }

      setModalOpen(false)
      setEditingInvoice(null)
      await loadInvoiceData()
    } catch {
      setError('Unable to save this invoice. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleMarkPaid(invoice: Invoice) {
    if (!currentUser) {
      setError('You must be signed in to manage invoices.')
      return
    }

    if (invoice.ownerId !== currentUser.uid) {
      setError('You can only update your own invoices.')
      return
    }

    setError(null)

    try {
      await markInvoiceAsPaid(invoice.id)
      await loadInvoiceData()
    } catch {
      setError('Unable to mark this invoice as paid. Please try again.')
    }
  }

  async function handleDelete(invoice: Invoice) {
    if (!currentUser) {
      setError('You must be signed in to manage invoices.')
      return
    }

    if (invoice.ownerId !== currentUser.uid) {
      setError('You can only delete your own invoices.')
      return
    }

    if (!window.confirm('Are you sure you want to delete this invoice?')) {
      return
    }

    setError(null)

    try {
      await deleteInvoice(invoice.id)
      await loadInvoiceData()
    } catch {
      setError('Unable to delete this invoice. Please try again.')
    }
  }

  async function handleSimulateWebhook(invoice: Invoice) {
    const tenant = tenantById.get(invoice.tenantId)

    setProcessingWebhookInvoiceId(invoice.id)
    setError(null)

    try {
      await simulateDemoVietQRInvoicePayment(invoice.id, tenant?.fullName ?? 'Tenant')
      await loadInvoiceData()
      setViewingInvoice(null)
      window.alert('Demo VietQR callback processed successfully.')
    } catch {
      setError('Unable to process demo webhook. Please try again.')
    } finally {
      setProcessingWebhookInvoiceId(null)
    }
  }

  const selectedTenant = viewingInvoice
    ? tenantById.get(viewingInvoice.tenantId)
    : undefined
  const selectedRoom = viewingInvoice
    ? roomById.get(viewingInvoice.roomId)
    : undefined
  const selectedContract =
    viewingInvoice?.contractId ? contractById.get(viewingInvoice.contractId) : undefined

  return (
    <div className="room-management-page">
      <div className="room-page-actions">
        <button
          className="primary-button"
          type="button"
          onClick={openCreateModal}
          disabled={ownerTenants.length === 0 || ownerRooms.length === 0}
        >
          Add Invoice
        </button>
      </div>

      {ownerTenants.length === 0 && !loading ? (
        <div className="tenant-room-warning">
          Please create a tenant before adding invoices.
        </div>
      ) : null}

      {ownerRooms.length === 0 && !loading ? (
        <div className="tenant-room-warning">
          Please create a room before adding invoices.
        </div>
      ) : null}

      <div className="stats-grid contract-stats-grid">
        <StatCard
          label="Total Invoices"
          value={String(stats.total)}
          tone="primary"
        />
        <StatCard label="Unpaid" value={String(stats.unpaid)} tone="warning" />
        <StatCard label="Paid" value={String(stats.paid)} tone="success" />
        <StatCard label="Overdue" value={String(stats.overdue)} tone="danger" />
        <StatCard
          label="Total Revenue"
          value={currencyFormatter.format(stats.revenue)}
          tone="primary"
        />
      </div>

      {error ? <div className="room-error">{error}</div> : null}

      <section className="dashboard-card room-table-card">
        {loading ? (
          <div className="room-loading">Loading invoices...</div>
        ) : ownerInvoices.length === 0 ? (
          <div className="room-empty-state">
            <h2>No invoices found.</h2>
            <p>Create your first invoice to start tracking payment status.</p>
            <button
              className="primary-button"
              type="button"
              onClick={openCreateModal}
              disabled={ownerTenants.length === 0 || ownerRooms.length === 0}
            >
              Add your first invoice
            </button>
          </div>
        ) : (
          <div className="room-table-wrap">
            <table className="room-table invoice-table">
              <thead>
                <tr>
                  <th>Invoice Code</th>
                  <th>Tenant</th>
                  <th>Room</th>
                  <th>Billing Month</th>
                  <th>Due Date</th>
                  <th>Total Amount</th>
                  <th>Paid Amount</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {ownerInvoices.map((invoice) => {
                  const tenant = tenantById.get(invoice.tenantId)
                  const room = roomById.get(invoice.roomId)
                  const displayStatus = getInvoiceDisplayStatus(invoice)

                  return (
                    <tr key={invoice.id}>
                      <td>{invoice.invoiceCode}</td>
                      <td>{tenant?.fullName ?? '-'}</td>
                      <td>{room ? `${room.roomNumber} - ${room.roomType}` : '-'}</td>
                      <td>{invoice.billingMonth}</td>
                      <td>{formatDate(invoice.dueDate)}</td>
                      <td>{currencyFormatter.format(invoice.totalAmount)}</td>
                      <td>{currencyFormatter.format(invoice.paidAmount)}</td>
                      <td>
                        <span
                          className={`status-badge invoice-status-badge--${displayStatus}`}
                        >
                          {getStatusLabel(displayStatus)}
                        </span>
                      </td>
                      <td>
                        <div className="room-table-actions">
                          <button
                            className="table-action-button"
                            type="button"
                            onClick={() => setViewingInvoice(invoice)}
                          >
                            View
                          </button>
                          <button
                            className="table-action-button"
                            type="button"
                            onClick={() => openEditModal(invoice)}
                          >
                            Edit
                          </button>
                          {displayStatus !== 'paid' &&
                          invoice.status !== 'cancelled' ? (
                            <button
                              className="table-action-button"
                              type="button"
                              onClick={() => void handleMarkPaid(invoice)}
                            >
                              Mark Paid
                            </button>
                          ) : null}
                          <button
                            className="table-action-button danger"
                            type="button"
                            onClick={() => void handleDelete(invoice)}
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
        <InvoiceFormModal
          key={editingInvoice?.id ?? 'create-invoice'}
          invoice={editingInvoice}
          open={modalOpen}
          rooms={ownerRooms}
          tenants={ownerTenants}
          contracts={ownerContracts}
          submitting={submitting}
          onClose={() => {
            if (!submitting) {
              setModalOpen(false)
              setEditingInvoice(null)
            }
          }}
          onSubmit={handleSubmit}
        />
      ) : null}

      {viewingInvoice ? (
        <InvoiceViewModal
          invoice={viewingInvoice}
          tenant={selectedTenant}
          room={selectedRoom}
          contract={selectedContract}
          processingWebhook={processingWebhookInvoiceId === viewingInvoice.id}
          onSimulatePaymentWebhook={() => void handleSimulateWebhook(viewingInvoice)}
          onClose={() => setViewingInvoice(null)}
        />
      ) : null}
    </div>
  )
}

export default InvoiceManagementPage
