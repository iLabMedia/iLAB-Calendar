import assert from 'node:assert/strict'
import test from 'node:test'
import { buildDailyBrief, makeSchedule, type AppData } from '../api/_lib/scheduler.js'

const data: AppData = {
  teams: [{ id: 'team-media', name: '미디어팀', slackChannel: '', color: '#5D2E8D' }],
  staff: [{ id: 'staff-1', name: '박찬우', teamId: 'team-media', role: 'employee', password: '' }],
  schedules: [
    makeSchedule({
      id: 'multi-day-event',
      title: '부산 출장',
      date: '2026-09-21',
      repeatUntil: '2026-09-23',
      repeat: 'none',
      teamId: 'team-media',
      ownerId: 'staff-1',
      memberIds: ['staff-1'],
      createdBy: 'staff-1',
    }),
  ],
}

test('다일 일정은 시작일 이후 날짜의 브리핑에도 포함된다', () => {
  const brief = buildDailyBrief(data, '2026-09-22')
  assert.match(brief, /박찬우 - 부산 출장/)
})

test('월간 반복 일정은 다음 달 브리핑에도 포함된다', () => {
  const monthlyData: AppData = {
    ...data,
    schedules: [
      makeSchedule({
        id: 'monthly-event',
        title: '월간 정기회의',
        date: '2026-09-10',
        repeatUntil: '2026-11-10',
        repeat: 'monthly',
        teamId: 'team-media',
        ownerId: 'staff-1',
        memberIds: ['staff-1'],
        createdBy: 'staff-1',
      }),
    ],
  }
  const brief = buildDailyBrief(monthlyData, '2026-10-10')
  assert.match(brief, /박찬우 - 월간 정기회의/)
})
