import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { DashboardSection, StatCard } from '../../../components/dashboard'
import { useAuth } from '../../auth/useAuth'
import {
  getAnalyticsData,
} from '../services/analytics.service'
import type {
  AnalyticsData,
  AnalyticsScope,
  DateRangeFilter,
  DateRangePreset,
} from '../types'
import './AnalyticsPage.css'

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

const percentFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 1,
})

const pieColors = ['#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#64748b', '#7c3aed']

function getDefaultFilter(): DateRangeFilter {
  return {
    preset: 'last12Months',
  }
}

function exportCsv(
  fileName: string,
  rows: Array<Record<string, string | number>>,
) {
  if (rows.length === 0) {
    return
  }

  const headers = Object.keys(rows[0])
  const csv = [
    headers.join(','),
    ...rows.map((row) =>
      headers
        .map((header) => `"${String(row[header] ?? '').replaceAll('"', '""')}"`)
        .join(','),
    ),
  ].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

function AnalyticsChartCard({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="dashboard-card analytics-chart-card">
      <div>
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      <div className="analytics-chart-wrap">{children}</div>
    </section>
  )
}

function hasAnalyticsData(data: AnalyticsData) {
  return (
    data.summary.revenue > 0 ||
    data.occupancy.totalRooms > 0 ||
    data.contracts.total > 0 ||
    data.invoices.paid + data.invoices.pending + data.invoices.overdue > 0 ||
    data.tenants.total > 0 ||
    data.feedback.total > 0 ||
    data.aiUsage.totalQuestions > 0
  )
}

function AnalyticsPage() {
  const { currentUser } = useAuth()
  const [filter, setFilter] = useState<DateRangeFilter>(getDefaultFilter)
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const scope = useMemo<AnalyticsScope | null>(() => {
    if (!currentUser) return null
    if (currentUser.role === 'owner') return { type: 'owner', ownerId: currentUser.uid }
    if (currentUser.role === 'admin') return { type: 'admin' }
    return null
  }, [currentUser])

  const loadAnalytics = useCallback(async () => {
    if (!scope) {
      setError('You do not have access to analytics.')
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')

    try {
      const nextData = await getAnalyticsData(scope, filter)
      setData(nextData)
    } catch (loadError) {
      console.error('Unable to load analytics.', loadError)
      setError('Unable to load analytics data. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [filter, scope])

  useEffect(() => {
    void loadAnalytics()
  }, [loadAnalytics])

  if (loading && !data) {
    return (
      <div className="analytics-page">
        <section className="dashboard-card dashboard-state-card">
          <div>
            <h2>Loading analytics</h2>
            <p>Fetching reports from Firestore.</p>
          </div>
        </section>
      </div>
    )
  }

  if (error) {
    return (
      <div className="analytics-page">
        <div className="room-error">{error}</div>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="analytics-page">
      <section className="dashboard-card analytics-toolbar">
        <label>
          <span>Date Range</span>
          <select
            value={filter.preset}
            onChange={(event) =>
              setFilter((current) => ({
                ...current,
                preset: event.target.value as DateRangePreset,
              }))
            }
          >
            <option value="last30">Last 30 Days</option>
            <option value="last90">Last 90 Days</option>
            <option value="last6Months">Last 6 Months</option>
            <option value="last12Months">Last 12 Months</option>
            <option value="custom">Custom Range</option>
            <option value="all">All</option>
          </select>
        </label>
        <label>
          <span>Start Date</span>
          <input
            type="date"
            value={filter.startDate ?? ''}
            disabled={filter.preset !== 'custom'}
            onChange={(event) =>
              setFilter((current) => ({ ...current, startDate: event.target.value }))
            }
          />
        </label>
        <label>
          <span>End Date</span>
          <input
            type="date"
            value={filter.endDate ?? ''}
            disabled={filter.preset !== 'custom'}
            onChange={(event) =>
              setFilter((current) => ({ ...current, endDate: event.target.value }))
            }
          />
        </label>
        <div className="analytics-export-actions">
          <button
            className="primary-button"
            type="button"
            disabled={loading}
            onClick={() => void loadAnalytics()}
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          <button
            className="secondary-button"
            type="button"
            onClick={() => exportCsv('revenue-report.csv', data.exports.revenue)}
          >
            Export Revenue CSV
          </button>
          <button
            className="secondary-button"
            type="button"
            onClick={() => exportCsv('invoice-report.csv', data.exports.invoices)}
          >
            Export Invoices CSV
          </button>
          <button
            className="secondary-button"
            type="button"
            onClick={() => exportCsv('feedback-report.csv', data.exports.feedback)}
          >
            Export Feedback CSV
          </button>
          <button
            className="secondary-button"
            type="button"
            onClick={() => exportCsv('tenant-report.csv', data.exports.tenants)}
          >
            Export Tenants CSV
          </button>
        </div>
      </section>

      {!hasAnalyticsData(data) ? (
        <section className="dashboard-card dashboard-state-card">
          <div>
            <h2>No analytics data available.</h2>
            <p>Create invoices, rooms, contracts, tenants, and feedback to see reports.</p>
          </div>
        </section>
      ) : null}

      <DashboardSection
        title="Dashboard Summary"
        description="High-level analytics for the selected reporting period."
      >
        <div className="stats-grid">
          <StatCard
            label="Revenue"
            value={currencyFormatter.format(data.summary.revenue)}
            tone="primary"
          />
          <StatCard
            label="Occupancy Rate"
            value={`${percentFormatter.format(data.summary.occupancyRate)}%`}
            tone="success"
          />
          <StatCard
            label="Active Contracts"
            value={String(data.summary.activeContracts)}
            tone="success"
          />
          <StatCard
            label="Overdue Invoices"
            value={String(data.summary.overdueInvoices)}
            tone="danger"
          />
          <StatCard
            label="Tenant Satisfaction"
            value={`${percentFormatter.format(data.summary.tenantSatisfaction)}%`}
            tone="primary"
          />
        </div>
      </DashboardSection>

      <DashboardSection title="Revenue Analytics">
        <div className="stats-grid">
          <StatCard
            label="Monthly Revenue"
            value={currencyFormatter.format(data.revenue.currentMonthRevenue)}
            tone="primary"
          />
          <StatCard
            label="Yearly Revenue"
            value={currencyFormatter.format(
              data.revenue.yearly.reduce((sum, item) => sum + item.value, 0),
            )}
            tone="success"
          />
          <StatCard
            label="Total Revenue"
            value={currencyFormatter.format(data.revenue.totalRevenue)}
            tone="primary"
          />
          <StatCard
            label="Revenue Growth"
            value={`${percentFormatter.format(data.revenue.growthPercent)}%`}
            helper="Current month vs previous month"
            tone={data.revenue.growthPercent >= 0 ? 'success' : 'danger'}
          />
        </div>
      </DashboardSection>

      <DashboardSection
        title="AI Usage"
        description="Real assistant usage based on saved AI conversations and user questions."
      >
        {!data.aiUsage.supabaseConfigured ? (
          <div className="room-empty-state">AI usage analytics requires Supabase configuration.</div>
        ) : null}
        <div className="stats-grid">
          <StatCard
            label="Total AI Questions"
            value={String(data.aiUsage.totalQuestions)}
            tone="primary"
          />
          <StatCard
            label="Total Conversations"
            value={String(data.aiUsage.totalConversations)}
            tone="success"
          />
          <StatCard
            label="Questions Today"
            value={String(data.aiUsage.questionsToday)}
            tone="warning"
          />
          <StatCard
            label="Average Questions Per Conversation"
            value={percentFormatter.format(data.aiUsage.averageQuestionsPerConversation)}
            tone="primary"
          />
        </div>
      </DashboardSection>

      <div className="analytics-grid">
        <AnalyticsChartCard title="Most Asked Question Types">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.aiUsage.mostAskedQuestionTypes}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" fill="#2563eb" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </AnalyticsChartCard>
      </div>

      <div className="analytics-grid">
        <AnalyticsChartCard title="Monthly Revenue" description="Paid invoice revenue by month.">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data.revenue.monthly}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => currencyFormatter.format(Number(value))} />
              <Line type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </AnalyticsChartCard>

        <AnalyticsChartCard title="Revenue by Year">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.revenue.yearly}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip formatter={(value) => currencyFormatter.format(Number(value))} />
              <Bar dataKey="value" fill="#16a34a" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </AnalyticsChartCard>

        <AnalyticsChartCard title="Occupancy Analytics">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={data.occupancy.distribution}
                dataKey="value"
                nameKey="label"
                outerRadius={90}
                label
              >
                {data.occupancy.distribution.map((entry, index) => (
                  <Cell key={entry.label} fill={pieColors[index % pieColors.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </AnalyticsChartCard>

        <AnalyticsChartCard title="Contracts by Status">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.contracts.byStatus}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#2563eb" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </AnalyticsChartCard>
      </div>

      <DashboardSection title="Contract and Invoice Analytics">
        <div className="stats-grid">
          <StatCard label="Total Contracts" value={String(data.contracts.total)} />
          <StatCard label="Active Contracts" value={String(data.contracts.active)} tone="success" />
          <StatCard label="Expired Contracts" value={String(data.contracts.expired)} tone="danger" />
          <StatCard label="Expiring Soon" value={String(data.contracts.expiringSoon)} tone="warning" />
          <StatCard label="Paid" value={String(data.invoices.paid)} tone="success" />
          <StatCard label="Pending" value={String(data.invoices.pending)} tone="warning" />
          <StatCard label="Overdue" value={String(data.invoices.overdue)} tone="danger" />
        </div>
      </DashboardSection>

      <div className="analytics-grid">
        <AnalyticsChartCard title="Invoice Status Distribution">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={data.invoices.byStatus} dataKey="value" nameKey="label" outerRadius={90} label>
                {data.invoices.byStatus.map((entry, index) => (
                  <Cell key={entry.label} fill={pieColors[index % pieColors.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </AnalyticsChartCard>

        <AnalyticsChartCard title="Tenant Growth Trend">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data.tenants.growthTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#16a34a" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </AnalyticsChartCard>
      </div>

      <DashboardSection title="Tenant Analytics">
        <div className="stats-grid">
          <StatCard label="Total Tenants" value={String(data.tenants.total)} />
          <StatCard label="New Tenants This Month" value={String(data.tenants.newThisMonth)} tone="primary" />
          <StatCard label="Active Tenants" value={String(data.tenants.active)} tone="success" />
        </div>
      </DashboardSection>

      <DashboardSection title="Feedback Analytics">
        <div className="stats-grid">
          <StatCard label="Total Feedbacks" value={String(data.feedback.total)} />
          <StatCard label="AI Analyzed Feedback" value={String(data.feedback.aiAnalyzed)} tone="primary" />
          <StatCard label="Pending AI Feedback" value={String(data.feedback.pendingAI)} tone="warning" />
          <StatCard label="Resolved" value={String(data.feedback.resolved)} tone="success" />
          <StatCard label="Pending" value={String(data.feedback.pending)} tone="warning" />
          <StatCard label="Negative Sentiment" value={String(data.feedback.negative)} tone="danger" />
          <StatCard label="Positive Sentiment" value={String(data.feedback.positive)} tone="success" />
          <StatCard label="Neutral Sentiment" value={String(data.feedback.neutral)} tone="neutral" />
          <StatCard label="Urgent Feedback" value={String(data.feedback.urgent)} tone="danger" />
        </div>
      </DashboardSection>

      <div className="analytics-grid">
        <AnalyticsChartCard title="Feedback Sentiment Distribution">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={data.feedback.sentimentDistribution} dataKey="value" nameKey="label" outerRadius={90} label>
                {data.feedback.sentimentDistribution.map((entry, index) => (
                  <Cell key={entry.label} fill={pieColors[index % pieColors.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </AnalyticsChartCard>

        <AnalyticsChartCard title="Feedback Category Analytics">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.feedback.categoryDistribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#f59e0b" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </AnalyticsChartCard>

        <AnalyticsChartCard title="AI Priority Distribution">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={data.feedback.priorityDistribution} dataKey="value" nameKey="label" outerRadius={90} label>
                {data.feedback.priorityDistribution.map((entry, index) => (
                  <Cell key={entry.label} fill={pieColors[index % pieColors.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </AnalyticsChartCard>

        <AnalyticsChartCard title="Feedback Status by AI Priority">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.feedback.statusByPriority}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#7c3aed" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </AnalyticsChartCard>
      </div>

      <div className="analytics-grid">
        <AnalyticsChartCard
          title="Utility Analytics"
          description={`Average electricity: ${percentFormatter.format(data.utilities.averageElectricityUsage)} units. Average water: ${percentFormatter.format(data.utilities.averageWaterUsage)} units.`}
        >
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data.utilities.trend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="electricity" stroke="#f59e0b" strokeWidth={3} />
              <Line type="monotone" dataKey="water" stroke="#2563eb" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </AnalyticsChartCard>

        <section className="dashboard-card room-table-card">
          <div className="room-table-wrap">
            <table className="room-table analytics-table">
              <thead>
                <tr>
                  <th>Room Number</th>
                  <th>Revenue</th>
                  <th>Occupancy %</th>
                  <th>Active Contracts</th>
                </tr>
              </thead>
              <tbody>
                {data.topRooms.length === 0 ? (
                  <tr>
                    <td colSpan={4}>No room analytics available.</td>
                  </tr>
                ) : (
                  data.topRooms.map((room) => (
                    <tr key={room.roomId}>
                      <td>{room.roomNumber}</td>
                      <td>{currencyFormatter.format(room.revenue)}</td>
                      <td>{percentFormatter.format(room.occupancyRate)}%</td>
                      <td>{room.activeContracts}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}

export default AnalyticsPage
