export type FeedbackRecommendation = {
  suggestedResolution: string
  suggestedReply: string
  actionLabel: string
}

const defaultRecommendation: FeedbackRecommendation = {
  suggestedResolution:
    'Review the feedback and determine appropriate action based on the reported issue.',
  suggestedReply:
    'Thank you for your feedback. We will review the issue and follow up accordingly.',
  actionLabel: 'General Review',
}

const rules: Array<FeedbackRecommendation & { keywords: string[] }> = [
  {
    keywords: ['leak', 'water', 'pipe', 'bathroom', 'toilet', 'door', 'window', 'broken', 'repair'],
    suggestedResolution:
      'Inspect the reported issue and schedule maintenance as soon as possible. Verify the affected equipment and replace damaged parts if necessary.',
    suggestedReply:
      'Thank you for reporting this issue. We will arrange maintenance staff to inspect and resolve it as soon as possible.',
    actionLabel: 'Maintenance Inspection',
  },
  {
    keywords: ['wifi', 'internet', 'network', 'signal', 'slow internet'],
    suggestedResolution:
      'Check router status, internet connection quality, and signal strength in the affected room. Restart networking equipment if necessary.',
    suggestedReply:
      'Thank you for your feedback. We will inspect the network equipment and internet connection quality shortly.',
    actionLabel: 'Network Check',
  },
  {
    keywords: ['electricity', 'power', 'light', 'socket', 'switch'],
    suggestedResolution:
      'Inspect electrical equipment and verify power supply stability. Schedule an electrician if required.',
    suggestedReply:
      'Thank you for reporting this issue. We will inspect the electrical system and address the problem promptly.',
    actionLabel: 'Electrical Inspection',
  },
  {
    keywords: ['water pressure', 'water supply', 'no water', 'dirty water'],
    suggestedResolution:
      'Inspect water supply system and verify pressure levels. Check for blockage or service interruption.',
    suggestedReply:
      'Thank you for informing us. We will inspect the water system and resolve the issue as soon as possible.',
    actionLabel: 'Water Supply Review',
  },
  {
    keywords: ['noise', 'loud', 'party', 'disturbing'],
    suggestedResolution:
      'Review reported disturbance and contact involved tenants if necessary. Monitor repeated complaints.',
    suggestedReply:
      'Thank you for your report. We will investigate the situation and take appropriate action.',
    actionLabel: 'Noise Review',
  },
  {
    keywords: ['security', 'theft', 'suspicious', 'unsafe'],
    suggestedResolution:
      'Review security records, inspect relevant areas, and take immediate preventive measures.',
    suggestedReply:
      'Thank you for reporting this concern. We take security seriously and will investigate immediately.',
    actionLabel: 'Security Review',
  },
]

export function getRecommendationFromData(data: Record<string, unknown>): FeedbackRecommendation {
  const text = `${String(data.title ?? '')} ${String(data.content ?? '')} ${String(data.aiSuggestedCategory ?? data.category ?? '')}`.toLowerCase()
  const fallback = rules.find((rule) =>
    rule.keywords.some((keyword) => text.includes(keyword)),
  ) ?? defaultRecommendation

  return {
    suggestedResolution:
      typeof data.aiSuggestedResolution === 'string' && data.aiSuggestedResolution
        ? data.aiSuggestedResolution
        : fallback.suggestedResolution,
    suggestedReply:
      typeof data.aiSuggestedReply === 'string' && data.aiSuggestedReply
        ? data.aiSuggestedReply
        : fallback.suggestedReply,
    actionLabel: fallback.actionLabel,
  }
}
