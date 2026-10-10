-- 更新 #2：行程可以手動排序
-- 已經執行過 schema.sql 的專案，請在 Supabase → SQL Editor 貼上這段 → Run（只需執行一次）
alter table public.itinerary add column if not exists position double precision;
notify pgrst, 'reload schema';
