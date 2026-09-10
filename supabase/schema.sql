-- I.LAB Calendar / Scheduler Supabase schema
-- Supabase Dashboard > SQL Editor > New query 에 붙여넣고 Run 하세요.
-- 주의: 아래 정책은 MVP 개발/테스트용으로 넓게 열려 있습니다.
-- 운영 전에 Vercel API + Supabase service role 구조로 잠그는 것이 안전합니다.

create extension if not exists pgcrypto;

-- 기존 테스트 테이블을 다시 만들 때 사용하려면 아래 drop 주석을 해제하세요.
-- drop table if exists public.slack_logs cascade;
-- drop table if exists public.schedules cascade;
-- drop table if exists public.slack_channels cascade;
-- drop table if exists public.staff cascade;
-- drop table if exists public.teams cascade;

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slack_channel text,
  color text not null default '#5D2E8D',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.staff (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  team_id uuid references public.teams(id) on delete set null,
  role text not null default 'employee' check (role in ('admin','employee','free')),
  position text not null default '임직원' check (position in ('관리자','임직원','프리')),
  password_code text not null default '1111',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.schedules (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'team' check (type in ('team','event','project')),
  title text not null,
  content text,
  team_id uuid references public.teams(id) on delete set null,
  owner_id uuid references public.staff(id) on delete set null,
  created_by uuid references public.staff(id) on delete set null,
  start_date date not null,
  end_date date not null,
  start_time time,
  end_time time,
  is_all_day boolean not null default true,
  repeat_type text not null default 'none' check (repeat_type in ('none','daily','weekly','monthly')),
  repeat_until date,
  color text not null default '#5D2E8D',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date),
  check (is_all_day = true or start_time is not null),
  check (end_time is null or start_time is null or end_time >= start_time)
);


create table if not exists public.company_docs (
  id uuid primary key default gen_random_uuid(),
  category text not null default '회사정책' check (category in ('회사정책','복지','경비','장비')),
  title text not null,
  summary text,
  content text,
  is_published boolean not null default true,
  updated_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.slack_channels (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams(id) on delete cascade,
  channel_name text not null,
  channel_id text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.slack_logs (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid references public.schedules(id) on delete set null,
  action text not null check (action in ('create','update','delete','briefing','command')),
  channel_name text,
  channel_id text,
  status text not null default 'pending' check (status in ('pending','sent','failed')),
  message text,
  error_message text,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_teams_updated_at on public.teams;
create trigger set_teams_updated_at before update on public.teams
for each row execute function public.set_updated_at();

drop trigger if exists set_staff_updated_at on public.staff;
create trigger set_staff_updated_at before update on public.staff
for each row execute function public.set_updated_at();

drop trigger if exists set_schedules_updated_at on public.schedules;
create trigger set_schedules_updated_at before update on public.schedules
for each row execute function public.set_updated_at();

drop trigger if exists set_company_docs_updated_at on public.company_docs;
create trigger set_company_docs_updated_at before update on public.company_docs
for each row execute function public.set_updated_at();

drop trigger if exists set_slack_channels_updated_at on public.slack_channels;
create trigger set_slack_channels_updated_at before update on public.slack_channels
for each row execute function public.set_updated_at();

-- 기본 팀 데이터
insert into public.teams (name, slack_channel, color) values
  ('미디어팀', '#미디어팀', '#7C3AED'),
  ('경영팀', '#경영팀', '#F0932B'),
  ('기획팀', '#기획팀', '#10B981'),
  ('테크팀', '#테크팀', '#2563EB')
on conflict (name) do update set
  slack_channel = excluded.slack_channel,
  color = excluded.color,
  updated_at = now();

-- 기본 직원 데이터: 실제 운영 전에는 비밀번호를 반드시 변경하세요.
insert into public.staff (name, team_id, role, position, password_code)
select '관리자', id, 'admin', '관리자', '0000' from public.teams where name = '경영팀'
on conflict (name) do update set role = excluded.role, position = excluded.position, team_id = excluded.team_id;

insert into public.staff (name, team_id, role, position, password_code)
select '미디어', id, 'employee', '임직원', '1111' from public.teams where name = '미디어팀'
on conflict (name) do update set role = excluded.role, position = excluded.position, team_id = excluded.team_id;

insert into public.staff (name, team_id, role, position, password_code)
select '기획', id, 'employee', '임직원', '1111' from public.teams where name = '기획팀'
on conflict (name) do update set role = excluded.role, position = excluded.position, team_id = excluded.team_id;

insert into public.staff (name, team_id, role, position, password_code)
select '테크', id, 'employee', '임직원', '1111' from public.teams where name = '테크팀'
on conflict (name) do update set role = excluded.role, position = excluded.position, team_id = excluded.team_id;

-- Slack 채널 기본 매핑
insert into public.slack_channels (team_id, channel_name, is_default)
select id, slack_channel, true from public.teams
on conflict do nothing;

-- MVP 테스트용 RLS 정책
-- 현재 Vite 프론트에서 anon key로 직접 접근할 수 있게 열어둔 정책입니다.
-- 운영에서는 아래 정책을 제거하고 Vercel API를 통해 service role로만 쓰는 구조를 권장합니다.
alter table public.teams enable row level security;
alter table public.staff enable row level security;
alter table public.schedules enable row level security;
alter table public.slack_channels enable row level security;
alter table public.slack_logs enable row level security;
alter table public.company_docs enable row level security;


drop policy if exists "mvp read teams" on public.teams;
create policy "mvp read teams" on public.teams for select using (true);
drop policy if exists "mvp write teams" on public.teams;
create policy "mvp write teams" on public.teams for all using (true) with check (true);

drop policy if exists "mvp read staff" on public.staff;
create policy "mvp read staff" on public.staff for select using (true);
drop policy if exists "mvp write staff" on public.staff;
create policy "mvp write staff" on public.staff for all using (true) with check (true);

drop policy if exists "mvp read schedules" on public.schedules;
create policy "mvp read schedules" on public.schedules for select using (true);
drop policy if exists "mvp write schedules" on public.schedules;
create policy "mvp write schedules" on public.schedules for all using (true) with check (true);

drop policy if exists "mvp read slack_channels" on public.slack_channels;
create policy "mvp read slack_channels" on public.slack_channels for select using (true);
drop policy if exists "mvp write slack_channels" on public.slack_channels;
create policy "mvp write slack_channels" on public.slack_channels for all using (true) with check (true);

drop policy if exists "mvp read slack_logs" on public.slack_logs;
create policy "mvp read slack_logs" on public.slack_logs for select using (true);
drop policy if exists "mvp write slack_logs" on public.slack_logs;
create policy "mvp write slack_logs" on public.slack_logs for all using (true) with check (true);


drop policy if exists "mvp read company docs" on public.company_docs;
create policy "mvp read company docs" on public.company_docs for select using (true);
drop policy if exists "mvp write company docs" on public.company_docs;
create policy "mvp write company docs" on public.company_docs for all using (true) with check (true);

