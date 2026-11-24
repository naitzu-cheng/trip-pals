-- 更新 #4：行程可以填寫交通方式（怎麼到這一站）
-- 已經執行過 schema.sql 的專案，請在 Supabase → SQL Editor 貼上這段 → Run（只需執行一次）
alter table public.itinerary add column if not exists transport text;
alter table public.itinerary add column if not exists transport_note text;
notify pgrst, 'reload schema';
