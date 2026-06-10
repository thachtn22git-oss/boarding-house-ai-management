import { createBrowserRouter, Navigate } from 'react-router-dom'

import AuthGuard from './guards/AuthGuard'
import RoleGuard from './guards/RoleGuard'
import AdminLayout from '../components/layout/AdminLayout'
import AnalyticsPage from '../features/analytics/pages/AnalyticsPage'
import AdminOwnersPage from '../features/admin/pages/AdminOwnersPage'
import AdminSystemOverviewPage from '../features/admin/pages/AdminSystemOverviewPage'
import AdminTenantsPage from '../features/admin/pages/AdminTenantsPage'
import AdminUsersPage from '../features/admin/pages/AdminUsersPage'
import ChatPage from '../features/chat/pages/ChatPage'
import AdminDashboardPage from '../pages/AdminDashboardPage'
import AiAssistantPage from '../pages/AiAssistantPage'
import ContractManagementPage from '../features/contracts/pages/ContractManagementPage'
import DashboardPage from '../pages/DashboardPage'
import FeedbackManagementPage from '../features/feedbacks/pages/FeedbackManagementPage'
import InvoiceManagementPage from '../features/invoices/pages/InvoiceManagementPage'
import LoginPage from '../features/auth/pages/LoginPage'
import MyContractPage from '../features/tenant-portal/pages/MyContractPage'
import MyFeedbackPage from '../features/tenant-portal/pages/MyFeedbackPage'
import MyInvoicesPage from '../features/tenant-portal/pages/MyInvoicesPage'
import MyRoomPage from '../features/tenant-portal/pages/MyRoomPage'
import MyUtilitiesPage from '../features/tenant-portal/pages/MyUtilitiesPage'
import NotificationCenterPage from '../features/notifications/pages/NotificationCenterPage'
import RoutePlaceholderPage from '../pages/RoutePlaceholderPage'
import RoomManagementPage from '../features/rooms/pages/RoomManagementPage'
import TenantHomePage from '../features/tenant-portal/pages/TenantHomePage'
import TenantManagementPage from '../features/tenants/pages/TenantManagementPage'
import UtilitiesManagementPage from '../features/utilities/pages/UtilitiesManagementPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/owner',
    element: (
      <AuthGuard>
        <RoleGuard allowedRoles={['owner']}>
          <AdminLayout />
        </RoleGuard>
      </AuthGuard>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/owner/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <DashboardPage />,
      },
      {
        path: 'rooms',
        element: <RoomManagementPage />,
      },
      {
        path: 'tenants',
        element: <TenantManagementPage />,
      },
      {
        path: 'contracts',
        element: <ContractManagementPage />,
      },
      {
        path: 'invoices',
        element: <InvoiceManagementPage />,
      },
      {
        path: 'utilities',
        element: <UtilitiesManagementPage />,
      },
      {
        path: 'feedback',
        element: <FeedbackManagementPage />,
      },
      {
        path: 'feedbacks',
        element: <Navigate to="/owner/feedback" replace />,
      },
      {
        path: 'notifications',
        element: <NotificationCenterPage />,
      },
      {
        path: 'chat',
        element: <ChatPage />,
      },
      {
        path: 'analytics',
        element: <AnalyticsPage />,
      },
      {
        path: 'ai-assistant',
        element: <AiAssistantPage />,
      },
    ],
  },
  {
    path: '/admin',
    element: (
      <AuthGuard>
        <RoleGuard allowedRoles={['admin']}>
          <AdminLayout />
        </RoleGuard>
      </AuthGuard>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/admin/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <AdminDashboardPage />,
      },
      {
        path: 'owners',
        element: <AdminOwnersPage />,
      },
      {
        path: 'boarding-houses',
        element: <RoutePlaceholderPage path="/admin/boarding-houses" />,
      },
      {
        path: 'users',
        element: <AdminUsersPage />,
      },
      {
        path: 'tenants',
        element: <AdminTenantsPage />,
      },
      {
        path: 'system-activity',
        element: <Navigate to="/admin/system-overview" replace />,
      },
      {
        path: 'notifications',
        element: <NotificationCenterPage />,
      },
      {
        path: 'chat',
        element: <ChatPage />,
      },
      {
        path: 'analytics',
        element: <AnalyticsPage />,
      },
      {
        path: 'system-overview',
        element: <AdminSystemOverviewPage />,
      },
    ],
  },
  {
    path: '/tenant',
    element: (
      <AuthGuard>
        <RoleGuard allowedRoles={['tenant']}>
          <AdminLayout />
        </RoleGuard>
      </AuthGuard>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/tenant/home" replace />,
      },
      {
        path: 'home',
        element: <TenantHomePage />,
      },
      {
        path: 'my-room',
        element: <MyRoomPage />,
      },
      {
        path: 'my-contract',
        element: <MyContractPage />,
      },
      {
        path: 'my-invoices',
        element: <MyInvoicesPage />,
      },
      {
        path: 'my-utilities',
        element: <MyUtilitiesPage />,
      },
      {
        path: 'my-feedback',
        element: <MyFeedbackPage />,
      },
      {
        path: 'notifications',
        element: <NotificationCenterPage />,
      },
      {
        path: 'chat',
        element: <ChatPage />,
      },
      {
        path: 'utilities',
        element: <Navigate to="/tenant/my-utilities" replace />,
      },
      {
        path: 'feedback',
        element: <Navigate to="/tenant/my-feedback" replace />,
      },
    ],
  },
])
