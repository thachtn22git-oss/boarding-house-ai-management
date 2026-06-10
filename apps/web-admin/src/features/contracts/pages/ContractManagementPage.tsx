import { useCallback, useEffect, useMemo, useState } from 'react'

import { StatCard } from '../../../components/dashboard'
import { useAuth } from '../../auth/useAuth'
import { getRoomsByOwner, updateRoom } from '../../rooms/services/room.service'
import type { Room } from '../../rooms/types'
import { getTenantsByOwner } from '../../tenants/services/tenant.service'
import type { Tenant } from '../../tenants/types'
import ContractFormModal from '../components/ContractFormModal'
import ContractViewModal from '../components/ContractViewModal'
import {
  createContract,
  deleteContract,
  getContractsByOwner,
  updateContract,
} from '../services/contract.service'
import type { Contract, ContractFormValues, ContractStatus } from '../types'
import '../../rooms/pages/RoomManagementPage.css'
import '../../tenants/pages/TenantManagementPage.css'
import './ContractManagementPage.css'

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

function getStatusLabel(status: ContractStatus) {
  if (status === 'active') {
    return 'Active'
  }

  if (status === 'pending') {
    return 'Pending'
  }

  if (status === 'expired') {
    return 'Expired'
  }

  return 'Terminated'
}

