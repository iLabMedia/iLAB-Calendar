import { createClient } from '@supabase/supabase-js'
import { createHmac, randomUUID, timingSafeEqual } from 'crypto'

export type Role = 'admin' | 'employee' | 'free'
export type ScheduleType = 'team' | 'event' | 'project'
export type RepeatType = 'none' | 'daily' | 'weekly' | 'monthly'
export type Team = { id: string; name: string; slackChannel: string; color: string }
export type Staff = { id: string; name: string; teamId: string; role: Role; password: string }
export type Schedule = {
  id: string
  title: string
  type: ScheduleType
  date: string
  startTime: string
  endTime: string
  allDay: boolean
  teamId: string
  memberIds: string[]
  ownerId: string
  description: string
  color: string
  repeat: RepeatType
  repeatUntil: string
  notifySlack: boolean
  createdBy: string
  updatedAt: string
  completed?: boolean
}
export type AppData = { teams: Team[]; staff: Staff[]; schedules: Schedule[] }
export type SlackAction = 'create' | 'update' | 'delete' | 'complete'

const PROJECT_DONE_MARK = '[[PROJECT_DONE]]'
const BRAND = '#5D2E8D'
const ISSUE_TITLES = ['연차', '휴가', '오전반차', '오후반차', '반차', '출장', '외근']
const OFFICE_TITLES = ['사무실', '내근']

