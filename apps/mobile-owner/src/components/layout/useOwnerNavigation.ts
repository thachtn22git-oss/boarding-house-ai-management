import { usePathname, useRouter, type Href } from 'expo-router'
import type { OwnerTabKey } from '../../constants/navigation'

const ownerTabRoutes: Record<OwnerTabKey, Href> = {
  dashboard: '/owner/dashboard' as Href,
  rooms: '/owner/rooms' as Href,
  invoices: '/owner/invoices' as Href,
  chat: '/owner/chat' as Href,
  feedback: '/owner/feedback' as Href,
  more: '/owner/more' as Href,
  tenants: '/owner/tenants' as Href,
  contracts: '/owner/contracts' as Href,
  utilities: '/owner/utilities' as Href,
  notifications: '/owner/notifications' as Href,
  aiAssistant: '/owner/ai-assistant' as Href,
  profile: '/owner/profile' as Href,
}

export function useOwnerNavigation() {
  const router = useRouter()
  const pathname = usePathname()

  return (tab: OwnerTabKey) => {
    const targetRoute = ownerTabRoutes[tab] ?? ownerTabRoutes.dashboard

    if (pathname === targetRoute) {
      return
    }

    router.replace(targetRoute)
  }
}
