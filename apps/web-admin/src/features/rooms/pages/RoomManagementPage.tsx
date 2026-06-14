import { useCallback, useEffect, useMemo, useState } from 'react'

import { StatCard } from '../../../components/dashboard'
import { useAuth } from '../../auth/useAuth'
import RoomFormModal from '../components/RoomFormModal'
import {
  createRoom,
  deleteRoom,
  getRoomsByOwner,
  subscribeOwnerRooms,
  updateRoom,
} from '../services/room.service'
import type { Room, RoomFormValues, RoomStatus } from '../types'
import './RoomManagementPage.css'

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

function getStatusLabel(status: RoomStatus) {
  if (status === 'available') {
    return 'Available'
  }

  if (status === 'occupied') {
    return 'Occupied'
  }

  return 'Maintenance'
}

function RoomManagementPage() {
  const { currentUser } = useAuth()
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRoom, setEditingRoom] = useState<Room | null>(null)

  const ownerRooms = useMemo(
    () => rooms.filter((room) => room.ownerId === currentUser?.uid),
    [rooms, currentUser?.uid],
  )

  const stats = useMemo(
    () => ({
      total: ownerRooms.length,
      available: ownerRooms.filter((room) => room.status === 'available').length,
      occupied: ownerRooms.filter((room) => room.status === 'occupied').length,
      maintenance: ownerRooms.filter((room) => room.status === 'maintenance')
        .length,
    }),
    [ownerRooms],
  )

  const loadRooms = useCallback(async () => {
    if (!currentUser) {
      setError('You must be signed in to manage rooms.')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const nextRooms = await getRoomsByOwner(currentUser.uid)
      setRooms(nextRooms.filter((room) => room.ownerId === currentUser.uid))
    } catch {
      setError('Unable to load rooms. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [currentUser])

  useEffect(() => {
    if (!currentUser) {
      setError('You must be signed in to manage rooms.')
      setLoading(false)
      return undefined
    }

    let hasLoadedOnce = false
    setLoading(true)
    setError(null)

    return subscribeOwnerRooms(
      currentUser.uid,
      (nextRooms) => {
        setRooms(nextRooms.filter((room) => room.ownerId === currentUser.uid))
        if (!hasLoadedOnce) {
          setLoading(false)
          hasLoadedOnce = true
        }
      },
      (subscriptionError) => {
        console.warn('Owner rooms realtime update failed.', subscriptionError)
        setError('Realtime updates are unavailable. Showing latest loaded data.')
        if (!hasLoadedOnce) {
          setLoading(false)
          hasLoadedOnce = true
        }
      },
    )
  }, [currentUser])

  function openCreateModal() {
    setEditingRoom(null)
    setModalOpen(true)
  }

  function openEditModal(room: Room) {
    setEditingRoom(room)
    setModalOpen(true)
  }

  async function handleSubmit(values: RoomFormValues) {
    if (!currentUser) {
      setError('You must be signed in to manage rooms.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      if (editingRoom) {
        if (editingRoom.ownerId !== currentUser.uid) {
          throw new Error('You can only update your own rooms.')
        }

        await updateRoom(editingRoom.id, values)
      } else {
        await createRoom(currentUser.uid, values)
      }

      setModalOpen(false)
      setEditingRoom(null)
      await loadRooms()
    } catch {
      setError('Unable to save this room. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(room: Room) {
    if (!currentUser) {
      setError('You must be signed in to manage rooms.')
      return
    }

    if (room.ownerId !== currentUser.uid) {
      setError('You can only delete your own rooms.')
      return
    }

    if (!window.confirm('Are you sure you want to delete this room?')) {
      return
    }

    setError(null)

    try {
      await deleteRoom(room.id)
      await loadRooms()
    } catch {
      setError('Unable to delete this room. Please try again.')
    }
  }

  return (
    <div className="room-management-page">
      <div className="room-page-actions">
        <button className="primary-button" type="button" onClick={openCreateModal}>
          Add Room
        </button>
      </div>

      <div className="stats-grid">
        <StatCard label="Total Rooms" value={String(stats.total)} tone="primary" />
        <StatCard
          label="Available"
          value={String(stats.available)}
          tone="success"
        />
        <StatCard label="Occupied" value={String(stats.occupied)} tone="primary" />
        <StatCard
          label="Maintenance"
          value={String(stats.maintenance)}
          tone="warning"
        />
      </div>

      {error ? <div className="room-error">{error}</div> : null}

      <section className="dashboard-card room-table-card">
        {loading ? (
          <div className="room-loading">Loading rooms...</div>
        ) : ownerRooms.length === 0 ? (
          <div className="room-empty-state">
            <h2>No rooms found.</h2>
            <p>Create your first room to start tracking pricing and availability.</p>
            <button className="primary-button" type="button" onClick={openCreateModal}>
              Add your first room
            </button>
          </div>
        ) : (
          <div className="room-table-wrap">
            <table className="room-table">
              <thead>
                <tr>
                  <th>Room Number</th>
                  <th>Floor</th>
                  <th>Type</th>
                  <th>Area</th>
                  <th>Price</th>
                  <th>Deposit</th>
                  <th>Max Tenants</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {ownerRooms.map((room) => (
                  <tr key={room.id}>
                    <td>{room.roomNumber}</td>
                    <td>{room.floor}</td>
                    <td>{room.roomType}</td>
                    <td>{room.area} m2</td>
                    <td>{currencyFormatter.format(room.price)}</td>
                    <td>{currencyFormatter.format(room.deposit)}</td>
                    <td>{room.maxTenants}</td>
                    <td>
                      <span className={`status-badge status-badge--${room.status}`}>
                        {getStatusLabel(room.status)}
                      </span>
                    </td>
                    <td>
                      <div className="room-table-actions">
                        <button
                          className="table-action-button"
                          type="button"
                          onClick={() => openEditModal(room)}
                        >
                          Edit
                        </button>
                        <button
                          className="table-action-button danger"
                          type="button"
                          onClick={() => void handleDelete(room)}
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
        <RoomFormModal
          key={editingRoom?.id ?? 'create-room'}
          room={editingRoom}
          open={modalOpen}
          submitting={submitting}
          onClose={() => {
            if (!submitting) {
              setModalOpen(false)
              setEditingRoom(null)
            }
          }}
          onSubmit={handleSubmit}
        />
      ) : null}
    </div>
  )
}

export default RoomManagementPage