function clean(value: string | undefined) { return (value || '').trim().replace(/^['"]|['"]$/g, '') }
function cleanUrl(value: string | undefined) { return clean(value).replace(/\/rest\/v1\/?$/i, '').replace(/\/$/, '') }
export function kstToday(offsetDays = 0) {
  const now = new Date()
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  kst.setUTCDate(kst.getUTCDate() + offsetDays)
  return kst.toISOString().slice(0, 10)
}
export function addDays(iso: string, days: number) {
  const [year, month, day] = iso.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}
function stripDone(text = '') { return text.replace(PROJECT_DONE_MARK, '').trim() }
function withDone(text = '', completed = false) { const stripped = stripDone(text); return completed ? `${PROJECT_DONE_MARK}${stripped ? `\n${stripped}` : ''}` : stripped }
function normalizeType(type: unknown): ScheduleType { return type === 'project' ? 'project' : 'event' }
function normalizeRepeat(type: unknown): RepeatType { return type === 'daily' || type === 'weekly' || type === 'monthly' ? type : 'none' }
function titlePriority(title: string) {
  if (ISSUE_TITLES.some((word) => title.includes(word))) return 0
  if (OFFICE_TITLES.some((word) => title.includes(word))) return 9
  return 1
}
function timeLabel(schedule: Schedule) { return schedule.allDay ? '종일' : `${schedule.startTime}~${schedule.endTime}` }

export function getSupabaseAdmin() {
  const url = cleanUrl(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL)
  const key = clean(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY)
  if (!url || !key) throw new Error('missing_supabase_env')
  return createClient(url, key, { auth: { persistSession: false } })
}

function rowToTeam(row: Record<string, unknown>): Team {
  return { id: String(row.id), name: String(row.name || '팀 미지정'), slackChannel: String(row.slack_channel || ''), color: String(row.color || BRAND) }
}
function rowToStaff(row: Record<string, unknown>): Staff {
  return { id: String(row.id), name: String(row.name || '이름 없음'), teamId: String(row.team_id || ''), role: (row.role === 'admin' || row.role === 'free' ? row.role : 'employee') as Role, password: String(row.password_code || '') }
}
function rowToSchedule(row: Record<string, unknown>): Schedule {
  const content = String(row.content || '')
  return {
    id: String(row.id),
    title: String(row.title || '제목 없는 일정'),
    type: normalizeType(row.type),
    date: String(row.start_date || row.date || kstToday()),
    startTime: String(row.start_time || '09:00').slice(0, 5),
    endTime: String(row.end_time || row.start_time || '10:00').slice(0, 5),
    allDay: Boolean(row.is_all_day ?? true),
    teamId: String(row.team_id || ''),
    memberIds: row.owner_id ? [String(row.owner_id)] : [],
    ownerId: String(row.owner_id || ''),
    description: stripDone(content),
    color: String(row.color || BRAND),
    repeat: normalizeRepeat(row.repeat_type),
    repeatUntil: String(row.repeat_until || row.end_date || row.start_date || ''),
    notifySlack: false,
    createdBy: String(row.created_by || row.owner_id || ''),
    updatedAt: String(row.updated_at || new Date().toISOString()),
    completed: content.includes(PROJECT_DONE_MARK),
  }
}
function scheduleToRow(schedule: Schedule) {
  const endDate = schedule.repeatUntil || schedule.date
  return {
    id: schedule.id,
    type: schedule.type,
    title: schedule.title,
    content: withDone(schedule.description, schedule.type === 'project' && Boolean(schedule.completed)) || null,
    team_id: schedule.teamId || null,
    owner_id: schedule.ownerId || null,
    created_by: schedule.createdBy || schedule.ownerId || null,
    start_date: schedule.date,
    end_date: endDate,
    start_time: schedule.allDay ? null : schedule.startTime,
    end_time: schedule.allDay ? null : schedule.endTime,
    is_all_day: schedule.allDay,
    repeat_type: schedule.repeat,
    repeat_until: schedule.repeat === 'none' && schedule.type !== 'project' ? null : endDate,
    color: schedule.color || BRAND,
  }
}

export async function fetchAppData(): Promise<AppData> {
  const supabase = getSupabaseAdmin()
  const [teamsResult, staffResult, schedulesResult] = await Promise.all([
    supabase.from('teams').select('*').order('created_at', { ascending: true }),
    supabase.from('staff').select('*').eq('is_active', true).order('created_at', { ascending: true }),
    supabase.from('schedules').select('*').order('start_date', { ascending: true }),
  ])
  if (teamsResult.error) throw teamsResult.error
  if (staffResult.error) throw staffResult.error
  if (schedulesResult.error) throw schedulesResult.error
  return { teams: (teamsResult.data || []).map(rowToTeam), staff: (staffResult.data || []).map(rowToStaff), schedules: (schedulesResult.data || []).map(rowToSchedule) }
}

export async function upsertSchedule(schedule: Schedule) {
  const { error } = await getSupabaseAdmin().from('schedules').upsert(scheduleToRow(schedule))
  if (error) throw error
}
export async function removeSchedule(id: string) {
  const { error } = await getSupabaseAdmin().from('schedules').delete().eq('id', id)
  if (error) throw error
}

export function teamName(data: AppData, id: string) { return data.teams.find((team) => team.id === id)?.name || '팀 미지정' }
export function staffName(data: AppData, id: string) { return data.staff.find((person) => person.id === id)?.name || '미지정' }
export function findStaff(data: AppData, name: string) { return data.staff.find((person) => person.name === name || person.name.replace(/\s/g, '') === name.replace(/\s/g, '')) }
export function findSchedule(data: AppData, idOrShort: string) { return data.schedules.find((item) => item.id === idOrShort || item.id.startsWith(idOrShort)) }

export function occurrences(schedule: Schedule, start: string, end: string): Schedule[] {
  const result: Schedule[] = []
  const final = schedule.repeatUntil || schedule.date
  if (schedule.type === 'project') {
    if (final >= start && schedule.date <= end) result.push(schedule)
    return result
  }
  for (let date = schedule.date; date <= final && date <= end; date = addDays(date, 1)) {
    if (date >= start) result.push({ ...schedule, date })
    if (schedule.repeat === 'none') break
    if (schedule.repeat === 'weekly') date = addDays(date, 6)
    if (schedule.repeat === 'monthly') break
  }
  return result
}

function personRoutes(items: Schedule[]) {
  const personTitles = new Map<string, string[]>()
  items.forEach((item) => {
    const people = item.memberIds.length ? item.memberIds : [item.ownerId]
    people.forEach((personId) => {
      const prev = personTitles.get(personId) || []
      if (!prev.includes(item.title)) personTitles.set(personId, [...prev, item.title])
    })
  })
  const routeMap = new Map<string, string[]>()
  personTitles.forEach((titles, personId) => {
    const route = titles.sort((a, b) => titlePriority(a) - titlePriority(b) || a.localeCompare(b, 'ko')).join('>')
    routeMap.set(route, [...(routeMap.get(route) || []), personId])
  })
  return Array.from(routeMap.entries()).sort(([a], [b]) => titlePriority(a) - titlePriority(b) || a.localeCompare(b, 'ko'))
}

const briefTeamOrder = ['CEO', '경영', '기획', '미디어', '테크', '운영해외사업']

function shortTeamLabel(name: string) { return name.replace(/팀$/, '').trim() || '팀 미지정' }
const weekdayLabels = ['일', '월', '화', '수', '목', '금', '토']
function weekdayOf(iso = '') {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return ''
  return weekdayLabels[new Date(`${iso}T00:00:00+09:00`).getDay()] || ''
}
function koreanDate(iso = '') {
  const [, , month, day] = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/) || []
  const weekday = weekdayOf(iso)
  return month && day ? `${Number(month)}월 ${Number(day)}일${weekday ? `(${weekday})` : ''}` : iso || '-'
}
function isoDateWithWeekday(iso = '') {
  const weekday = weekdayOf(iso)
  return iso ? `${iso}${weekday ? `(${weekday})` : ''}` : '-'
}
function scheduleRouteText(data: AppData, items: Schedule[]) {
  return personRoutes(items).map(([route, ids]) => `${ids.map((id) => staffName(data, id)).join('·')} - ${route}`).join(' / ')
}

export function formatTeamDailyLine(data: AppData, items: Schedule[]) {
  const base = items[0]
  const prefix = base.allDay ? '' : `[${timeLabel(base)}] `
  return `${prefix}${scheduleRouteText(data, items)}`
}

export function formatIssueLine(data: AppData, item: Schedule) {
  const names = (item.memberIds.length ? item.memberIds : [item.ownerId]).map((id) => staffName(data, id)).join('·')
  return `- [${item.title}] ${names}`
}
export function formatProjectLine(item: Schedule) {
  const tag = /긴급|urgent/i.test(`${item.title} ${item.description}`) ? '긴급' : '주요'
  const memo = item.description ? ` : ${item.description}` : ''
  return `- [${tag}] ${item.title}${memo}`
}

export function buildDailyBrief(data: AppData, date = kstToday()) {
  const daily = data.schedules.flatMap((schedule) => occurrences(schedule, date, date))
  const normal = daily.filter((item) => item.type !== 'project')
  const issues = normal.filter((item) => ISSUE_TITLES.some((word) => item.title.includes(word)))
  const teamItems = normal.filter((item) => !['연차', '휴가', '오전반차', '오후반차', '반차'].some((word) => item.title.includes(word)))
  const groupMap = new Map<string, Schedule[]>()
  teamItems.forEach((item) => {
    const key = [item.date, item.teamId, item.startTime, item.endTime, item.allDay].join('|')
    groupMap.set(key, [...(groupMap.get(key) || []), item])
  })
  const teamGroups = Array.from(groupMap.values())
  const teamLines = briefTeamOrder.map((label) => {
    const matching = teamGroups.filter((items) => shortTeamLabel(teamName(data, items[0].teamId)) === label)
    const text = matching.length ? matching.map((items) => formatTeamDailyLine(data, items)).join(' / ') : '미작성'
    return `- [${label}] ${text}`
  })
  const extraTeamLines = teamGroups
    .filter((items) => !briefTeamOrder.includes(shortTeamLabel(teamName(data, items[0].teamId))))
    .map((items) => `- [${shortTeamLabel(teamName(data, items[0].teamId))}] ${formatTeamDailyLine(data, items)}`)
  const issueLines = issues.sort((a, b) => titlePriority(a.title) - titlePriority(b.title) || staffName(data, a.ownerId).localeCompare(staffName(data, b.ownerId), 'ko')).map((item) => formatIssueLine(data, item))
  const projectLines = data.schedules.filter((item) => item.type === 'project' && !item.completed && item.date <= date && (item.repeatUntil || item.date) >= date).map(formatProjectLine)
  return [`*✏️ [I.LAB Scheduler] ${isoDateWithWeekday(date)} I.LAB 일정 브리핑*`, '', '*📌 주간이슈*', issueLines.length ? issueLines.join('\n') : '- 미작성', '', '*👥 팀일정*', [...teamLines, ...extraTeamLines].join('\n'), '', '*📚  프로젝트 주요 일정*', projectLines.length ? projectLines.join('\n') : '- 미작성'].join('\n')
}

export function buildRangeBrief(data: AppData, start: string, end: string) {
  const dates: string[] = []
  for (let date = start; date <= end; date = addDays(date, 1)) dates.push(date)
  return dates.map((date) => buildDailyBrief(data, date)).join('\n\n────────────\n\n')
}

export function buildChangeNotice(data: AppData, action: SlackAction, schedule: (Schedule | Partial<Schedule>) & { teamName?: string; ownerName?: string }) {
  const actionLabel: Record<SlackAction, string> = { create: '신규 등록', update: '수정 등록', delete: '삭제', complete: '완료' }
  const owner = schedule.ownerName || (schedule.ownerId ? staffName(data, schedule.ownerId) : '-')
  const team = shortTeamLabel(schedule.teamName || (schedule.teamId ? teamName(data, schedule.teamId) : '-'))
  const date = koreanDate(schedule.date)
  const title = schedule.title || '-'
  const memo = schedule.description ? ` : ${schedule.description}` : ''
  if (schedule.type === 'project') return `*✏️ [I.LAB Scheduler] 프로젝트 일정 ${actionLabel[action]}*\n${date} 프로젝트 일정 ${actionLabel[action]} - ${title}${memo}`
  return `*✏️ [I.LAB Scheduler] 일정 ${actionLabel[action]}*\n${date} 일정 ${actionLabel[action]} - [${team}] ${owner}  ${title}`
}

export async function postSlack(text: string, responseUrl?: string) {
  if (responseUrl) {
    await fetch(responseUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ response_type: 'ephemeral', text, mrkdwn: true }) })
    return { ok: true }
  }
  const token = process.env.SLACK_BOT_TOKEN
  const channel = process.env.SLACK_CHANNEL_ID || 'C0BL9PMAA2E'
  if (!token) return { ok: false, skipped: true, error: 'missing_slack_bot_token' }
  const slackResponse = await fetch('https://slack.com/api/chat.postMessage', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify({ channel, text, mrkdwn: true }) })
  const result = await slackResponse.json() as { ok?: boolean; error?: string; ts?: string }
  return result.ok ? { ok: true, ts: result.ts } : { ok: false, error: result.error || 'slack_error' }
}

