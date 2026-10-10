-- 更新 #3：用密碼把自己的「地點 / 筆記」分享給同行夥伴（唯讀）
-- 在 Supabase → SQL Editor 貼上這整段 → Run（只需執行一次）

create extension if not exists pgcrypto with schema extensions;

-- 每個人在每趟旅程的分享密碼（只存加密後的雜湊，任何人都讀不到）
create table if not exists public.private_shares (
  trip_id uuid references public.trips on delete cascade,
  user_id uuid references auth.users on delete cascade,
  pass_hash text not null,
  created_at timestamptz default now(),
  primary key (trip_id, user_id)
);
alter table public.private_shares enable row level security;
-- 不開任何 policy：只能透過下面的函式存取

-- 誰已經輸入正確密碼、可以看誰的資料
create table if not exists public.private_grants (
  trip_id uuid references public.trips on delete cascade,
  owner_id uuid references auth.users on delete cascade,
  viewer_id uuid references auth.users on delete cascade,
  created_at timestamptz default now(),
  primary key (trip_id, owner_id, viewer_id)
);
alter table public.private_grants enable row level security;
drop policy if exists p_grants_read on public.private_grants;
create policy p_grants_read on public.private_grants for select
  using (viewer_id = auth.uid() or owner_id = auth.uid());

create or replace function public.has_private_grant(t uuid, owner uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from private_grants where trip_id = t and owner_id = owner and viewer_id = auth.uid());
$$;

-- 設定 / 更換 / 關閉密碼（更換或關閉時，之前解鎖的人要重新輸入）
create or replace function public.set_private_password(t uuid, pass text) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not is_member(t) then raise exception '不是這趟旅程的成員'; end if;
  delete from private_grants where trip_id = t and owner_id = auth.uid();
  if pass is null or length(pass) = 0 then
    delete from private_shares where trip_id = t and user_id = auth.uid();
  else
    if length(pass) < 4 then raise exception '密碼至少 4 個字'; end if;
    insert into private_shares (trip_id, user_id, pass_hash) values (t, auth.uid(), crypt(pass, gen_salt('bf')))
      on conflict (trip_id, user_id) do update set pass_hash = excluded.pass_hash, created_at = now();
  end if;
end $$;

-- 輸入夥伴的密碼
create or replace function public.unlock_private(t uuid, owner uuid, pass text) returns boolean
language plpgsql security definer set search_path = public, extensions as $$
declare h text;
begin
  if not is_member(t) then raise exception '不是這趟旅程的成員'; end if;
  select pass_hash into h from private_shares where trip_id = t and user_id = owner;
  if h is null then raise exception '對方沒有開啟分享'; end if;
  if pass is null or crypt(pass, h) is distinct from h then return false; end if;
  insert into private_grants (trip_id, owner_id, viewer_id) values (t, owner, auth.uid()) on conflict do nothing;
  return true;
end $$;

-- 這趟旅程裡誰有開分享、我是否已解鎖（不會回傳密碼）
create or replace function public.private_status(t uuid) returns table (user_id uuid, granted boolean)
language sql security definer stable set search_path = public as $$
  select s.user_id, exists (select 1 from private_grants g where g.trip_id = t and g.owner_id = s.user_id and g.viewer_id = auth.uid())
  from private_shares s where s.trip_id = t and is_member(t);
$$;

-- 解鎖後可以「讀」對方的地點、清單、筆記
drop policy if exists p_places_shared on public.places;
create policy p_places_shared on public.places for select using (public.has_private_grant(trip_id, user_id));
drop policy if exists p_items_shared on public.place_items;
create policy p_items_shared on public.place_items for select using (public.has_private_grant(trip_id, user_id));
drop policy if exists p_notes_shared on public.notes;
create policy p_notes_shared on public.notes for select using (public.has_private_grant(trip_id, user_id));

-- 圖片：新上傳的圖片路徑是「使用者/旅程/檔名」，解鎖的人只看得到那趟旅程的圖
drop policy if exists p_media_shared on storage.objects;
create policy p_media_shared on storage.objects for select using (
  bucket_id = 'media' and exists (
    select 1 from public.private_grants g
    where g.owner_id::text = (storage.foldername(name))[1]
      and g.trip_id::text = (storage.foldername(name))[2]
      and g.viewer_id = auth.uid()));

notify pgrst, 'reload schema';
