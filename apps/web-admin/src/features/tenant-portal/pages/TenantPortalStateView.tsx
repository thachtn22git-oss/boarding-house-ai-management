import type { ReactNode } from 'react'

type TenantPortalStateViewProps = {
  title: string
  message: string
  action?: ReactNode
}

function TenantPortalStateView({
  title,
  message,
  action,
}: TenantPortalStateViewProps) {
  return (
    <section className="dashboard-card dashboard-state-card">
      <div>
        <h2>{title}</h2>
        <p>{message}</p>
        {action}
      </div>
    </section>
  )
}

export default TenantPortalStateView
