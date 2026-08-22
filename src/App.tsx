import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties, FormEvent, MouseEvent } from 'react'
import './App.css'
import { deleteScheduleFromSupabase, deleteStaffFromSupabase, deleteTeamFromSupabase, fetchAppDataFromSupabase, isSupabaseConfigured, saveScheduleToSupabase, saveStaffToSupabase, saveTeamToSupabase } from './lib/supabase'

type Role = 'admin' | 'employee' | 'free'
type ScheduleType = 'team' | 'event' | 'project'
type RepeatType = 'none' | 'daily' | 'weekly' | 'monthly'
type ViewMode = 'calendar' | 'today' | 'week' | 'team' | 'mine' | 'project'

type Team = { id: string; name: string; slackChannel: string; color: string }
type Staff = { id: string; name: string; teamId: string; role: Role; password: string; color?: string }
type Schedule = {
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
  projectName: string
  location: string
  description: string
  color: string
  repeat: RepeatType
  repeatUntil: string
  notifySlack: boolean
  createdBy: string
  updatedAt: string
}
type SlackSetting = { enabled: boolean; webhookUrl: string; defaultChannel: string; notifyOnCreate: boolean; notifyOnUpdate: boolean; notifyOnDelete: boolean; morningBrief: boolean }
type AppSetting = { logoUrl: string; headerTitle: string }
type AppData = { teams: Team[]; staff: Staff[]; schedules: Schedule[]; slack: SlackSetting; settings: AppSetting }
type HolidayInfo = Record<string, string>

const STORAGE_KEY = 'ilab-media-scheduler-data-v7'
const SESSION_KEY = 'ilab-media-scheduler-session-v7'
const HOLIDAY_STORAGE_PREFIX = 'ilab-media-scheduler-kr-holidays-'
const BRAND = '#5D2E8D'
const DEFAULT_LOGO = '/ilabmedia-logo.png'
const repeatLabels: Record<RepeatType, string> = { none: '반복 없음', daily: '매일', weekly: '매주', monthly: '매월' }
const paletteColors = ['#000000','#3D3D3D','#5A5A5A','#8F8F8F','#B9B9B9','#E8E8E8','#F3F6F3','#FFFFFF','#F63B35','#8A5600','#D88900','#80D600','#2F86C6','#16577D','#673197','#C90070','#F2C2C4','#F8E2C5','#FFF1BF','#CFE4C9','#C7DADC','#C6D9EA','#CFC3DE','#DDBDCC','#E88F92','#F6C993','#FFE195','#B5D5A8','#A3C7CD','#9FC4E5','#B4A6D1','#D39AB5','#E15F5D','#F3A850','#FDD052','#83BC72','#6FA1AB','#5D9CD5','#846CC0','#BF6E98','#D90000','#F0932B','#F6C027','#60A345','#397F88','#3686C9','#6347A2','#B1497F','#9E0000','#BB6100','#B88C00','#2E751D','#07535B','#0E5A92','#311C78','#79144A','#850000','#8A4B00','#806500','#205C12','#06424A','#0A4673','#23115B','#5A0F36']
const fallbackHolidays: HolidayInfo = {
  '2026-01-01': '신정', '2026-02-16': '설날 연휴', '2026-02-17': '설날', '2026-02-18': '설날 연휴', '2026-03-01': '삼일절', '2026-03-02': '대체공휴일',
  '2026-05-05': '어린이날', '2026-05-24': '부처님오신날', '2026-05-25': '대체공휴일', '2026-06-06': '현충일', '2026-08-15': '광복절', '2026-08-17': '대체공휴일',
  '2026-09-24': '추석 연휴', '2026-09-25': '추석', '2026-09-26': '추석 연휴', '2026-10-03': '개천절', '2026-10-05': '대체공휴일', '2026-10-09': '한글날', '2026-12-25': '성탄절',
  '2027-01-01': '신정', '2027-02-06': '설날 연휴', '2027-02-07': '설날', '2027-02-08': '설날 연휴', '2027-03-01': '삼일절', '2027-05-05': '어린이날',
  '2027-05-13': '부처님오신날', '2027-06-06': '현충일', '2027-08-15': '광복절', '2027-08-16': '대체공휴일', '2027-09-14': '추석 연휴', '2027-09-15': '추석', '2027-09-16': '추석 연휴', '2027-10-03': '개천절', '2027-10-04': '대체공휴일', '2027-10-09': '한글날', '2027-12-25': '성탄절',
}
const solarTerms: HolidayInfo = {
  '2026-01-05': '소한', '2026-01-20': '대한', '2026-02-04': '입춘', '2026-02-19': '우수', '2026-03-05': '경칩', '2026-03-20': '춘분', '2026-04-05': '청명', '2026-04-20': '곡우', '2026-05-05': '입하', '2026-05-21': '소만', '2026-06-05': '망종', '2026-06-21': '하지', '2026-07-07': '소서', '2026-07-23': '대서', '2026-08-07': '입추', '2026-08-23': '처서', '2026-09-07': '백로', '2026-09-23': '추분', '2026-10-08': '한로', '2026-10-23': '상강', '2026-11-07': '입동', '2026-11-22': '소설', '2026-12-07': '대설', '2026-12-22': '동지',
  '2027-01-05': '소한', '2027-01-20': '대한', '2027-02-04': '입춘', '2027-02-19': '우수', '2027-03-06': '경칩', '2027-03-21': '춘분', '2027-04-05': '청명', '2027-04-20': '곡우', '2027-05-06': '입하', '2027-05-21': '소만', '2027-06-06': '망종', '2027-06-21': '하지', '2027-07-07': '소서', '2027-07-23': '대서', '2027-08-08': '입추', '2027-08-23': '처서', '2027-09-08': '백로', '2027-09-23': '추분', '2027-10-08': '한로', '2027-10-23': '상강', '2027-11-07': '입동', '2027-11-22': '소설', '2027-12-07': '대설', '2027-12-22': '동지',
}

