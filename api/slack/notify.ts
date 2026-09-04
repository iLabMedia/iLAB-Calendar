type SlackNotifyPayload = {
  action?: 'create' | 'update' | 'delete' | 'complete'
  schedule?: {
    id?: string
    title?: string
    type?: 'team' | 'event' | 'project'
    date?: string
    repeatUntil?: string
    startTime?: string
    endTime?: string
    allDay?: boolean
    teamName?: string
    ownerName?: string
    description?: string
    completed?: boolean
  }
}

type VercelRequest = {
  method?: string
  body?: SlackNotifyPayload | string
}

type VercelResponse = {
  status: (code: number) => VercelResponse
  json: (body: Record<string, unknown>) => void
  setHeader: (name: string, value: string) => void
}

const actionLabels: Record<string, string> = {
  create: '등록',
  update: '수정',
  delete: '삭제',
  complete: '완료',
}

function parseBody(body: VercelRequest['body']): SlackNotifyPayload {
  if (!body) return {}
  if (typeof body === 'string') {
    try { return JSON.parse(body) as SlackNotifyPayload } catch { return {} }
  }
  return body
}

function trimText(value: unknown, fallback = '-') {
  const text = String(value || '').trim()
  return text || fallback
}

function buildSlackText(payload: SlackNotifyPayload) {
  const action = payload.action || 'create'
  const schedule = payload.schedule || {}
  const typeLabel = schedule.type === 'project' ? '프로젝트' : '일정'
  const actionLabel = actionLabels[action] || '변경'
  const dateLabel = schedule.type === 'project'
    ? `${trimText(schedule.date)} ~ ${trimText(schedule.repeatUntil || schedule.date)}`
    : `${trimText(schedule.date)} ${schedule.allDay ? '하루종일' : `${trimText(schedule.startTime)}~${trimText(schedule.endTime)}`}`
  const lines = [
    `*[I.LAB Scheduler] ${typeLabel} ${actionLabel}*`,
    `• 제목: ${trimText(schedule.title)}`,
    `• 팀: ${trimText(schedule.teamName)}`,
    `• 담당: ${trimText(schedule.ownerName)}`,
    `• 기간/시간: ${dateLabel}`,
  ]
  if (schedule.completed) lines.push('• 상태: 완료')
  if (schedule.description) lines.push(`• 메모: ${trimText(schedule.description)}`)
  return lines.join('\n')
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).json({ ok: true })
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method_not_allowed' })

  const token = process.env.SLACK_BOT_TOKEN
  const channel = process.env.SLACK_CHANNEL_ID || 'C0BL9PMAA2E'
  if (!token) return res.status(200).json({ ok: false, skipped: true, error: 'missing_slack_bot_token' })

  const payload = parseBody(req.body)
  const text = buildSlackText(payload)
  const slackResponse = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({ channel, text, mrkdwn: true }),
  })
  const result = await slackResponse.json() as { ok?: boolean; error?: string; ts?: string }
  if (!result.ok) return res.status(200).json({ ok: false, error: result.error || 'slack_error' })
  return res.status(200).json({ ok: true, ts: result.ts })
}
