export type ActivityItem = {
  icon: string
  title: string
  timestamp: string
}

type ActivityListProps = {
  title: string
  items: ActivityItem[]
  emptyMessage?: string
}

function ActivityList({ title, items, emptyMessage }: ActivityListProps) {
  return (
    <section className="dashboard-card activity-card">
      <h2>{title}</h2>
      {items.length === 0 ? (
        <p className="dashboard-empty-text">
          {emptyMessage ?? 'No activity available.'}
        </p>
      ) : (
        <ul className="activity-list">
          {items.map((item) => (
            <li className="activity-item" key={`${item.title}-${item.timestamp}`}>
              <span className="activity-icon">{item.icon}</span>
              <div>
                <p className="activity-title">{item.title}</p>
                <p className="activity-time">{item.timestamp}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default ActivityList