const defaultData: AppData = {
  teams: [
    { id: 'team-media', name: '미디어팀', slackChannel: '#미디어팀', color: '#7C3AED' },
    { id: 'team-management', name: '경영팀', slackChannel: '#경영팀', color: '#F0932B' },
    { id: 'team-plan', name: '기획팀', slackChannel: '#기획팀', color: BRAND },
    { id: 'team-tech', name: '테크팀', slackChannel: '#테크팀', color: '#2563EB' },
  ],
  staff: [
    { id: 'staff-admin', name: '관리자', teamId: 'team-media', role: 'admin', password: '0000' },
    { id: 'staff-media', name: '미디어', teamId: 'team-media', role: 'employee', password: '1111' },
    { id: 'staff-dev', name: '테크', teamId: 'team-tech', role: 'employee', password: '1111' },
    { id: 'staff-plan', name: '기획', teamId: 'team-plan', role: 'free', password: '1111' },
  ],
  schedules: [],
  slack: { enabled: false, webhookUrl: '', defaultChannel: '#일정', notifyOnCreate: true, notifyOnUpdate: true, notifyOnDelete: true, morningBrief: true },
  settings: { logoUrl: DEFAULT_LOGO, headerTitle: 'Scheduler' },
}
defaultData.schedules = [
  makeSchedule({ id: 'sch-1', title: '주간 회의', type: 'event', teamId: 'team-media', ownerId: 'staff-admin', createdBy: 'staff-admin', date: toISODate(new Date()), startTime: '09:00', endTime: '10:00', allDay: false, color: '#E15F5D', description: '이번 주 일정과 마감일 공유' }),
  makeSchedule({ id: 'sch-2', title: '사무실', type: 'event', teamId: 'team-plan', ownerId: 'staff-plan', createdBy: 'staff-plan', date: addDays(new Date(), 1), startTime: '14:00', endTime: '15:30', color: BRAND, description: '제안서 디자인 리뷰' }),
  makeSchedule({ id: 'sch-3', title: '조명 연출 시안 만들기', type: 'project', teamId: 'team-tech', ownerId: 'staff-dev', createdBy: 'staff-admin', date: addDays(new Date(), -2), repeatUntil: addDays(new Date(), 5), allDay: true, color: '#4285F4', description: '프로젝트 진행 막대 샘플' }),
]

