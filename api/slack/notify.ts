import { buildChangeNotice, fetchAppData, postSlack, type SlackAction, type Schedule } from '../_lib/scheduler.js'

type CompanyDocPayload = { title?: string; category?: string; summary?: string; content?: string; isPinned?: boolean; imageUrls?: string[]; authorName?: string }
type SlackNotifyPayload = {
  action?: SlackAction | 'create' | 'update'
  schedule?: Partial<Schedule> & { teamName?: string; ownerName?: string }
  companyDoc?: CompanyDocPayload
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


function buildCompanyDocNotice(action: SlackNotifyPayload['action'], doc: CompanyDocPayload) {
  const actionLabel = action === 'update' ? '수정' : '등록'
  const pinned = doc.isPinned ? '📌 중요문서 · ' : ''
  const images = doc.imageUrls?.length ? `
첨부 이미지 ${doc.imageUrls.length}개` : ''
  const summary = doc.summary ? `
${doc.summary}` : ''
  const author = doc.authorName ? `
작성자: ${doc.authorName}` : ''
  return `*🏢 [I.LAB Scheduler] 회사정보 ${actionLabel}*
${pinned}[${doc.category || '회사정책'}] ${doc.title || '제목 없는 문서'}${summary}${author}${images}`
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
    if (payload.companyDoc) {
      const result = await postSlack(buildCompanyDocNotice(payload.action || 'create', payload.companyDoc))
      return res.status(200).json(result)
    }
    if (payload.schedule?.notifySlack === false) return res.status(200).json({ ok: false, skipped: true, error: 'notify_slack_disabled' })
    const data = await fetchAppData().catch(() => ({ teams: [], staff: [], schedules: [] }))
    const text = buildChangeNotice(data, (payload.action || 'create') as SlackAction, payload.schedule || {})
    const result = await postSlack(text)
    return res.status(200).json(result)
  } catch (error) {
    return res.status(200).json({ ok: false, error: error instanceof Error ? error.message : 'notify_failed' })
  }
}
