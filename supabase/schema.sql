-- 旅伴 TripPals — Supabase 資料庫結構
-- 在 Supabase 後台 → SQL Editor → 貼上整份 → Run

-- 個人檔案（暱稱 + 3D 角色外觀），同行人看得到
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  avatar jsonb,
  created_at timestamptz default now()
);

-- 旅程
create table if not exists public.trips (
  id uuid primary key,
  owner_id uuid not null references auth.users on delete cascade default auth.uid(),
  name text not null,
  destination text,
  start_date date,
  end_date date,
  emoji text,
  color text,
  center jsonb,
  invite_code text unique default upper(substr(md5(random()::text), 1, 6)),
  created_at timestamptz default now()
);

-- 旅程成員（含是否分享位置）
create table if not exists public.trip_members (
  trip_id uuid references public.trips on delete cascade,
  user_id uuid references auth.users on delete cascade,
  share_location boolean not null default false,
  joined_at timestamptz default now(),
  primary key (trip_id, user_id)
);

-- 共享行程（同行人都看得到、都能編輯）
create table if not exists public.itinerary (
  id uuid primary key,
  trip_id uuid not null references public.trips on delete cascade,
  created_by uuid references auth.users on delete set null default auth.uid(),
  day date,
  time text,
  title text not null,
  lat double precision,
  lng double precision,
  address text,
  note text,
  position double precision,
  created_at timestamptz default now()
);

-- 我的地點（僅自己可見）
create table if not exists public.places (
  id uuid primary key,
  trip_id uuid not null references public.trips on delete cascade,
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  name text not null,
  lat double precision,
  lng double precision,
  address text,
  category text,
  images text[] default '{}',
  created_at timestamptz default now()
);

-- 地點裡的「想逛 / 想買 / 想參觀」（僅自己可見）
create table if not exists public.place_items (
  id uuid primary key,
  place_id uuid not null references public.places on delete cascade,
  trip_id uuid not null references public.trips on delete cascade,
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  kind text not null,
  text text,
  url text,
  images text[] default '{}',
  done boolean default false,
  created_at timestamptz default now()
);

-- 筆記：攜帶清單 / 穿搭 / 備忘（僅自己可見）
create table if not exists public.notes (
  id uuid primary key,
  trip_id uuid not null references public.trips on delete cascade,
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  kind text not null,
  title text,
  body text,
  day date,
  checked boolean default false,
  images text[] default '{}',
  created_at timestamptz default now()
);

-- 成員即時位置（只有選擇分享的人才會有資料）
create table if not exists public.member_locations (
  trip_id uuid references public.trips on delete cascade,
  user_id uuid references auth.users on delete cascade,
  lat double precision not null,
  lng double precision not null,
  heading double precision,
  updated_at timestamptz default now(),
  primary key (trip_id, user_id)
);

-- ---------- 輔助函式 ----------
create or replace function public.is_member(t uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from trip_members where trip_id = t and user_id = auth.uid());
$$;

create or replace function public.shares_trip_with(other uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from trip_members a join trip_members b on a.trip_id = b.trip_id
    where a.user_id = auth.uid() and b.user_id = other
  );
$$;

-- 建立旅程時自動把建立者加入成員
create or replace function public.add_owner_member() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into trip_members (trip_id, user_id) values (new.id, new.owner_id) on conflict do nothing;
  return new;
end $$;

drop trigger if exists trips_add_owner on public.trips;
create trigger trips_add_owner after insert on public.trips
  for each row execute function public.add_owner_member();

-- 用邀請碼加入旅程
create or replace function public.join_trip(code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare t uuid;
begin
  select id into t from trips where invite_code = upper(code);
  if t is null then raise exception '找不到這個邀請碼'; end if;
  insert into trip_members (trip_id, user_id) values (t, auth.uid()) on conflict do nothing;
  return t;
end $$;

-- ---------- Row Level Security ----------
alter table public.profiles enable row level security;
alter table public.trips enable row level security;
alter table public.trip_members enable row level security;
alter table public.itinerary enable row level security;
alter table public.places enable row level security;
alter table public.place_items enable row level security;
alter table public.notes enable row level security;
alter table public.member_locations enable row level security;

drop policy if exists p_profiles_read on public.profiles;
create policy p_profiles_read on public.profiles for select
  using (id = auth.uid() or public.shares_trip_with(id));
drop policy if exists p_profiles_write on public.profiles;
create policy p_profiles_write on public.profiles for all
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists p_trips_read on public.trips;
create policy p_trips_read on public.trips for select
  using (owner_id = auth.uid() or public.is_member(id));
drop policy if exists p_trips_insert on public.trips;
create policy p_trips_insert on public.trips for insert with check (owner_id = auth.uid());
drop policy if exists p_trips_update on public.trips;
create policy p_trips_update on public.trips for update using (public.is_member(id));
drop policy if exists p_trips_delete on public.trips;
create policy p_trips_delete on public.trips for delete using (owner_id = auth.uid());

drop policy if exists p_members_read on public.trip_members;
create policy p_members_read on public.trip_members for select using (public.is_member(trip_id));
drop policy if exists p_members_update on public.trip_members;
create policy p_members_update on public.trip_members for update using (user_id = auth.uid());
drop policy if exists p_members_delete on public.trip_members;
create policy p_members_delete on public.trip_members for delete using (user_id = auth.uid());

drop policy if exists p_itin_all on public.itinerary;
create policy p_itin_all on public.itinerary for all
  using (public.is_member(trip_id)) with check (public.is_member(trip_id));

drop policy if exists p_places_own on public.places;
create policy p_places_own on public.places for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists p_items_own on public.place_items;
create policy p_items_own on public.place_items for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists p_notes_own on public.notes;
create policy p_notes_own on public.notes for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 位置：自己可寫；同旅程成員只有在對方「開啟分享」時才讀得到
drop policy if exists p_loc_write on public.member_locations;
create policy p_loc_write on public.member_locations for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and exists (
    select 1 from public.trip_members m
    where m.trip_id = member_locations.trip_id and m.user_id = auth.uid() and m.share_location));
drop policy if exists p_loc_read on public.member_locations;
create policy p_loc_read on public.member_locations for select
  using (public.is_member(trip_id) and exists (
    select 1 from public.trip_members m
    where m.trip_id = member_locations.trip_id and m.user_id = member_locations.user_id and m.share_location));

-- ---------- 圖片儲存空間（私人） ----------
insert into storage.buckets (id, name, public) values ('media', 'media', false)
  on conflict (id) do nothing;

drop policy if exists p_media_own on storage.objects;
create policy p_media_own on storage.objects for all
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
