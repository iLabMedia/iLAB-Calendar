import { createClient } from '@supabase/supabase-js'

export type Role = 'admin' | 'employee' | 'free'
export type ScheduleType = 'team' | 'event' | 'project'
export type RepeatType = 'none' | 'daily' | 'weekly' | 'monthly'

export type Team = { id: string; name: string; slackChannel: string; color: string }
export type Staff = { id: string; name: string; teamId: string; role: Role; password: string; color?: string }
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
export type SlackSetting = { enabled: boolean; webhookUrl: string; defaultChannel: string; notifyOnCreate: boolean; notifyOnUpdate: boolean; notifyOnDelete: boolean; morningBrief: boolean }
export type AppSetting = { logoUrl: string; headerTitle: string }
export type AppData = { teams: Team[]; staff: Staff[]; schedules: Schedule[]; slack: SlackSetting; settings: AppSetting }

function cleanEnvValue(value: string | undefined) {
  return (value || '').trim().replace(/^['"]|['"]$/g, '')
}

function cleanSupabaseUrl(value: string | undefined) {
  return cleanEnvValue(value)
    .replace(/\/rest\/v1\/?$/i, '')
    .replace(/\/$/, '')
}

const supabaseUrl = cleanSupabaseUrl(import.meta.env.VITE_SUPABASE_URL as string | undefined)
const supabaseAnonKey = cleanEnvValue(import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)
export const supabase = isSupabaseConfigured ? createClient(supabaseUrl, supabaseAnonKey) : null

const emptySlack: SlackSetting = { enabled: false, webhookUrl: '', defaultChannel: '#일정', notifyOnCreate: true, notifyOnUpdate: true, notifyOnDelete: true, morningBrief: true }
const emptySettings: AppSetting = { logoUrl: '/ilabmedia-logo.png', headerTitle: 'Scheduler' }

function rowToTeam(row: Record<string, unknown>): Team {
  return {
    id: String(row.id),
    name: String(row.name || '팀 미지정'),
    slackChannel: String(row.slack_channel || '#팀채널'),
    color: String(row.color || '#5D2E8D'),
  }
}

function rowToStaff(row: Record<string, unknown>): Staff {
  return {
    id: String(row.id),
    name: String(row.name || '이름 없음'),
    teamId: String(row.team_id || ''),
    role: (row.role === 'admin' || row.role === 'free' ? row.role : 'employee') as Role,
    password: String(row.password_code || '1111'),
  }
}

function rowToSchedule(row: Record<string, unknown>): Schedule {
  return {
    id: String(row.id),
    title: String(row.title || '제목 없는 일정'),
    type: (row.type === 'project' || row.type === 'event' ? row.type : 'team') as ScheduleType,
    date: String(row.start_date || row.date || new Date().toISOString().slice(0, 10)),
    startTime: String(row.start_time || '09:00').slice(0, 5),
    endTime: String(row.end_time || row.start_time || '10:00').slice(0, 5),
    allDay: Boolean(row.is_all_day ?? true),
    teamId: String(row.team_id || ''),
    memberIds: row.owner_id ? [String(row.owner_id)] : [],
    ownerId: String(row.owner_id || ''),
    projectName: '',
    location: '',
    description: String(row.content || ''),
    color: String(row.color || '#5D2E8D'),
    repeat: (row.repeat_type === 'daily' || row.repeat_type === 'weekly' || row.repeat_type === 'monthly' ? row.repeat_type : 'none') as RepeatType,
    repeatUntil: String(row.repeat_until || row.end_date || row.start_date || ''),
    notifySlack: true,
    createdBy: String(row.created_by || row.owner_id || ''),
    updatedAt: String(row.updated_at || new Date().toISOString()),
  }
}

function teamToRow(team: Team) {
  return { id: team.id, name: team.name, slack_channel: team.slackChannel, color: team.color }
}

function staffToRow(staff: Staff) {
  return { id: staff.id, name: staff.name, team_id: staff.teamId || null, role: staff.role, position: staff.role === 'admin' ? '관리자' : staff.role === 'free' ? '프리' : '임직원', password_code: staff.password || '1111', is_active: true }
}

function scheduleToRow(schedule: Schedule) {
  const endDate = schedule.repeatUntil || schedule.date
  return {
    id: schedule.id,
    type: schedule.type,
    title: schedule.title,
    content: schedule.description || null,
    team_id: schedule.teamId || null,
    owner_id: schedule.ownerId || null,
    created_by: schedule.createdBy || schedule.ownerId || null,
    start_date: schedule.date,
    end_date: endDate,
    start_time: schedule.allDay ? null : schedule.startTime,
    end_time: schedule.allDay ? null : schedule.endTime,
    is_all_day: schedule.allDay,
    repeat_type: schedule.repeat,
    repeat_until: schedule.repeat === 'none' && schedule.type !== 'project' ? null : (schedule.repeatUntil || endDate),
    color: schedule.color || '#5D2E8D',
  }
}

export async function fetchAppDataFromSupabase(): Promise<AppData> {
  if (!supabase) throw new Error('Supabase 환경변수가 설정되지 않았습니다.')
  const [teamsResult, staffResult, schedulesResult] = await Promise.all([
    supabase.from('teams').select('*').order('created_at', { ascending: true }),
    supabase.from('staff').select('*').eq('is_active', true).order('created_at', { ascending: true }),
    supabase.from('schedules').select('*').order('start_date', { ascending: true }),
  ])
  if (teamsResult.error) throw teamsResult.error
  if (staffResult.error) throw staffResult.error
  if (schedulesResult.error) throw schedulesResult.error
  return {
    teams: (teamsResult.data || []).map(rowToTeam),
    staff: (staffResult.data || []).map(rowToStaff),
    schedules: (schedulesResult.data || []).map(rowToSchedule),
    slack: emptySlack,
    settings: emptySettings,
  }
}

export async function saveTeamToSupabase(team: Team) {
  if (!supabase) return
  const { error } = await supabase.from('teams').upsert(teamToRow(team))
  if (error) throw error
}

export async function deleteTeamFromSupabase(id: string) {
  if (!supabase) return
  const { error } = await supabase.from('teams').delete().eq('id', id)
  if (error) throw error
}

export async function saveStaffToSupabase(staff: Staff) {
  if (!supabase) return
  const { error } = await supabase.from('staff').upsert(staffToRow(staff))
  if (error) throw error
}

export async function deleteStaffFromSupabase(id: string) {
  if (!supabase) return
  const { error } = await supabase.from('staff').delete().eq('id', id)
  if (error) throw error
}

export async function saveScheduleToSupabase(schedule: Schedule) {
  if (!supabase) return
  const { error } = await supabase.from('schedules').upsert(scheduleToRow(schedule))
  if (error) throw error
}

export async function deleteScheduleFromSupabase(id: string) {
  if (!supabase) return
  const { error } = await supabase.from('schedules').delete().eq('id', id)
  if (error) throw error
}
