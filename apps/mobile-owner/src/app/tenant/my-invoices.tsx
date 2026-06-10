import { TenantRoute } from '../../components/layout/TenantRoute'
import { MyInvoicesScreen } from '../../features/tenant-portal/TenantDetailScreens'

export default function MyInvoicesRoute() {
  return (
    <TenantRoute activeTab="invoices">
      <MyInvoicesScreen />
    </TenantRoute>
  )
}
