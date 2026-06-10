import type { ReactNode } from 'react'

type DashboardSectionProps = {
  title: string
  description?: string
  children: ReactNode
}

function DashboardSection({
  title,
  description,
  children,
}: DashboardSectionProps) {
  return (
    <section className="dashboard-section">
      <div className="dashboard-section-header">
        <div>
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
      </div>
      {children}
    </section>
  )
}

export default DashboardSection
