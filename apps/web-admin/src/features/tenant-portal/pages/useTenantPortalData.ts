import { useCallback, useEffect, useState } from 'react'

import { useAuth } from '../../auth/useAuth'
import {
  createTenantFeedback,
  getCurrentTenant,
} from '../services/tenantPortal.service'
import type { TenantFeedbackFormValues, TenantPortalData } from '../types'

type TenantPortalState = {
  data: TenantPortalData | null
  isLoading: boolean
  error: string
  reload: () => Promise<void>
  submitFeedback: (values: TenantFeedbackFormValues) => Promise<void>
}

export function useTenantPortalData(): TenantPortalState {
  const { currentUser } = useAuth()
  const [data, setData] = useState<TenantPortalData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    if (!currentUser) {
      setData(null)
      setError('You must be signed in to view tenant portal data.')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const tenantPortalData = await getCurrentTenant(currentUser)
      setData(tenantPortalData)
    } catch {
      setError('Unable to load tenant portal data. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [currentUser])

  useEffect(() => {
    void Promise.resolve().then(reload)
  }, [reload])

  async function submitFeedback(values: TenantFeedbackFormValues) {
    if (!data?.tenant) {
      throw new Error('No tenant profile was found for this account.')
    }

    await createTenantFeedback(data.tenant, values)
    await reload()
  }

  return {
    data,
    isLoading,
    error,
    reload,
    submitFeedback,
  }
}
