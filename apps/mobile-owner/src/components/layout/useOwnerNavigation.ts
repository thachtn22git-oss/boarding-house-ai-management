import { useRouter, type Href } from 'expo-router'
import type { OwnerTabKey } from '../../constants/navigation'

export function useOwnerNavigation() {
  const router = useRouter()

  return (tab: OwnerTabKey) => {
    switch (tab) {
      case 'dashboard':
        router.push('/owner/dashboard' as Href)
        break
      case 'rooms':
        router.push('/owner/rooms' as Href)
        break
      case 'invoices':
        router.push('/owner/invoices' as Href)
        break
      case 'chat':
        router.push('/owner/chat' as Href)
        break
      case 'feedback':
        router.push('/owner/feedback' as Href)
        break
      case 'tenants':
        router.push('/owner/tenants' as Href)
        break
      case 'contracts':
        router.push('/owner/contracts' as Href)
        break
      case 'utilities':
        router.push('/owner/utilities' as Href)
        break
      case 'notifications':
        router.push('/owner/notifications' as Href)
        break
      case 'profile':
        router.push('/owner/profile' as Href)
        break
      case 'more':
        router.push('/owner/more' as Href)
        break
      default:
        router.push('/owner/dashboard' as Href)
        break
    }
  }
}