export function makeSchedule(partial: Partial<Schedule>): Schedule {
  return { id: randomUUID(), title: '일정', type: 'event', date: kstToday(), startTime: '09:00', endTime: '10:00', allDay: true, teamId: '', memberIds: [], ownerId: '', description: '', color: BRAND, repeat: 'none', repeatUntil: '', notifySlack: false, createdBy: '', updatedAt: new Date().toISOString(), ...partial }
}

export function parseSlackBody(body: unknown) {
  if (!body) return new URLSearchParams()
  if (typeof body === 'string') return new URLSearchParams(body)
  if (typeof body === 'object') return new URLSearchParams(Object.entries(body as Record<string, string>).map(([key, value]) => [key, String(value)]))
  return new URLSearchParams()
}

export function verifySlackSignature(headers: Record<string, string | string[] | undefined>, rawBody: string) {
  const secret = process.env.SLACK_SIGNING_SECRET
  if (!secret) return true
  const timestamp = String(headers['x-slack-request-timestamp'] || headers['X-Slack-Request-Timestamp'] || '')
  const signature = String(headers['x-slack-signature'] || headers['X-Slack-Signature'] || '')
  if (!timestamp || !signature || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false
  const expected = `v0=${createHmac('sha256', secret).update(`v0:${timestamp}:${rawBody}`).digest('hex')}`
  const a = Buffer.from(expected)
  const b = Buffer.from(signature)
  return a.length === b.length && timingSafeEqual(a, b)
}

export function helpText() {
  return ['*I.LAB Scheduler 쉬운 명령어*', '*조회*', '`/일정 오늘`', '`/일정 내일`', '`/일정 이번주`', '`/일정 프로젝트`', '`/일정 2026-09-10`', '', '*등록*', '`/일정등록 오늘 박찬우 일정 외근으로 등록해줘`', '`/일정등록 내일 박찬우 일정 휴가로 등록해줘`', '`/일정등록 이번 주 박찬우 일정 사무실로 등록해줘`', '`/일정등록 이번 주 수요일 박찬우 일정 휴가로 등록해줘`', '', '*수정*', '`/일정수정 오늘 박찬우 일정 사무실로 수정해줘`', '`/일정수정 내일 박찬우 일정 오전반차로 수정해줘`', '', '※ `/일정등록 이번 주 ...`는 이번 주 평일 월~금에 등록됩니다.'].join('\n')
}