function formatDate(value: string) {
  if (!value) {
    return '-'
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(new Date(value))
}

function ContractManagementPage() {
  const { currentUser } = useAuth()
  const [contracts, setContracts] = useState<Contract[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingContract, setEditingContract] = useState<Contract | null>(null)
  const [viewingContract, setViewingContract] = useState<Contract | null>(null)

  const ownerContracts = useMemo(
    () => contracts.filter((contract) => contract.ownerId === currentUser?.uid),
    [contracts, currentUser?.uid],
  )

  const ownerTenants = useMemo(
    () => tenants.filter((tenant) => tenant.ownerId === currentUser?.uid),
    [tenants, currentUser?.uid],
  )

  const ownerRooms = useMemo(
    () => rooms.filter((room) => room.ownerId === currentUser?.uid),
    [rooms, currentUser?.uid],
  )

  const tenantById = useMemo(
    () => new Map(ownerTenants.map((tenant) => [tenant.id, tenant])),
    [ownerTenants],
  )

  const roomById = useMemo(
    () => new Map(ownerRooms.map((room) => [room.id, room])),
    [ownerRooms],
  )

  const stats = useMemo(
    () => ({
      total: ownerContracts.length,
      active: ownerContracts.filter((contract) => contract.status === 'active')
        .length,
      pending: ownerContracts.filter((contract) => contract.status === 'pending')
        .length,
      expired: ownerContracts.filter((contract) => contract.status === 'expired')
        .length,
      terminated: ownerContracts.filter(
        (contract) => contract.status === 'terminated',
      ).length,
    }),
    [ownerContracts],
  )

  const loadContractData = useCallback(async () => {
    if (!currentUser) {
      setError('You must be signed in to manage contracts.')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const [nextContracts, nextTenants, nextRooms] = await Promise.all([
        getContractsByOwner(currentUser.uid),
        getTenantsByOwner(currentUser.uid),
        getRoomsByOwner(currentUser.uid),
      ])

      setContracts(
        nextContracts.filter((contract) => contract.ownerId === currentUser.uid),
      )
      setTenants(
        nextTenants.filter((tenant) => tenant.ownerId === currentUser.uid),
      )
      setRooms(nextRooms.filter((room) => room.ownerId === currentUser.uid))
    } catch {
      setError('Unable to load contracts. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [currentUser])

  useEffect(() => {
    void Promise.resolve().then(loadContractData)
  }, [loadContractData])

  function openCreateModal() {
    setEditingContract(null)
    setModalOpen(true)
  }

  function openEditModal(contract: Contract) {
    setEditingContract(contract)
    setModalOpen(true)
  }

  async function handleSubmit(values: ContractFormValues) {
    if (!currentUser) {
      setError('You must be signed in to manage contracts.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      if (editingContract) {
        if (editingContract.ownerId !== currentUser.uid) {
          throw new Error('You can only update your own contracts.')
        }

        await updateContract(editingContract.id, values)
      } else {
        await createContract(currentUser.uid, values)

        if (values.status === 'active') {
          await updateRoom(values.roomId, { status: 'occupied' })
        }
      }

      setModalOpen(false)
      setEditingContract(null)
      await loadContractData()
    } catch {
      setError('Unable to save this contract. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(contract: Contract) {
    if (!currentUser) {
      setError('You must be signed in to manage contracts.')
      return
    }

    if (contract.ownerId !== currentUser.uid) {
      setError('You can only delete your own contracts.')
      return
    }

    if (!window.confirm('Are you sure you want to delete this contract?')) {
      return
    }

    setError(null)

    try {
      await deleteContract(contract.id)
      await loadContractData()
    } catch {
      setError('Unable to delete this contract. Please try again.')
    }
  }

  const selectedTenant = viewingContract
    ? tenantById.get(viewingContract.tenantId)
    : undefined
  const selectedRoom = viewingContract
    ? roomById.get(viewingContract.roomId)
    : undefined

  return (
    <div className="room-management-page">
      <div className="room-page-actions">
        <button
          className="primary-button"
          type="button"
          onClick={openCreateModal}
          disabled={ownerTenants.length === 0 || ownerRooms.length === 0}
        >
          Add Contract
        </button>
      </div>

      {ownerTenants.length === 0 && !loading ? (
        <div className="tenant-room-warning">
          Please create a tenant before adding contracts.
        </div>
      ) : null}

      {ownerRooms.length === 0 && !loading ? (
        <div className="tenant-room-warning">
          Please create a room before adding contracts.
        </div>
      ) : null}

      <div className="stats-grid contract-stats-grid">
        <StatCard
          label="Total Contracts"
          value={String(stats.total)}
          tone="primary"
        />
        <StatCard label="Active" value={String(stats.active)} tone="success" />
        <StatCard label="Pending" value={String(stats.pending)} tone="warning" />
        <StatCard label="Expired" value={String(stats.expired)} tone="neutral" />
        <StatCard
          label="Terminated"
          value={String(stats.terminated)}
          tone="danger"
        />
      </div>

      {error ? <div className="room-error">{error}</div> : null}

      <section className="dashboard-card room-table-card">
        {loading ? (
          <div className="room-loading">Loading contracts...</div>
        ) : ownerContracts.length === 0 ? (
          <div className="room-empty-state">
            <h2>No contracts found.</h2>
            <p>Create your first contract to start tracking rental agreements.</p>
            <button
              className="primary-button"
              type="button"
              onClick={openCreateModal}
              disabled={ownerTenants.length === 0 || ownerRooms.length === 0}
            >
              Add your first contract
            </button>
          </div>
        ) : (
          <div className="room-table-wrap">
            <table className="room-table contract-table">
              <thead>
                <tr>
                  <th>Contract Code</th>
                  <th>Tenant</th>
                  <th>Room</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Monthly Rent</th>
                  <th>Deposit</th>
                  <th>Due Day</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {ownerContracts.map((contract) => {
                  const tenant = tenantById.get(contract.tenantId)
                  const room = roomById.get(contract.roomId)

                  return (
                    <tr key={contract.id}>
                      <td>{contract.contractCode}</td>
                      <td>{tenant?.fullName ?? '-'}</td>
                      <td>{room ? `${room.roomNumber} - ${room.roomType}` : '-'}</td>
                      <td>{formatDate(contract.startDate)}</td>
                      <td>{formatDate(contract.endDate)}</td>
                      <td>{currencyFormatter.format(contract.monthlyRent)}</td>
                      <td>{currencyFormatter.format(contract.deposit)}</td>
                      <td>Day {contract.paymentDueDay}</td>
                      <td>
                        <span
                          className={`status-badge contract-status-badge--${contract.status}`}
                        >
                          {getStatusLabel(contract.status)}
                        </span>
                      </td>
                      <td>
                        <div className="room-table-actions">
                          <button
                            className="table-action-button"
                            type="button"
                            onClick={() => setViewingContract(contract)}
                          >
                            View
                          </button>
                          <button
                            className="table-action-button"
                            type="button"
                            onClick={() => openEditModal(contract)}
                          >
                            Edit
                          </button>
                          <button
                            className="table-action-button danger"
                            type="button"
                            onClick={() => void handleDelete(contract)}
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
        <ContractFormModal
          key={editingContract?.id ?? 'create-contract'}
          contract={editingContract}
          open={modalOpen}
          rooms={ownerRooms}
          tenants={ownerTenants}
          submitting={submitting}
          onClose={() => {
            if (!submitting) {
              setModalOpen(false)
              setEditingContract(null)
            }
          }}
          onSubmit={handleSubmit}
        />
      ) : null}

      {viewingContract ? (
        <ContractViewModal
          contract={viewingContract}
          tenant={selectedTenant}
          room={selectedRoom}
          onClose={() => setViewingContract(null)}
        />
      ) : null}
    </div>
  )
}

export default ContractManagementPage
