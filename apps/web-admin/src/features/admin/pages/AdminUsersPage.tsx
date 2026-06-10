import { useEffect, useMemo, useState, type FormEvent } from 'react'

import { formatDate } from '../../../utils/format'
import type { UserRole } from '../../../types/user'
import {
  deleteAdminUserProfile,
  subscribeToAdminUsers,
  updateAdminUser,
} from '../services/admin-users.service'
import type { AdminUser } from '../types'
import './AdminPortal.css'

type RoleFilter = 'all' | UserRole
type ModalMode = 'view' | 'edit' | 'delete'

function getRoleLabel(role: UserRole) {
  if (role === 'admin') return 'Admin'
  if (role === 'owner') return 'Owner'
  return 'Tenant'
}

function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
  const [modalMode, setModalMode] = useState<ModalMode>('view')
  const [submitting, setSubmitting] = useState(false)
  const [editValues, setEditValues] = useState({
    fullName: '',
    email: '',
    role: 'tenant' as UserRole,
  })

  useEffect(() => {
    void Promise.resolve().then(() => {
      setLoading(true)
      setError('')
    })

    return subscribeToAdminUsers(
      (nextUsers) => {
        setUsers(nextUsers)
        setLoading(false)
        setError('')
      },
      (loadError) => {
        console.error('Unable to load admin users.', loadError)
        setError('Unable to load users. Please try again.')
        setLoading(false)
      },
    )
  }, [])

  const filteredUsers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()

    return users.filter((user) => {
      const matchesSearch =
        !normalizedSearch ||
        user.fullName.toLowerCase().includes(normalizedSearch) ||
        user.email.toLowerCase().includes(normalizedSearch)
      const matchesRole = roleFilter === 'all' || user.role === roleFilter

      return matchesSearch && matchesRole
    })
  }, [roleFilter, searchTerm, users])

  function openModal(user: AdminUser, mode: ModalMode) {
    setSelectedUser(user)
    setModalMode(mode)
    setEditValues({
      fullName: user.fullName,
      email: user.email,
      role: user.role,
    })
  }

  function closeModal() {
    if (!submitting) {
      setSelectedUser(null)
    }
  }

  async function handleEditSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!selectedUser) return

    setSubmitting(true)

    try {
      await updateAdminUser(selectedUser.id, editValues)
      setSelectedUser(null)
    } catch (updateError) {
      console.error('Unable to update user profile.', updateError)
      setError('Unable to update this user. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!selectedUser) return

    setSubmitting(true)

    try {
      await deleteAdminUserProfile(selectedUser.id)
      setSelectedUser(null)
    } catch (deleteError) {
      console.error('Unable to delete user profile.', deleteError)
      setError('Unable to delete this user. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="admin-portal-page">
      <section className="dashboard-card admin-filter-card">
        <label>
          <span>Search</span>
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by name or email"
          />
        </label>
        <label>
          <span>Role</span>
          <select
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value as RoleFilter)}
          >
            <option value="all">All</option>
            <option value="admin">Admin</option>
            <option value="owner">Owner</option>
            <option value="tenant">Tenant</option>
          </select>
        </label>
      </section>

      {error ? <div className="room-error">{error}</div> : null}

      <section className="dashboard-card room-table-card">
        {loading ? (
          <div className="room-loading">Loading users...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="room-empty-state">
            <h2>No users found.</h2>
            <p>User accounts will appear here after registration.</p>
          </div>
        ) : (
          <div className="room-table-wrap">
            <table className="room-table admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Created Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td>{user.fullName}</td>
                    <td>{user.email}</td>
                    <td>
                      <span className={`admin-role-badge admin-role-badge--${user.role}`}>
                        {getRoleLabel(user.role)}
                      </span>
                    </td>
                    <td>{formatDate(user.createdAt)}</td>
                    <td>
                      <div className="room-table-actions">
                        <button
                          className="table-action-button"
                          type="button"
                          onClick={() => openModal(user, 'view')}
                        >
                          View
                        </button>
                        <button
                          className="table-action-button"
                          type="button"
                          onClick={() => openModal(user, 'edit')}
                        >
                          Edit
                        </button>
                        <button
                          className="table-action-button danger"
                          type="button"
                          onClick={() => openModal(user, 'delete')}
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

      {selectedUser ? (
        <div className="room-modal-backdrop" role="presentation">
          <section className="room-modal" role="dialog" aria-modal="true">
            <div className="room-modal-header">
              <div>
                <p className="page-eyebrow">
                  {modalMode === 'delete' ? 'Delete User' : 'User Details'}
                </p>
                <h2>{selectedUser.fullName}</h2>
              </div>
              <button
                className="room-modal-close"
                type="button"
                onClick={closeModal}
                aria-label="Close user dialog"
              >
                x
              </button>
            </div>

            <div className="tenant-summary-card">
              {modalMode === 'view' ? (
                <dl className="admin-detail-list">
                  <div>
                    <dt>User ID</dt>
                    <dd>{selectedUser.uid}</dd>
                  </div>
                  <div>
                    <dt>Name</dt>
                    <dd>{selectedUser.fullName}</dd>
                  </div>
                  <div>
                    <dt>Email</dt>
                    <dd>{selectedUser.email}</dd>
                  </div>
                  <div>
                    <dt>Role</dt>
                    <dd>{getRoleLabel(selectedUser.role)}</dd>
                  </div>
                  <div>
                    <dt>Created Date</dt>
                    <dd>{formatDate(selectedUser.createdAt)}</dd>
                  </div>
                  <div>
                    <dt>Updated Date</dt>
                    <dd>{formatDate(selectedUser.updatedAt)}</dd>
                  </div>
                </dl>
              ) : null}

              {modalMode === 'edit' ? (
                <form className="admin-edit-form" onSubmit={handleEditSubmit}>
                  <label>
                    <span>Name</span>
                    <input
                      value={editValues.fullName}
                      disabled={submitting}
                      onChange={(event) =>
                        setEditValues((current) => ({
                          ...current,
                          fullName: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label>
                    <span>Email</span>
                    <input
                      value={editValues.email}
                      disabled={submitting}
                      onChange={(event) =>
                        setEditValues((current) => ({
                          ...current,
                          email: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label>
                    <span>Role</span>
                    <select
                      value={editValues.role}
                      disabled={submitting}
                      onChange={(event) =>
                        setEditValues((current) => ({
                          ...current,
                          role: event.target.value as UserRole,
                        }))
                      }
                    >
                      <option value="admin">Admin</option>
                      <option value="owner">Owner</option>
                      <option value="tenant">Tenant</option>
                    </select>
                  </label>
                  <div className="room-form-actions">
                    <button
                      className="secondary-button"
                      type="button"
                      disabled={submitting}
                      onClick={closeModal}
                    >
                      Cancel
                    </button>
                    <button className="primary-button" type="submit" disabled={submitting}>
                      {submitting ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              ) : null}

              {modalMode === 'delete' ? (
                <div className="admin-edit-form">
                  <p className="room-error">
                    This action cannot be undone. Only the Firestore profile will be
                    deleted.
                  </p>
                  <div className="room-form-actions">
                    <button
                      className="secondary-button"
                      type="button"
                      disabled={submitting}
                      onClick={closeModal}
                    >
                      Cancel
                    </button>
                    <button
                      className="primary-button"
                      type="button"
                      disabled={submitting}
                      onClick={handleDelete}
                    >
                      {submitting ? 'Deleting...' : 'Delete User'}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}

export default AdminUsersPage
