type InsightCardProps = {
  title: string
  insights: Array<
    | string
    | {
        id: string
        title: string
        description: string
        severity?: 'low' | 'medium' | 'high' | 'info' | 'warning' | 'success' | 'danger'
        icon?: string
        createdAt?: string
      }
  >
  emptyMessage?: string
}

function InsightCard({ title, insights, emptyMessage }: InsightCardProps) {
  return (
    <section className="dashboard-card insight-card">
      <h2>{title}</h2>
      {insights.length === 0 ? (
        <p className="dashboard-empty-text">
          {emptyMessage ?? 'No insights available.'}
        </p>
      ) : (
        <ul className="insight-list">
          {insights.map((insight) => {
            if (typeof insight === 'string') {
              return <li key={insight}>{insight}</li>
            }

            return (
              <li
                key={insight.id}
                className={`insight-item insight-item--${insight.severity ?? 'info'}`}
              >
                {insight.icon ? (
                  <span className="insight-icon" aria-hidden="true">
                    {insight.icon}
                  </span>
                ) : null}
                <div>
                  <div className="insight-title-row">
                    <strong>{insight.title}</strong>
                    {insight.severity ? (
                      <span className={`dashboard-badge dashboard-badge--${insight.severity}`}>
                        {insight.severity}
                      </span>
                    ) : null}
                  </div>
                  <span>{insight.description}</span>
                  {insight.createdAt ? (
                    <small>{new Date(insight.createdAt).toLocaleDateString()}</small>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

export default InsightCard
