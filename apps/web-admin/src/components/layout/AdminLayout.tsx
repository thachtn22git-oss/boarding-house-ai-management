import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'

import {
  appLabels,
  getNavigationForRole,
  getPageByPath,
  getPortalLabelForRole,
} from '../../config/navigation'
import { useAuth } from '../../features/auth/useAuth'
import { subscribeToUserChatRooms } from '../../features/chat/services/chat.service'
import NotificationBell from '../notifications/NotificationBell'
import './AdminLayout.css'

function getInitials(fullName: string | undefined, email: string | undefined) {
  const nameParts =
    fullName
      ?.trim()
      .split(/\s+/)
      .filter(Boolean) ?? []

  if (nameParts.length > 0) {
    return nameParts
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
  }

  return email?.slice(0, 2).toUpperCase() ?? 'US'
}

function AdminLayout() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const currentPage = getPageByPath(pathname)
  const { currentUser, logout } = useAuth()
  const portalLabel = getPortalLabelForRole(currentUser?.role)
  const navigationItems = getNavigationForRole(currentUser?.role)
  const [chatUnreadCount, setChatUnreadCount] = useState(0)

  useEffect(() => {
    if (!currentUser || currentUser.role === 'admin') {
      setChatUnreadCount(0)
      return undefined
    }

    return subscribeToUserChatRooms(
      currentUser.uid,
      (rooms) => {
        setChatUnreadCount(
          rooms.reduce(
            (total, room) => total + (room.unreadCounts[currentUser.uid] ?? 0),
            0,
          ),
        )
      },
      (error) => {
        console.warn('Unable to subscribe to chat unread counts.', error)
      },
    )
  }, [currentUser])

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar" aria-label="Application navigation">
        <div>
          <div className="admin-brand">
            <span className="admin-brand-mark">BH</span>
            <div className="admin-brand-text">
              <strong>{appLabels.productName}</strong>
              <span>{portalLabel}</span>
            </div>
          </div>

          <nav className="admin-nav">
            {navigationItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  isActive ? 'admin-nav-link active' : 'admin-nav-link'
                }
                title={item.label}
              >
                <span className="admin-nav-short">{item.shortLabel}</span>
                <span className="admin-nav-text">
                  {item.label}
                  {item.key === 'chat' && chatUnreadCount > 0 ? (
                    <span className="admin-nav-badge">
                      {chatUnreadCount > 99 ? '99+' : chatUnreadCount}
                    </span>
                  ) : null}
                </span>
              </NavLink>
            ))}
          </nav>
        </div>

        <button className="admin-logout-button" type="button" onClick={handleLogout}>
          <span className="admin-nav-short">LO</span>
          <span className="admin-nav-text">Logout</span>
        </button>
      </aside>

      <div className="admin-main">
        <header className="admin-header">
          <div>
            <p className="admin-header-eyebrow">
              {currentPage.portalLabel.toUpperCase()}
            </p>
            <h1>{currentPage.label}</h1>
            <p className="admin-header-subtitle">{currentPage.description}</p>
          </div>

          <div className="admin-header-actions">
            <NotificationBell />
            <div className="admin-avatar" aria-label="Admin user">
              {getInitials(currentUser?.fullName, currentUser?.email)}
            </div>
          </div>
        </header>

        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AdminLayout
