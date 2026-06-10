import { OwnerRoute } from '../components/layout/OwnerRoute'
import { InvoicesScreen } from '../features/dashboard/OwnerListScreens'

export default function InvoicesRoute() {
  return (
    <OwnerRoute activeTab="invoices">
      <InvoicesScreen />
    </OwnerRoute>
  )
}
