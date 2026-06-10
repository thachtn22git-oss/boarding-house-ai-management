import { useCallback, useEffect, useMemo, useState } from 'react'

import { StatCard } from '../../../components/dashboard'
import { useAuth } from '../../auth/useAuth'
import { getRoomsByOwner, updateRoom } from '../../rooms/services/room.service'
import type { Room } from '../../rooms/types'
import TenantFormModal from '../components/TenantFormModal'
import {
  createTenant,
  deleteTenant,
  getTenantsByOwner,
  updateTenant,
} from '../services/tenant.service'
import type { Tenant, TenantFormValues, TenantStatus } from '../types'
import '../../rooms/pages/RoomManagementPage.css'
import './TenantManagementPage.css'

function getStatusLabel(status: TenantStatus) {
  if (status === 'active') {
    return 'Active'
  }

  if (status === 'pending') {
    return 'Pending'
  }

  return 'Inactive'
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

function TenantManagementPage() {
  const { currentUser } = useAuth()
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null)

  const ownerTenants = useMemo(
    () => tenants.filter((tenant) => tenant.ownerId === currentUser?.uid),
    [tenants, currentUser?.uid],
  )

  const ownerRooms = useMemo(
    () => rooms.filter((room) => room.ownerId === currentUser?.uid),
    [rooms, currentUser?.uid],
  )

  const selectableRooms = useMemo(() => {
    const roomOptions = ownerRooms.filter(
      (room) => room.status === 'available' || room.status === 'occupied',
    )

    if (
      editingTenant &&
      !roomOptions.some((room) => room.id === editingTenant.roomId)
    ) {
      const currentRoom = ownerRooms.find(
        (room) => room.id === editingTenant.roomId,
      )

      return currentRoom ? [...roomOptions, currentRoom] : roomOptions
    }

    return roomOptions
  }, [editingTenant, ownerRooms])

  const roomNumberById = useMemo(() => {
    return new Map(ownerRooms.map((room) => [room.id, room.roomNumber]))
  }, [ownerRooms])

  const stats = useMemo(
    () => ({
      total: ownerTenants.length,
      active: ownerTenants.filter((tenant) => tenant.status === 'active').length,
      pending: ownerTenants.filter((tenant) => tenant.status === 'pending')
        .length,
      inactive: ownerTenants.filter((tenant) => tenant.status === 'inactive')
        .length,
    }),
    [ownerTenants],
  )

  const loadTenantData = useCallback(async () => {
    if (!currentUser) {
      setError('You must be signed in to manage tenants.')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const [nextTenants, nextRooms] = await Promise.all([
        getTenantsByOwner(currentUser.uid),
        getRoomsByOwner(currentUser.uid),
      ])

      setTenants(
        nextTenants.filter((tenant) => tenant.ownerId === currentUser.uid),
      )
      setRooms(nextRooms.filter((room) => room.ownerId === currentUser.uid))
    } catch {
      setError('Unable to load tenants. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [currentUser])

  useEffect(() => {
    void Promise.resolve().then(loadTenantData)
  }, [loadTenantData])

  function openCreateModal() {
    setEditingTenant(null)
    setModalOpen(true)
  }

  function openEditModal(tenant: Tenant) {
    setEditingTenant(tenant)
    setModalOpen(true)
  }

  async function handleSubmit(values: TenantFormValues) {
    if (!currentUser) {
      setError('You must be signed in to manage tenants.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      if (editingTenant) {
        if (editingTenant.ownerId !== currentUser.uid) {
          throw new Error('You can only update your own tenants.')
        }

        await updateTenant(editingTenant.id, values)
      } else {
        await createTenant(currentUser.uid, values)

        if (values.status === 'active') {
          await updateRoom(values.roomId, { status: 'occupied' })
        }
      }

      setModalOpen(false)
      setEditingTenant(null)
      await loadTenantData()
    } catch {
      setError('Unable to save this tenant. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(tenant: Tenant) {
    if (!currentUser) {
      setError('You must be signed in to manage tenants.')
      return
    }

    if (tenant.ownerId !== currentUser.uid) {
      setError('You can only delete your own tenants.')
      return
    }

    if (!window.confirm('Are you sure you want to delete this tenant?')) {
      return
    }

    setError(null)

    try {
      await deleteTenant(tenant.id)
      await loadTenantData()
    } catch {
      setError('Unable to delete this tenant. Please try again.')
    }
  }

  return (
    <div className="room-management-page">
      <div className="room-page-actions">
        <button
          className="primary-button"
          type="button"
          onClick={openCreateModal}
          disabled={ownerRooms.length === 0}
        >
          Add Tenant
        </button>
      </div>

      {ownerRooms.length === 0 && !loading ? (
        <div className="tenant-room-warning">
          Please create a room before adding tenants.
        </div>
      ) : null}

      <div className="stats-grid">
        <StatCard
          label="Total Tenants"
          value={String(stats.total)}
          tone="primary"
        />
        <StatCard label="Active" value={String(stats.active)} tone="success" />
        <StatCard label="Pending" value={String(stats.pending)} tone="warning" />
        <StatCard label="Inactive" value={String(stats.inactive)} tone="neutral" />
      </div>

      {error ? <div className="room-error">{error}</div> : null}

      <section className="dashboard-card room-table-card">
        {loading ? (
          <div className="room-loading">Loading tenants...</div>
        ) : ownerTenants.length === 0 ? (
          <div className="room-empty-state">
            <h2>No tenants found.</h2>
            <p>Create your first tenant to start tracking rental status.</p>
            <button
              className="primary-button"
              type="button"
              onClick={openCreateModal}
              disabled={ownerRooms.length === 0}
            >
              Add your first tenant
            </button>
          </div>
        ) : (
          <div className="room-table-wrap">
            <table className="room-table tenant-table">
              <thead>
                <tr>
                  <th>Full Name</th>
                  <th>Room</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Identity Number</th>
                  <th>Move-in Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {ownerTenants.map((tenant) => (
                  <tr key={tenant.id}>
                    <td>{tenant.fullName}</td>
                    <td>{roomNumberById.get(tenant.roomId) ?? '-'}</td>
                    <td>{tenant.phone}</td>
                    <td>{tenant.email}</td>
                    <td>{tenant.identityNumber}</td>
                    <td>{formatDate(tenant.moveInDate)}</td>
                    <td>
                      <span
                        className={`status-badge tenant-status-badge--${tenant.status}`}
                      >
                        {getStatusLabel(tenant.status)}
                      </span>
                    </td>
                    <td>
                      <div className="room-table-actions">
                        <button
                          className="table-action-button"
                          type="button"
                          onClick={() => openEditModal(tenant)}
                        >
                          Edit
                        </button>
                        <button
                          className="table-action-button danger"
                          type="button"
                          onClick={() => void handleDelete(tenant)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {modalOpen ? (
        <TenantFormModal
          key={editingTenant?.id ?? 'create-tenant'}
          tenant={editingTenant}
          open={modalOpen}
          rooms={selectableRooms}
          submitting={submitting}
          onClose={() => {
            if (!submitting) {
              setModalOpen(false)
              setEditingTenant(null)
            }
          }}
          onSubmit={handleSubmit}
        />
      ) : null}
    </div>
  )
}

export default TenantManagementPage
