import { usePathname, useRouter, type Href } from 'expo-router'
import type { TenantTabKey } from '../../constants/navigation'

const tenantTabRoutes: Record<TenantTabKey, Href> = {
  home: '/tenant/home' as Href,
  invoices: '/tenant/my-invoices' as Href,
  feedback: '/tenant/my-feedback' as Href,
  chat: '/tenant/chat' as Href,
  notifications: '/tenant/notifications' as Href,
  more: '/tenant/more' as Href,
  room: '/tenant/my-room' as Href,
  contract: '/tenant/my-contract' as Href,
  utilities: '/tenant/my-utilities' as Href,
  profile: '/tenant/profile' as Href,
}

export function useTenantNavigation() {
  const router = useRouter()
  const pathname = usePathname()

  return (tab: TenantTabKey) => {
    const targetRoute = tenantTabRoutes[tab] ?? tenantTabRoutes.home

    if (pathname === targetRoute) {
      return
    }

    router.replace(targetRoute)
  }
}
