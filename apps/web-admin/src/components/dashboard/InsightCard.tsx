type InsightCardProps = {
  title: string
  insights: Array<string | { id: string; title: string; description: string }>
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
              <li key={insight.id}>
                <strong>{insight.title}</strong>
                <span>{insight.description}</span>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

export default InsightCard
