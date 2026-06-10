import { useRouter, type Href } from 'expo-router'
import type { TenantTabKey } from '../../constants/navigation'

export function useTenantNavigation() {
  const router = useRouter()

  return (tab: TenantTabKey) => {
    switch (tab) {
      case 'home':
        router.push('/tenant/home' as Href)
        break
      case 'invoices':
        router.push('/tenant/my-invoices' as Href)
        break
      case 'feedback':
        router.push('/tenant/my-feedback' as Href)
        break
      case 'notifications':
        router.push('/tenant/notifications' as Href)
        break
      case 'room':
        router.push('/tenant/my-room' as Href)
        break
      case 'contract':
        router.push('/tenant/my-contract' as Href)
        break
      case 'utilities':
        router.push('/tenant/my-utilities' as Href)
        break
      case 'profile':
        router.push('/tenant/profile' as Href)
        break
      case 'more':
        router.push('/tenant/more' as Href)
        break
      default:
        router.push('/tenant/home' as Href)
        break
    }
  }
}
