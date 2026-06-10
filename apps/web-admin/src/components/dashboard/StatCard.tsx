type StatCardTone = 'primary' | 'success' | 'warning' | 'danger' | 'neutral'

type StatCardProps = {
  label: string
  value: string
  helper?: string
  tone?: StatCardTone
}

function StatCard({ label, value, helper, tone = 'primary' }: StatCardProps) {
  return (
    <article className={`dashboard-card stat-card stat-card--${tone}`}>
      <p className="stat-card-label">{label}</p>
      <div className="stat-card-value">{value}</div>
      {helper ? <p className="stat-card-helper">{helper}</p> : null}
    </article>
  )
}

export default StatCard
