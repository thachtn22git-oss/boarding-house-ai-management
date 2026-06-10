type ProgressTone = 'primary' | 'success' | 'warning' | 'danger'

type ProgressItem = {
  label: string
  value: number
  tone?: ProgressTone
}

type ProgressCardProps = {
  title: string
  items: ProgressItem[]
}

function ProgressCard({ title, items }: ProgressCardProps) {
  return (
    <section className="dashboard-card panel-card progress-card">
      <h2>{title}</h2>
      {items.map((item) => (
        <div className="progress-row" key={item.label}>
          <div className="progress-row-header">
            <span>{item.label}</span>
            <span>{item.value}%</span>
          </div>
          <div className="progress-track" aria-hidden="true">
            <div
              className={`progress-fill progress-fill--${item.tone ?? 'primary'}`}
              style={{ width: `${item.value}%` }}
            />
          </div>
        </div>
      ))}
    </section>
  )
}

export default ProgressCard