function makeSchedule(partial: Partial<Schedule>): Schedule { return { id: '', title: '', type: 'event', date: toISODate(new Date()), startTime: '09:00', endTime: '10:00', allDay: true, teamId: 'team-media', memberIds: [], ownerId: 'staff-admin', projectName: '', location: '', description: '', color: BRAND, repeat: 'none', repeatUntil: '', notifySlack: true, createdBy: 'staff-admin', updatedAt: new Date().toISOString(), ...partial } }
function toISODate(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` }
function addDays(date: Date, days: number) { const next = new Date(date); next.setDate(next.getDate() + days); return toISODate(next) }
function parseISODate(iso: string) { return new Date(`${iso}T00:00:00`) }
function rangeTitle(days: Date[]) { const first = days[0], last = days[days.length - 1]; return `${first.getFullYear()}년 ${first.getMonth() + 1}월 ${first.getDate()}일 - ${last.getMonth() + 1}월 ${last.getDate()}일` }
function makeId(prefix: string) { if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID(); return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}` }
function normalizeRole(role: unknown): Role { return role === 'manager' || role === 'employee' ? 'employee' : role === 'staff' || role === 'free' ? 'free' : 'admin' }
function normalizeType(type: unknown): ScheduleType { if (type === 'project') return 'project'; return 'event' }
function normalizeTeam(team: Partial<Team>, index = 0): Team {
  const id = team.id === 'team-dev' ? 'team-tech' : team.id || makeId('team')
  const legacyName = team.name === '개발팀' ? '테크팀' : team.name
  return { id, name: legacyName || '팀 미지정', slackChannel: team.slackChannel || `#${legacyName || '팀채널'}`, color: team.color || paletteColors[(index + 12) % paletteColors.length] || BRAND }
}
function withStandardTeams(teams: Team[]): Team[] {
  const standard: Team[] = defaultData.teams
  const merged = [...teams]
  standard.forEach((team) => { if (!merged.some((item) => item.id === team.id || item.name === team.name)) merged.push(team) })
  return merged
}
function teamIcon(name: string) { if (name.includes('미디어')) return '🎬'; if (name.includes('경영')) return '💼'; if (name.includes('기획')) return '📝'; if (name.includes('테크') || name.includes('개발')) return '⚙️'; return '🏷️' }
function shortTeamName(name: string) { return name.replace(/팀$/, '') }
function normalizeSchedule(schedule: Schedule): Schedule { return { ...schedule, type: normalizeType(schedule.type), color: schedule.color || BRAND, repeatUntil: schedule.repeatUntil || schedule.date } }
function loadData(): AppData {
  const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('ilab-media-scheduler-data-v6') || localStorage.getItem('ilab-media-scheduler-data-v5') || localStorage.getItem('ilab-media-scheduler-data-v4') || localStorage.getItem('ilab-media-scheduler-data-v3') || localStorage.getItem('ilab-media-scheduler-data-v2')
  if (!raw) return defaultData
  try {
    const parsed = JSON.parse(raw)
    const teams = withStandardTeams((parsed.teams || defaultData.teams).map(normalizeTeam))
    return { ...defaultData, ...parsed, teams, staff: (parsed.staff || defaultData.staff).map((s: Staff) => ({ ...s, teamId: s.teamId === 'team-dev' ? 'team-tech' : s.teamId, role: normalizeRole(s.role) })), schedules: (parsed.schedules || defaultData.schedules).map((s: Schedule) => normalizeSchedule({ ...s, teamId: s.teamId === 'team-dev' ? 'team-tech' : s.teamId })), settings: { ...defaultData.settings, ...parsed.settings } }
  } catch { return defaultData }
}
function getTwoWeekDays(cursor: Date) { const start = new Date(cursor); start.setDate(start.getDate() - start.getDay()); return Array.from({ length: 14 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d }) }
function getMonthDays(cursor: Date) { const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1); const start = new Date(first); start.setDate(first.getDate() - first.getDay()); return Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d }) }
function getScheduleOccurrences(schedule: Schedule, rangeStart: string, rangeEnd: string): Schedule[] {
  if (schedule.repeat === 'none' || schedule.type === 'project') return schedule.date >= rangeStart && schedule.date <= rangeEnd ? [schedule] : []
  const min = parseISODate(rangeStart), end = parseISODate(rangeEnd), limit = schedule.repeatUntil ? parseISODate(schedule.repeatUntil) : end
  const cursor = parseISODate(schedule.date), finalEnd = limit < end ? limit : end, result: Schedule[] = []
  while (cursor <= finalEnd) { if (cursor >= min) result.push({ ...schedule, id: `${schedule.id}@${toISODate(cursor)}`, date: toISODate(cursor) }); if (schedule.repeat === 'daily') cursor.setDate(cursor.getDate() + 1); if (schedule.repeat === 'weekly') cursor.setDate(cursor.getDate() + 7); if (schedule.repeat === 'monthly') cursor.setMonth(cursor.getMonth() + 1) }
  return result
}
function roleLabel(role: Role) { return role === 'admin' ? '관리자' : role === 'employee' ? '임직원' : '프리' }
function sortSchedules(a: Schedule, b: Schedule) { return `${a.date} ${a.allDay ? '00:00' : a.startTime}`.localeCompare(`${b.date} ${b.allDay ? '00:00' : b.startTime}`) }
function listCount(schedules: Schedule[], start: string, end: string) { return schedules.filter((s) => s.type !== 'project').flatMap((s) => getScheduleOccurrences(s, start, end)).length }
function originalId(id: string) { return id.split('@')[0] }
function clamp(n: number, min: number, max: number) { return Math.max(min, Math.min(max, n)) }
function loadCachedHolidays(year: number): HolidayInfo {
  try { return JSON.parse(localStorage.getItem(`${HOLIDAY_STORAGE_PREFIX}${year}`) || '{}') } catch { return {} }
}
export default function App() {
  const [data, setData] = useState<AppData>(() => loadData())
  const [currentUserId, setCurrentUserId] = useState(() => localStorage.getItem(SESSION_KEY) || localStorage.getItem('ilab-media-scheduler-session-v6') || localStorage.getItem('ilab-media-scheduler-session-v5') || localStorage.getItem('ilab-media-scheduler-session-v4') || '')
  const [loginName, setLoginName] = useState('관리자')
  const [loginPassword, setLoginPassword] = useState('0000')
  const [rememberMe, setRememberMe] = useState(true)
  const [cursor, setCursor] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(toISODate(new Date()))
  const [view, setView] = useState<ViewMode>('calendar')
  const [teamFilter, setTeamFilter] = useState('all')
  const [editing, setEditing] = useState<Schedule | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [dayPopupDate, setDayPopupDate] = useState('')
  const [notice, setNotice] = useState('')
  const [newStaff, setNewStaff] = useState({ name: '', teamId: defaultData.teams[0].id, role: 'employee' as Role, password: '1111' })
  const [newTeam, setNewTeam] = useState({ name: '', slackChannel: '', color: BRAND })
  const [dbStatus, setDbStatus] = useState(isSupabaseConfigured ? 'Supabase 연결 준비 중' : '로컬 저장 모드')
  const [holidays, setHolidays] = useState<HolidayInfo>(() => ({ ...fallbackHolidays, ...solarTerms, ...loadCachedHolidays(new Date().getFullYear()) }))

  const currentUser = data.staff.find((s) => s.id === currentUserId)
  const isAdmin = currentUser?.role === 'admin'
  const today = toISODate(new Date())
  const weekEnd = addDays(new Date(), 6)
  const twoWeekDays = useMemo(() => getTwoWeekDays(cursor), [cursor])
  const monthDays = useMemo(() => getMonthDays(cursor), [cursor])
  const rangeStart = toISODate(twoWeekDays[0])
  const rangeEnd = toISODate(twoWeekDays[13])
  const visibleOccurrences = useMemo(() => data.schedules.filter((s) => s.type !== 'project').flatMap((s) => getScheduleOccurrences(s, rangeStart, rangeEnd)), [data.schedules, rangeStart, rangeEnd])
  const projectSchedules = data.schedules.filter((s) => s.type === 'project').sort(sortSchedules)
  const dayPopupSchedules = dayPopupDate ? data.schedules.filter((s) => s.type !== 'project').flatMap((s) => getScheduleOccurrences(s, dayPopupDate, dayPopupDate)).sort(sortSchedules) : []
  const listSchedules = data.schedules.filter((s) => s.type !== 'project').flatMap((s) => getScheduleOccurrences(s, today, addDays(new Date(), 60))).filter((s) => {
    if (!currentUser) return false
    if (view === 'today') return s.date === today
    if (view === 'week') return s.date >= today && s.date <= weekEnd
    if (view === 'team') return teamFilter === 'all' || s.teamId === teamFilter
    if (view === 'mine') return s.ownerId === currentUser.id || s.createdBy === currentUser.id
    return false
  }).sort(sortSchedules)

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)) }, [data])
  useEffect(() => {
    if (!isSupabaseConfigured) return
    let cancelled = false
    fetchAppDataFromSupabase()
      .then((remoteData) => {
        if (cancelled) return
        setData((prev) => ({ ...prev, ...remoteData, slack: prev.slack, settings: prev.settings }))
        setCurrentUserId((previousId) => {
          const preserved = remoteData.staff.find((staff) => staff.id === previousId)
          const admin = remoteData.staff.find((staff) => staff.role === 'admin')
          const nextId = preserved?.id || admin?.id || remoteData.staff[0]?.id || ''
          if (nextId) localStorage.setItem(SESSION_KEY, nextId)
          return nextId
        })
        setNewStaff((prev) => ({ ...prev, teamId: remoteData.teams[0]?.id || prev.teamId }))
        setDbStatus('Supabase DB 연결됨')
      })
      .catch((error: unknown) => {
        if (cancelled) return
        console.error(error)
        setDbStatus('Supabase 연결 실패 - 로컬 저장 모드')
        setNotice('Supabase 연결을 확인해주세요. 임시로 로컬 저장 모드로 표시합니다.')
      })
    return () => { cancelled = true }
  }, [])
  useEffect(() => { if (!notice) return; const timer = window.setTimeout(() => setNotice(''), 5000); return () => window.clearTimeout(timer) }, [notice])
  useEffect(() => {
    const years = Array.from(new Set(twoWeekDays.map((day) => day.getFullYear())))
    years.forEach((year) => {
      const cacheKey = `${HOLIDAY_STORAGE_PREFIX}${year}`
      if (localStorage.getItem(cacheKey)) return
      fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/KR`)
        .then((res) => res.ok ? res.json() : [])
        .then((items: Array<{ date: string; localName?: string; name?: string }>) => {
          const synced = items.reduce<HolidayInfo>((acc, item) => {
            if (item.date) acc[item.date] = item.localName || item.name || '공휴일'
            return acc
          }, {})
          localStorage.setItem(cacheKey, JSON.stringify(synced))
          setHolidays((prev) => ({ ...prev, ...synced, ...solarTerms }))
        })
        .catch(() => undefined)
    })
  }, [twoWeekDays])

  function teamName(id: string) { return data.teams.find((t) => t.id === id)?.name || '팀 미지정' }
  function teamColor(id: string) { return data.teams.find((t) => t.id === id)?.color || BRAND }
  function staffName(id: string) { return data.staff.find((s) => s.id === id)?.name || '미지정' }
  function scheduleMembers(schedule: Schedule) { const ids = schedule.memberIds?.length ? schedule.memberIds : [schedule.ownerId]; return Array.from(new Set(ids)).map(staffName).filter((name) => name !== '미지정') }
  function scheduleTitle(schedule: Schedule) { const team = teamName(schedule.teamId); const names = scheduleMembers(schedule).join('·') || staffName(schedule.ownerId); return `${teamIcon(team)} [${shortTeamName(team)}] ${names} - ${schedule.title || '일정'}` }
  function displayColor(schedule: Schedule) { return schedule.type === 'project' ? schedule.color : teamColor(schedule.teamId) }
  function canEdit(schedule: Schedule) { if (!currentUser) return false; const s = data.schedules.find((item) => item.id === originalId(schedule.id)) || schedule; return isAdmin || s.createdBy === currentUser.id || s.ownerId === currentUser.id }
  function syncError(error: unknown) { console.error(error); setNotice('화면에는 반영됐지만 Supabase 저장에 실패했습니다. 환경변수/RLS를 확인해주세요.') }
  function goToday() { const now = new Date(); setCursor(now); setSelectedDate(toISODate(now)); setView('calendar') }
  function openDay(iso: string) { setSelectedDate(iso); setDayPopupDate(iso) }
  function openNewSchedule(date = selectedDate, type: ScheduleType = 'event') {
    if (!currentUser) return
    const teamId = currentUser.teamId || data.teams[0]?.id || ''
    setEditing(makeSchedule({ date, repeatUntil: date, type, teamId, ownerId: currentUser.id, memberIds: [currentUser.id], createdBy: currentUser.id, color: teamColor(teamId) }))
    setDayPopupDate('')
    setShowForm(true)
  }
  function openEdit(schedule: Schedule) { const found = data.schedules.find((s) => s.id === originalId(schedule.id)); if (found && canEdit(found)) { setEditing(normalizeSchedule(found)); setDayPopupDate(''); setShowForm(true) } }
  function login(event: FormEvent) {
    event.preventDefault()
    const name = loginName.trim()
    let candidates = data.staff.filter((s) => s.name === name && s.password === loginPassword)
    if (name === '임직원') candidates = data.staff.filter((s) => s.role !== 'admin' && s.password === loginPassword)
    if (name === '관리자') candidates = data.staff.filter((s) => s.role === 'admin' && s.password === loginPassword)
    if (!candidates.length) { setNotice('이름 또는 비밀번호가 맞지 않습니다.'); return }
    const found = candidates[0]
    setCurrentUserId(found.id)
    if (rememberMe) localStorage.setItem(SESSION_KEY, found.id)
    setNotice(`${found.name}님으로 로그인되었습니다.`)
  }
  function logout() { localStorage.removeItem(SESSION_KEY); setCurrentUserId(''); setNotice('로그아웃되었습니다.') }
  function onStartTimeChange(value: string) { if (!editing) return; setEditing({ ...editing, startTime: value, endTime: editing.endTime < value ? value : editing.endTime }) }
  function onTypeChange(type: ScheduleType) { if (!editing || !currentUser) return; const teamId = currentUser.teamId || editing.teamId; setEditing({ ...editing, type, teamId, allDay: type === 'project' ? true : editing.allDay, color: type === 'project' ? editing.color : teamColor(teamId) }) }
  function saveSchedule(event: FormEvent) {
    event.preventDefault(); if (!editing || !currentUser) return
    const teamId = editing.type === 'project' ? editing.teamId : currentUser.teamId
    const normalized = { ...editing, teamId, color: editing.type === 'project' ? editing.color : teamColor(teamId), endTime: editing.endTime < editing.startTime ? editing.startTime : editing.endTime, repeatUntil: editing.type === 'project' ? (editing.repeatUntil || editing.date) : editing.repeatUntil, title: editing.title.trim() || '일정', memberIds: [editing.ownerId || currentUser.id], projectName: '', location: '', updatedAt: new Date().toISOString(), createdBy: editing.createdBy || currentUser.id, ownerId: editing.ownerId || currentUser.id }
    const isNew = !normalized.id, saved = { ...normalized, id: normalized.id || makeId('sch') }
    setData((prev) => ({ ...prev, schedules: isNew ? [...prev.schedules, saved] : prev.schedules.map((s) => s.id === saved.id ? saved : s) }))
    saveScheduleToSupabase(saved).catch(syncError)
    setShowForm(false); setEditing(null); setNotice(isNew ? '일정이 등록되었습니다.' : '일정이 수정되었습니다.'); maybeNotifySlack(isNew ? 'create' : 'update', saved)
  }
  function deleteSchedule(id: string) { const target = data.schedules.find((s) => s.id === originalId(id)); if (!target || !canEdit(target)) return; if (!confirm('이 일정을 삭제할까요?')) return; setData((p) => ({ ...p, schedules: p.schedules.filter((s) => s.id !== target.id) })); deleteScheduleFromSupabase(target.id).catch(syncError); setNotice('일정이 삭제되었습니다.'); maybeNotifySlack('delete', target); setShowForm(false); setEditing(null) }
  function maybeNotifySlack(action: 'create' | 'update' | 'delete', schedule: Schedule) { if (!data.slack.enabled || !schedule.notifySlack || !data.slack.webhookUrl) return; const ok = action === 'create' ? data.slack.notifyOnCreate : action === 'update' ? data.slack.notifyOnUpdate : data.slack.notifyOnDelete; if (!ok) return; fetch(data.slack.webhookUrl, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: `[Scheduler] ${action}\n• ${schedule.date} ${schedule.allDay ? '하루종일' : `${schedule.startTime}~${schedule.endTime}`}\n• ${scheduleTitle(schedule)}` }) }).catch(() => setNotice('Slack 발송을 시도했지만 실패했을 수 있습니다.')) }
  function addStaff(event: FormEvent) { event.preventDefault(); if (!newStaff.name.trim()) return; const created = { ...newStaff, id: makeId('staff'), name: newStaff.name.trim() }; setData((p) => ({ ...p, staff: [...p.staff, created] })); saveStaffToSupabase(created).catch(syncError); setNewStaff({ name: '', teamId: data.teams[0]?.id || '', role: 'employee', password: '1111' }); setNotice('직원이 등록되었습니다.') }
  function updateStaff(id: string, patch: Partial<Staff>) { const next = data.staff.find((s) => s.id === id); const updated = next ? { ...next, ...patch } : null; setData((p) => ({ ...p, staff: p.staff.map((s) => s.id === id ? { ...s, ...patch } : s) })); if (updated) saveStaffToSupabase(updated).catch(syncError) }
  function removeStaff(id: string) { if (id === currentUserId) { setNotice('현재 로그인한 계정은 삭제할 수 없습니다.'); return } if (!confirm('직원을 삭제할까요?')) return; setData((p) => ({ ...p, staff: p.staff.filter((s) => s.id !== id), schedules: p.schedules.filter((s) => s.ownerId !== id && s.createdBy !== id) })); deleteStaffFromSupabase(id).catch(syncError); setNotice('직원을 삭제했습니다.') }
  function addTeam(event: FormEvent) { event.preventDefault(); if (!newTeam.name.trim()) return; const created = { id: makeId('team'), name: newTeam.name.trim(), slackChannel: newTeam.slackChannel || '#팀채널', color: newTeam.color }; setData((p) => ({ ...p, teams: [...p.teams, created] })); saveTeamToSupabase(created).catch(syncError); setNewTeam({ name: '', slackChannel: '', color: BRAND }); setNotice('팀이 생성되었습니다.') }
  function updateTeam(id: string, patch: Partial<Team>) { const next = data.teams.find((t) => t.id === id); const updated = next ? { ...next, ...patch } : null; setData((p) => ({ ...p, teams: p.teams.map((t) => t.id === id ? { ...t, ...patch } : t), schedules: p.schedules.map((s) => s.teamId === id && s.type !== 'project' && patch.color ? { ...s, color: patch.color } : s) })); if (updated) saveTeamToSupabase(updated).catch(syncError) }
  function removeTeam(id: string) { if (data.staff.some((s) => s.teamId === id)) { setNotice('소속 직원이 있는 팀은 삭제할 수 없습니다.'); return } if (!confirm('팀을 삭제할까요?')) return; setData((p) => ({ ...p, teams: p.teams.filter((t) => t.id !== id), schedules: p.schedules.filter((s) => s.teamId !== id) })); deleteTeamFromSupabase(id).catch(syncError); setNotice('팀을 삭제했습니다.') }

  if (!currentUser) return <main className="loginPage"><section className="loginCard"><img className="loginLogo" src={data.settings.logoUrl} alt="I.LAB MEDIA" /><h1>Scheduler</h1><p className="subText">팀·일정·프로젝트를 한 곳에서 관리합니다.</p><form onSubmit={login} className="loginForm"><label>직원 이름<input value={loginName} onChange={(e) => setLoginName(e.target.value)} placeholder="관리자 또는 임직원" /></label><label>비밀번호<input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="0000" /></label><label className="checkLine"><input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} /> 자동 로그인 유지</label><button className="primaryBtn">로그인</button></form><div className="sampleBox">샘플 계정: <b>관리자 / 0000, 임직원 / 1111</b></div>{notice && <p className="notice">{notice}</p>}</section></main>

  return <main className="appShell">
    <header className="topBar"><div className="brandHeader"><img src={data.settings.logoUrl} alt="I.LAB MEDIA" /><h1>{data.settings.headerTitle}</h1></div><div className="userPill"><span style={{ backgroundColor: teamColor(currentUser.teamId) }} /><div><b>{currentUser.name}</b><small>{teamName(currentUser.teamId)} · {roleLabel(currentUser.role)} · {dbStatus}</small></div><button onClick={logout}>나가기</button></div></header>
    {notice && <div className="toast" onClick={() => setNotice('')}>{notice}</div>}
    <section className="quickStats"><button onClick={() => setView('today')}><span>오늘 일정</span><b>{listCount(data.schedules, today, today)}</b></button><button onClick={() => setView('week')}><span>이번 주</span><b>{listCount(data.schedules, today, weekEnd)}</b></button><button onClick={() => setView('project')}><span>프로젝트</span><b>{projectSchedules.length}</b></button><button onClick={() => openNewSchedule(selectedDate)} className="solid">+ 일정 등록</button></section>
    <nav className="viewTabs"><button className={view === 'calendar' ? 'active' : ''} onClick={() => setView('calendar')}>캘린더</button><button className={view === 'project' ? 'active' : ''} onClick={() => setView('project')}>프로젝트</button><button className={view === 'today' ? 'active' : ''} onClick={() => setView('today')}>오늘</button><button className={view === 'team' ? 'active' : ''} onClick={() => setView('team')}>팀별</button><button className={view === 'mine' ? 'active' : ''} onClick={() => setView('mine')}>내일정</button></nav>
    {view === 'calendar' ? <section className="calendarPanel full"><div className="calendarHeader"><button onClick={() => setCursor(parseISODate(addDays(cursor, -14)))}>‹</button><h2>{rangeTitle(twoWeekDays)}</h2><button className="todayBtn" onClick={goToday}>오늘</button><button onClick={() => setCursor(parseISODate(addDays(cursor, 14)))}>›</button></div><div className="weekdays">{['일', '월', '화', '수', '목', '금', '토'].map((d) => <b key={d}>{d}</b>)}</div><div className="calendarGrid twoWeeks">{twoWeekDays.map((day) => { const iso = toISODate(day); const holiday = holidays[iso]; const daySchedules = visibleOccurrences.filter((s) => s.date === iso).sort(sortSchedules); return <div key={iso} className={`dayCell ${iso === today ? 'today' : ''} ${holiday ? 'holiday' : ''}`} onClick={() => openDay(iso)}><button className="dayNum" onClick={(e) => { e.stopPropagation(); openDay(iso) }}>{day.getDate()}</button>{holiday && <strong className="holidayName">{holiday}</strong>}<div className="chips">{daySchedules.map((s) => <button key={s.id} className={`eventChip ${s.allDay ? 'filled' : 'timed'}`} style={{ '--event-color': displayColor(s) } as CSSProperties} onClick={(e) => { e.stopPropagation(); openEdit(s) }}>{s.allDay ? scheduleTitle(s) : `${s.startTime} ${scheduleTitle(s)}`}</button>)}</div></div> })}</div></section> : view === 'project' ? <ProjectCalendar monthDays={monthDays} cursor={cursor} projects={projectSchedules} teamName={teamName} onEdit={openEdit} onPrev={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} onNext={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} /> : <section className="listPanel"><div className="panelTitle"><h2>{view === 'today' ? '오늘 일정 보기' : view === 'week' ? '주간 일정 보기' : view === 'team' ? '팀별 일정 보기' : '내 일정 보기'}</h2>{view === 'team' && <select value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)}><option value="all">전체 팀</option>{data.teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>}</div><ScheduleList schedules={listSchedules} teamName={teamName} staffName={staffName} scheduleTitle={scheduleTitle} displayColor={displayColor} onEdit={openEdit} onDelete={deleteSchedule} canEdit={canEdit} /></section>}
    {isAdmin && <section id="adminPanel" className="adminGrid"><div className="adminCard"><h2>직원 등록</h2><form onSubmit={addStaff} className="stackForm"><input value={newStaff.name} onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })} placeholder="직원 이름" /><select value={newStaff.teamId} onChange={(e) => setNewStaff({ ...newStaff, teamId: e.target.value })}>{data.teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select><select value={newStaff.role} onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value as Role })}><option value="admin">관리자</option><option value="employee">임직원</option><option value="free">프리</option></select><input value={newStaff.password} onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })} placeholder="초기 비밀번호" /><button className="primaryBtn">직원 등록</button></form></div><div className="adminCard"><h2>팀 생성/추가</h2><form onSubmit={addTeam} className="stackForm"><input value={newTeam.name} onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })} placeholder="팀명" /><input value={newTeam.slackChannel} onChange={(e) => setNewTeam({ ...newTeam, slackChannel: e.target.value })} placeholder="Slack 채널 예: #미디어팀" /><ColorPalette label="팀 색상" value={newTeam.color} onChange={(color) => setNewTeam({ ...newTeam, color })} /><button className="primaryBtn">팀 생성</button></form></div><div className="adminCard wide"><h2>직원 리스트</h2><div className="staffGrid">{data.staff.map((s) => <div className="staffMiniCard" key={s.id}><input value={s.name} onChange={(e) => updateStaff(s.id, { name: e.target.value })} /><select value={s.teamId} onChange={(e) => updateStaff(s.id, { teamId: e.target.value })}>{data.teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select><select value={s.role} onChange={(e) => updateStaff(s.id, { role: e.target.value as Role })}><option value="admin">관리자</option><option value="employee">임직원</option><option value="free">프리</option></select><input value={s.password} onChange={(e) => updateStaff(s.id, { password: e.target.value })} /><button onClick={() => removeStaff(s.id)} type="button">삭제</button></div>)}</div></div><div className="adminCard wide"><h2>팀 리스트</h2><div className="editList">{data.teams.map((team) => <div className="editRow team" key={team.id}><input value={team.name} onChange={(e) => updateTeam(team.id, { name: e.target.value })} /><input value={team.slackChannel} onChange={(e) => updateTeam(team.id, { slackChannel: e.target.value })} /><ColorPalette compact label="색상" value={team.color} onChange={(color) => updateTeam(team.id, { color })} /><button type="button" onClick={() => removeTeam(team.id)}>삭제</button></div>)}</div></div></section>}
    {dayPopupDate && <DayScheduleModal date={dayPopupDate} schedules={dayPopupSchedules} scheduleTitle={scheduleTitle} displayColor={displayColor} onClose={() => setDayPopupDate('')} onAdd={() => openNewSchedule(dayPopupDate)} onEdit={openEdit} />}
    {showForm && editing && <ScheduleForm editing={editing} currentUser={currentUser} teamName={teamName} teamColor={teamColor} onTypeChange={onTypeChange} onStartTimeChange={onStartTimeChange} onChange={setEditing} onClose={() => setShowForm(false)} onSubmit={saveSchedule} onDelete={deleteSchedule} />}
  </main>
}

function ColorPalette({ label, value, onChange, compact = false }: { label: string; value: string; onChange: (color: string) => void; compact?: boolean }) {
  return <div className={`paletteField ${compact ? 'compact' : ''}`}><span>{label}</span><details><summary><i style={{ backgroundColor: value }} />색상 선택</summary><div className="paletteGrid">{paletteColors.map((color) => <button type="button" key={color} className={color.toLowerCase() === value.toLowerCase() ? 'selected' : ''} style={{ backgroundColor: color }} onClick={() => onChange(color)} aria-label={color}>{color.toLowerCase() === value.toLowerCase() ? '✓' : ''}</button>)}</div></details></div>
}

function ScheduleList({ schedules, staffName, scheduleTitle, displayColor, onEdit, onDelete, canEdit }: { schedules: Schedule[]; teamName: (id: string) => string; staffName: (id: string) => string; scheduleTitle: (schedule: Schedule) => string; displayColor: (schedule: Schedule) => string; onEdit: (schedule: Schedule) => void; onDelete: (id: string) => void; canEdit: (schedule: Schedule) => boolean }) {
  if (!schedules.length) return <div className="emptyState">표시할 일정이 없습니다.</div>
  return <div className="scheduleList">{schedules.map((s) => <article className="scheduleCard" key={s.id}><div className="scheduleTime"><span style={{ backgroundColor: displayColor(s) }}>{s.allDay ? '종일' : s.startTime}</span><b>{s.allDay ? '하루종일' : `${s.startTime}~${s.endTime}`}</b></div><div className="scheduleMain"><h3>{scheduleTitle(s)}</h3><p>{s.date} · 담당 {staffName(s.ownerId)}</p></div><p className="desc">{s.description || '상세 내용 없음'}</p>{s.repeat !== 'none' && <em className="repeatBadge" style={{ color: displayColor(s) }}>{repeatLabels[s.repeat]} 반복</em>}{canEdit(s) && <div className="cardActions"><button onClick={() => onEdit(s)}>수정</button><button onClick={() => onDelete(s.id)}>삭제</button></div>}</article>)}</div>
}

function DayScheduleModal({ date, schedules, scheduleTitle, displayColor, onClose, onAdd, onEdit }: { date: string; schedules: Schedule[]; scheduleTitle: (schedule: Schedule) => string; displayColor: (schedule: Schedule) => string; onClose: () => void; onAdd: () => void; onEdit: (schedule: Schedule) => void }) {
  return <div className="modalBackdrop" onMouseDown={(event: MouseEvent<HTMLDivElement>) => { if (event.target === event.currentTarget) onClose() }}><section className="dayModal"><div className="formHead"><h2>{date} 일정</h2><button type="button" onClick={onClose}>×</button></div>{schedules.length ? <div className="dayScheduleList">{schedules.map((schedule) => <button key={schedule.id} onClick={() => onEdit(schedule)} style={{ '--event-color': displayColor(schedule) } as CSSProperties}><b>{schedule.allDay ? '종일' : schedule.startTime}</b><span>{scheduleTitle(schedule)}</span></button>)}</div> : <div className="emptyState compact">등록된 일정이 없습니다.</div>}<button className="primaryBtn fullBtn" onClick={onAdd}>+ 일정 등록</button></section></div>
}

function ScheduleForm({ editing, currentUser, teamName, teamColor, onTypeChange, onStartTimeChange, onChange, onClose, onSubmit, onDelete }: { editing: Schedule; currentUser: Staff; teamName: (id: string) => string; teamColor: (id: string) => string; onTypeChange: (type: ScheduleType) => void; onStartTimeChange: (value: string) => void; onChange: (schedule: Schedule) => void; onClose: () => void; onSubmit: (event: FormEvent) => void; onDelete: (id: string) => void }) {
  const userTeamName = teamName(currentUser.teamId)
  return <div className="modalBackdrop" onMouseDown={(event: MouseEvent<HTMLDivElement>) => { if (event.target === event.currentTarget) onClose() }}><form className="scheduleForm" onSubmit={onSubmit}><div className="formHead"><h2>{editing.id ? '일정 수정' : '일정 등록'}</h2><button type="button" onClick={onClose}>×</button></div><div className="typeTabs two"><button type="button" className={editing.type !== 'project' ? 'active' : ''} onClick={() => onTypeChange('event')}>일정</button><button type="button" className={editing.type === 'project' ? 'active' : ''} onClick={() => onTypeChange('project')}>프로젝트</button></div>{editing.type !== 'project' && <div className="autoTeamBox" style={{ '--team-color': teamColor(currentUser.teamId) } as CSSProperties}><span>{teamIcon(userTeamName)}</span><b>{userTeamName}</b><small>내 팀으로 자동 등록됩니다.</small></div>}<label>일정<input value={editing.title} onChange={(e) => onChange({ ...editing, title: e.target.value })} placeholder="예: 사무실, 외근, 회의" /></label><div className="twoCol"><label>날짜<input type="date" value={editing.date} onChange={(e) => onChange({ ...editing, date: e.target.value, repeatUntil: editing.repeatUntil < e.target.value ? e.target.value : editing.repeatUntil })} /></label>{editing.type === 'project' ? <label>종료일<input type="date" min={editing.date} value={editing.repeatUntil || editing.date} onChange={(e) => onChange({ ...editing, repeatUntil: e.target.value < editing.date ? editing.date : e.target.value })} /></label> : <label className="checkLine"><input type="checkbox" checked={editing.allDay} onChange={(e) => onChange({ ...editing, allDay: e.target.checked })} /> 하루종일</label>}</div>{editing.type !== 'project' && !editing.allDay && <div className="twoCol"><label>시작<input type="time" value={editing.startTime} onChange={(e) => onStartTimeChange(e.target.value)} /></label><label>종료<input type="time" min={editing.startTime} value={editing.endTime} onChange={(e) => onChange({ ...editing, endTime: e.target.value < editing.startTime ? editing.startTime : e.target.value })} /></label></div>}{editing.type === 'project' && <ColorPalette label="프로젝트 색상" value={editing.color} onChange={(color) => onChange({ ...editing, color })} />}<label>상세<textarea value={editing.description} onChange={(e) => onChange({ ...editing, description: e.target.value })} placeholder="상세 메모" /></label><div className="twoCol"><label>반복<select value={editing.repeat} onChange={(e) => onChange({ ...editing, repeat: e.target.value as RepeatType })}><option value="none">반복 없음</option><option value="daily">매일</option><option value="weekly">매주</option><option value="monthly">매월</option></select></label>{editing.repeat !== 'none' && <label>반복 종료<input type="date" min={editing.date} value={editing.repeatUntil || editing.date} onChange={(e) => onChange({ ...editing, repeatUntil: e.target.value })} /></label>}</div><label className="checkLine"><input type="checkbox" checked={editing.notifySlack} onChange={(e) => onChange({ ...editing, notifySlack: e.target.checked })} /> Slack 알림 사용</label><div className="formActions"><button className="primaryBtn">저장</button>{editing.id && <button type="button" className="ghost" onClick={() => onDelete(editing.id)}>삭제</button>}</div></form></div>
}

function ProjectCalendar({ monthDays, cursor, projects, teamName, onEdit, onPrev, onNext }: { monthDays: Date[]; cursor: Date; projects: Schedule[]; teamName: (id: string) => string; onEdit: (schedule: Schedule) => void; onPrev: () => void; onNext: () => void }) {
  const firstDay = toISODate(monthDays[0])
  const lastDay = toISODate(monthDays[41])
  return <section className="calendarPanel projectPanel"><div className="calendarHeader"><button onClick={onPrev}>‹</button><h2>프로젝트 · {cursor.getFullYear()}년 {cursor.getMonth() + 1}월</h2><button onClick={onNext}>›</button></div><div className="weekdays projectDays">{monthDays.map((d) => <b key={toISODate(d)} className={d.getMonth() !== cursor.getMonth() ? 'mutedText' : ''}>{d.getDate()}</b>)}</div><div className="projectRows">{projects.map((project, index) => { const start = clamp(Math.floor((parseISODate(project.date).getTime() - parseISODate(firstDay).getTime()) / 86400000), 0, 41); const end = clamp(Math.floor((parseISODate(project.repeatUntil || project.date).getTime() - parseISODate(firstDay).getTime()) / 86400000), 0, 41); if ((project.repeatUntil || project.date) < firstDay || project.date > lastDay) return null; return <div className="projectRow" key={project.id}><button className="projectBar" style={{ gridColumn: `${start + 1} / ${end + 2}`, backgroundColor: project.color, top: `${index % 3 * 30}px` }} onClick={() => onEdit(project)}><span>{project.title}</span><small>{teamName(project.teamId)} · {project.date}~{project.repeatUntil || project.date}</small></button></div> })}</div></section>
}
