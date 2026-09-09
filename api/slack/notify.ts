import { buildChangeNotice, fetchAppData, postSlack, type SlackAction, type Schedule } from '../_lib/scheduler.js'

type SlackNotifyPayload = {
  action?: SlackAction
  schedule?: Partial<Schedule> & { teamName?: string; ownerName?: string }
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

function parseBody(body: VercelRequest['body']): SlackNotifyPayload {
  if (!body) return {}
  if (typeof body === 'string') {
    try { return JSON.parse(body) as SlackNotifyPayload } catch { return {} }
  }
  return body
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).json({ ok: true })
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method_not_allowed' })

  try {
    const payload = parseBody(req.body)
    if (payload.schedule?.notifySlack === false) return res.status(200).json({ ok: false, skipped: true, error: 'notify_slack_disabled' })
    const data = await fetchAppData().catch(() => ({ teams: [], staff: [], schedules: [] }))
    const text = buildChangeNotice(data, payload.action || 'create', payload.schedule || {})
    const result = await postSlack(text)
    return res.status(200).json(result)
  } catch (error) {
    return res.status(200).json({ ok: false, error: error instanceof Error ? error.message : 'notify_failed' })
  }
}
