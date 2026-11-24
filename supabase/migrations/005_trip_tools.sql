-- 更新 #5：記帳分帳、票券與訂位、旅行回憶
-- 在 Supabase → SQL Editor 貼上這整段 → Run（只需執行一次）

-- 旅程的主要幣別、沒有用 App 的同行人（只記名字，給分帳用）
alter table public.trips add column if not exists currency text default 'TWD';
alter table public.trips add column if not exists guests jsonb default '[]';

-- 記帳（同旅程成員共享）
create table if not exists public.expenses (
  id uuid primary key,
  trip_id uuid not null references public.trips on delete cascade,
  created_by uuid references auth.users on delete set null default auth.uid(),
  kind text not null default 'expense',   -- expense：花費／settle：還錢
  title text,
  category text,
  amount numeric not null,
  currency text not null,
  rate numeric not null default 1,        -- 1 單位外幣 = 多少旅程幣別
  paid_by text not null,                  -- 成員 user id 或同行人 id（g_ 開頭）
  split_among text[] not null default '{}',
  shares jsonb,                           -- 不平分時：{ 人: 金額 }
  day date,
  note text,
  created_at timestamptz default now()
);

-- 票券與訂位（同旅程成員共享）
create table if not exists public.bookings (
  id uuid primary key,
  trip_id uuid not null references public.trips on delete cascade,
  created_by uuid references auth.users on delete set null default auth.uid(),
  kind text not null,                     -- flight / train / hotel / ticket / car / other
  title text not null,
  ref_code text,
  start_at text,                          -- yyyy-mm-ddThh:mm（當地時間）
  end_at text,
  place text,
  note text,
  images text[] default '{}',
  itinerary_id uuid references public.itinerary on delete set null,
  created_at timestamptz default now()
);

-- 旅行回憶（照片＋文字，同旅程成員共享）
create table if not exists public.memories (
  id uuid primary key,
  trip_id uuid not null references public.trips on delete cascade,
  created_by uuid references auth.users on delete set null default auth.uid(),
  day date,
  itinerary_id uuid references public.itinerary on delete set null,
  caption text,
  images text[] default '{}',
  created_at timestamptz default now()
);

alter table public.expenses enable row level security;
alter table public.bookings enable row level security;
alter table public.memories enable row level security;

drop policy if exists p_expenses_all on public.expenses;
create policy p_expenses_all on public.expenses for all
  using (public.is_member(trip_id)) with check (public.is_member(trip_id));
drop policy if exists p_bookings_all on public.bookings;
create policy p_bookings_all on public.bookings for all
  using (public.is_member(trip_id)) with check (public.is_member(trip_id));
drop policy if exists p_memories_all on public.memories;
create policy p_memories_all on public.memories for all
  using (public.is_member(trip_id)) with check (public.is_member(trip_id));

-- 共享圖片放在 trips/<旅程 id>/ 底下，同旅程成員都能看、能上傳、能刪除
create or replace function public.is_member_text(t text) returns boolean
language plpgsql security definer stable set search_path = public as $$
begin
  return exists (select 1 from trip_members where trip_id = t::uuid and user_id = auth.uid());
exception when others then return false;
end $$;

drop policy if exists p_media_trip on storage.objects;
create policy p_media_trip on storage.objects for all
  using (bucket_id = 'media' and (storage.foldername(name))[1] = 'trips' and public.is_member_text((storage.foldername(name))[2]))
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = 'trips' and public.is_member_text((storage.foldername(name))[2]));

notify pgrst, 'reload schema';
