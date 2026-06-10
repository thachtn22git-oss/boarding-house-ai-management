import { useRouter, type Href } from 'expo-router'
import type { OwnerTabKey } from '../../constants/navigation'

export function useOwnerNavigation() {
  const router = useRouter()

  return (tab: OwnerTabKey) => {
    switch (tab) {
      case 'dashboard':
        router.push('/dashboard' as Href)
        break
      case 'rooms':
        router.push('/rooms' as Href)
        break
      case 'invoices':
        router.push('/invoices' as Href)
        break
      case 'feedback':
        router.push('/feedback' as Href)
        break
      case 'tenants':
        router.push('/tenants' as Href)
        break
      case 'contracts':
        router.push('/contracts' as Href)
        break
      case 'utilities':
        router.push('/utilities' as Href)
        break
      case 'notifications':
        router.push('/notifications' as Href)
        break
      case 'profile':
        router.push('/profile' as Href)
        break
      case 'more':
        router.push('/more' as Href)
        break
      default:
        router.push('/dashboard' as Href)
        break
    }
  }
}
