import { addDays, buildChangeNotice, buildDailyBrief, buildRangeBrief, fetchAppData, findSchedule, findStaff, helpText, kstToday, makeSchedule, parseSlackBody, postSlack, removeSchedule, staffName, teamName, upsertSchedule, verifySlackSignature, type AppData, type Schedule } from '../_lib/scheduler.js'

type VercelRequest = { method?: string; body?: unknown; headers?: Record<string, string | string[] | undefined> }
type VercelResponse = { status: (code: number) => VercelResponse; json: (body: Record<string, unknown>) => void; setHeader: (name: string, value: string) => void }

type ParsedTime = { allDay: boolean; startTime: string; endTime: string; titleTokens: string[] }
type NaturalRequest = { dates: string[]; staffToken: string; title: string }

const weekdays: Record<string, number> = { 일요일: 0, 월요일: 1, 화요일: 2, 수요일: 3, 목요일: 4, 금요일: 5, 토요일: 6 }

function rawBody(body: unknown) {
  if (typeof body === 'string') return body
  if (!body || typeof body !== 'object') return ''
  return new URLSearchParams(Object.entries(body as Record<string, string>).map(([key, value]) => [key, String(value)])).toString()
}
function immediate(text: string) { return { response_type: 'ephemeral', text, mrkdwn: true } }
function normalizeCommand(text: string) { return text.trim().replace(/\s+/g, ' ') }
function parseTime(tokens: string[]): ParsedTime {
  const timeIndex = tokens.findIndex((token) => /^\d{1,2}:\d{2}-\d{1,2}:\d{2}$/.test(token))
  if (timeIndex < 0) return { allDay: true, startTime: '09:00', endTime: '10:00', titleTokens: tokens }
  const [startTime, endTime] = tokens[timeIndex].split('-')
  return { allDay: false, startTime, endTime, titleTokens: tokens.filter((_, index) => index !== timeIndex) }
}
function parseFields(tokens: string[]) {
  const fields: Record<string, string> = {}
  tokens.forEach((token) => {
    const match = token.match(/^([^=]+)=(.+)$/)
    if (match) fields[match[1]] = match[2]
  })
  return fields
}
function weekStart(iso = kstToday()) {
  const [year, month, day] = iso.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  const diff = date.getDay() === 0 ? -6 : 1 - date.getDay()
  date.setDate(date.getDate() + diff)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
function weekdayDate(weekday: number) { return addDays(weekStart(), weekday === 0 ? 6 : weekday - 1) }
export function parseNaturalDate(input: string) {
  let text = input.replace(/냉리|낼/g, '내일').replace(/이번\s+주/g, '이번주').trim()
  const explicit = text.match(/\d{4}-\d{2}-\d{2}/)?.[0]
  if (explicit) return { dates: [explicit], rest: text.replace(explicit, ' ').trim() }
  if (text.includes('오늘')) return { dates: [kstToday()], rest: text.replace('오늘', ' ').trim() }
  if (text.includes('내일')) return { dates: [kstToday(1)], rest: text.replace('내일', ' ').trim() }
  if (text.includes('이번주')) {
    const weekdayToken = Object.keys(weekdays).find((day) => text.includes(day))
    if (weekdayToken) return { dates: [weekdayDate(weekdays[weekdayToken])], rest: text.replace('이번주', ' ').replace(weekdayToken, ' ').trim() }
    const monday = weekStart()
    return { dates: [0, 1, 2, 3, 4].map((offset) => addDays(monday, offset)), rest: text.replace('이번주', ' ').trim() }
  }
  return { dates: [kstToday()], rest: text }
}
export function parseNaturalRequest(data: AppData, input: string): NaturalRequest | string {
  const normalized = normalizeCommand(input.replace(/[.!。]/g, ' '))
  const parsedDate = parseNaturalDate(normalized)
  const staff = data.staff.find((person) => parsedDate.rest.includes(person.name) || parsedDate.rest.replace(/\s/g, '').includes(person.name.replace(/\s/g, '')))
  if (!staff) return '직원 이름을 찾지 못했습니다. 예: `/일정등록 오늘 박찬우 일정 외근으로 등록해줘`'
  let title = parsedDate.rest
    .replace(staff.name, ' ')
    .replace(/일정/g, ' ')
    .replace(/등록해줘|등록해|등록|수정해줘|수정해|수정/g, ' ')
    .replace(/으로|로/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!title) return '일정명을 찾지 못했습니다. 예: `외근`, `휴가`, `사무실`, `오전반차`'
  return { dates: parsedDate.dates, staffToken: staff.name, title }
}
async function handleNaturalRegister(data: AppData, text: string) {
  const parsed = parseNaturalRequest(data, text)
  if (typeof parsed === 'string') return parsed
  const staff = findStaff(data, parsed.staffToken)
  if (!staff) return `직원 이름을 찾지 못했습니다: ${parsed.staffToken}`
  const created: Schedule[] = []
  for (const date of parsed.dates) {
    const schedule = makeSchedule({ title: parsed.title, date, repeatUntil: date, teamId: staff.teamId, ownerId: staff.id, memberIds: [staff.id], createdBy: staff.id })
    await upsertSchedule(schedule)
    created.push(schedule)
  }
  await postSlack(created.map((schedule) => buildChangeNotice(data, 'create', schedule)).join('\n'))
  return `등록 완료: ${staff.name} - ${parsed.title}\n${created.map((item) => `- ${item.date} / ID \`${item.id.slice(0, 8)}\``).join('\n')}`
}
async function handleNaturalUpdate(data: AppData, text: string) {
  const parsed = parseNaturalRequest(data, text)
  if (typeof parsed === 'string') return parsed
  const staff = findStaff(data, parsed.staffToken)
  if (!staff) return `직원 이름을 찾지 못했습니다: ${parsed.staffToken}`
  const targets = data.schedules.filter((item) => item.type !== 'project' && parsed.dates.includes(item.date) && (item.ownerId === staff.id || item.memberIds.includes(staff.id)))
  if (!targets.length) return `수정할 기존 일정을 찾지 못했습니다. 먼저 등록하려면: /일정등록 ${parsed.dates[0]} ${staff.name} 일정 ${parsed.title}으로 등록해줘`
  const updated: Schedule[] = []
  for (const target of targets) {
    const next = { ...target, title: parsed.title, updatedAt: new Date().toISOString() }
    await upsertSchedule(next)
    updated.push(next)
  }
  await postSlack(updated.map((schedule) => buildChangeNotice(data, 'update', schedule)).join('\n'))
  return `수정 완료: ${staff.name} - ${parsed.title}\n${updated.map((item) => `- ${item.date} / ID \`${item.id.slice(0, 8)}\``).join('\n')}`
}
function publicScheduleLines(data: AppData, schedules: Schedule[]) {
  if (!schedules.length) return '조회된 일정이 없습니다.'
  return schedules.map((item) => `- \`${item.id.slice(0, 8)}\` [${item.type === 'project' ? '프로젝트' : item.allDay ? '종일' : `${item.startTime}~${item.endTime}`}] [${teamName(data, item.teamId).replace(/팀$/, '')}] ${staffName(data, item.ownerId)} - ${item.title}${item.description ? ` (${item.description})` : ''}`).join('\n')
}
async function handleRegister(data: AppData, args: string[]) {
  const [date, staffToken, ...rest] = args
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '') || !staffToken || !rest.length) return '등록 형식: `/일정 등록 2026-09-10 박찬우 외근` 또는 `/일정 등록 2026-09-10 박찬우 외근 10:00-12:00`'
  const staff = findStaff(data, staffToken)
  if (!staff) return `직원 이름을 찾지 못했습니다: ${staffToken}`
  const parsed = parseTime(rest)
  const title = parsed.titleTokens.join(' ').trim()
  const schedule = makeSchedule({ title, date, repeatUntil: date, allDay: parsed.allDay, startTime: parsed.startTime, endTime: parsed.endTime, teamId: staff.teamId, ownerId: staff.id, memberIds: [staff.id], createdBy: staff.id })
  await upsertSchedule(schedule)
  await postSlack(buildChangeNotice(data, 'create', schedule))
  return `등록 완료: \`${schedule.id.slice(0, 8)}\` ${date} ${staff.name} - ${title}`
}
async function handleUpdate(data: AppData, args: string[]) {
  const [id, ...fieldTokens] = args
  if (!id || !fieldTokens.length) return '수정 형식: `/일정 수정 일정ID 제목=출장 날짜=2026-09-11 시간=13:00-15:00`'
  const target = findSchedule(data, id)
  if (!target) return `일정 ID를 찾지 못했습니다: ${id}`
  const fields = parseFields(fieldTokens)
  const next: Schedule = { ...target, updatedAt: new Date().toISOString() }
  if (fields['제목']) next.title = fields['제목']
  if (fields['날짜']) { next.date = fields['날짜']; next.repeatUntil = fields['날짜'] }
  if (fields['담당']) {
    const staff = findStaff(data, fields['담당'])
    if (!staff) return `담당자를 찾지 못했습니다: ${fields['담당']}`
    next.ownerId = staff.id; next.memberIds = [staff.id]; next.teamId = staff.teamId
  }
  if (fields['메모']) next.description = fields['메모']
  if (fields['시간']) {
    if (fields['시간'] === '종일') next.allDay = true
    else if (/^\d{1,2}:\d{2}-\d{1,2}:\d{2}$/.test(fields['시간'])) { const [start, end] = fields['시간'].split('-'); next.allDay = false; next.startTime = start; next.endTime = end }
    else return '시간 형식은 `종일` 또는 `13:00-15:00` 입니다.'
  }
  await upsertSchedule(next)
  await postSlack(buildChangeNotice(data, 'update', next))
  return `수정 완료: \`${next.id.slice(0, 8)}\` ${next.date} ${staffName(data, next.ownerId)} - ${next.title}`
}
async function handleDelete(data: AppData, args: string[]) {
  const id = args[0]
  const target = id ? findSchedule(data, id) : undefined
  if (!target) return '삭제 형식: `/일정 삭제 일정ID` — 먼저 `/일정 오늘` 또는 `/일정 2026-09-10`으로 ID를 확인해주세요.'
  await removeSchedule(target.id)
  await postSlack(buildChangeNotice(data, 'delete', target))
  return `삭제 완료: \`${target.id.slice(0, 8)}\` ${target.title}`
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).json({ ok: true })
  if (req.method !== 'POST') return res.status(405).json(immediate('POST만 지원합니다.'))

  const raw = rawBody(req.body)
  if (!verifySlackSignature(req.headers || {}, raw)) return res.status(401).json(immediate('Slack 서명 검증에 실패했습니다.'))

  const params = parseSlackBody(req.body)
  const text = normalizeCommand(params.get('text') || '')
  const slashCommand = (params.get('command') || '').replace(/^\//, '')
  const responseUrl = params.get('response_url') || undefined

  try {
    const data = await fetchAppData()
    const [command, ...args] = text ? text.split(' ') : ['오늘']
    let output = ''
    if (slashCommand === '일정등록') output = await handleNaturalRegister(data, text)
    else if (slashCommand === '일정수정') output = await handleNaturalUpdate(data, text)
    else if (!text || command === '오늘') output = buildDailyBrief(data, kstToday())
    else if (command === '내일' || command === '냉리') output = buildDailyBrief(data, kstToday(1))
    else if (command === '이번주' || (command === '이번' && args[0] === '주')) output = buildRangeBrief(data, kstToday(), addDays(kstToday(), 6))
    else if (command === '프로젝트') output = publicScheduleLines(data, data.schedules.filter((item) => item.type === 'project' && !item.completed))
    else if (/^\d{4}-\d{2}-\d{2}$/.test(command)) output = buildDailyBrief(data, command)
    else if (command === '등록') output = /^\d{4}-\d{2}-\d{2}$/.test(args[0] || '') ? await handleRegister(data, args) : await handleNaturalRegister(data, args.join(' '))
    else if (command === '수정') output = args.some((token) => token.includes('=')) ? await handleUpdate(data, args) : await handleNaturalUpdate(data, args.join(' '))
    else if (command === '삭제') output = await handleDelete(data, args)
    else output = helpText()

    if (responseUrl && output.length > 2500) {
      await postSlack(output, responseUrl)
      return res.status(200).json(immediate('조회 결과가 길어서 별도 응답으로 보냈습니다.'))
    }
    return res.status(200).json(immediate(output))
  } catch (error) {
    return res.status(200).json(immediate(`처리 중 오류가 발생했습니다: ${error instanceof Error ? error.message : 'unknown_error'}`))
  }
}
