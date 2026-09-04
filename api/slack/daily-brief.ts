import { buildDailyBrief, fetchAppData, kstToday, postSlack } from '../_lib/scheduler.js'

type VercelRequest = { method?: string; query?: Record<string, string | string[]>; headers?: Record<string, string | string[] | undefined> }
type VercelResponse = { status: (code: number) => VercelResponse; json: (body: Record<string, unknown>) => void }

function queryValue(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] : value }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method && req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method_not_allowed' })
  const cronSecret = process.env.CRON_SECRET
  const requestSecret = queryValue(req.query?.secret) || String(req.headers?.authorization || '').replace(/^Bearer\s+/i, '')
  if (cronSecret && requestSecret !== cronSecret) return res.status(401).json({ ok: false, error: 'unauthorized' })

  try {
    const date = queryValue(req.query?.date) || kstToday()
    const data = await fetchAppData()
    const text = buildDailyBrief(data, date)
    const result = await postSlack(text)
    return res.status(200).json({ ...result, date })
  } catch (error) {
    return res.status(200).json({ ok: false, error: error instanceof Error ? error.message : 'daily_brief_failed' })
  }
}
