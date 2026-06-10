import {
  ActivityList,
  DashboardSection,
  StatCard,
} from '../components/dashboard'

const tenantStats = [
  { label: 'My Room', value: 'A102', tone: 'primary' },
  { label: 'Current Invoice', value: '$120', tone: 'warning' },
  { label: 'Contract Status', value: 'Active', tone: 'success' },
  { label: 'Utilities This Month', value: '$18', tone: 'primary' },
] as const

const notifications = [
  {
    icon: 'I',
    title: 'Invoice generated',
    timestamp: 'Today',
  },
  {
    icon: 'U',
    title: 'Utility bill updated',
    timestamp: 'Yesterday',
  },
  {
    icon: 'C',
    title: 'Contract renewal reminder',
    timestamp: '3 days ago',
  },
]

const quickActions = [
  'View Contract',
  'View Invoice',
  'Submit Feedback',
  'Open AI Assistant',
]

function TenantHomePage() {
  return (
    <div className="dashboard-page">
      <DashboardSection
        title="Account Summary"
        description="Your current room, billing, contract, and utility status."
      >
        <div className="stats-grid">
          {tenantStats.map((stat) => (
            <StatCard
              key={stat.label}
              label={stat.label}
              value={stat.value}
              tone={stat.tone}
            />
          ))}
        </div>
      </DashboardSection>

      <div className="dashboard-grid dashboard-grid--two">
        <ActivityList title="Recent Notifications" items={notifications} />

        <section className="dashboard-card panel-card">
          <h2>Quick Actions</h2>
          <div className="quick-actions">
            {quickActions.map((action) => (
              <button className="quick-action-button" type="button" key={action}>
                {action}
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

export default TenantHomePage
