-- โครงฐานข้อมูลของ Calorie&Check บน Supabase
-- วิธีใช้: Supabase Dashboard → SQL Editor → วางทั้งไฟล์ → Run (รันซ้ำได้ ไม่ลบข้อมูลเดิม)
--
-- ทุกตารางมี user_id ที่ใส่ให้อัตโนมัติจากผู้ที่ล็อกอิน (auth.uid())
-- และเปิด Row Level Security ให้แต่ละคนอ่าน/เขียนได้เฉพาะข้อมูลของตัวเอง

-- การสแกน: รูปหนึ่งรูปในมื้อหนึ่ง (items = รายการอาหารแบบ JSON, thumbnail = รูปย่อ data URL)
create table if not exists public.scans (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  date date not null,
  meal text not null check (meal in ('breakfast', 'lunch', 'dinner', 'snack')),
  created_at bigint not null,
  thumbnail text,
  items jsonb not null default '[]'::jsonb,
  primary key (user_id, id)
);
create index if not exists scans_user_date on public.scans (user_id, date);

-- น้ำหนักตัว: วันละค่า
create table if not exists public.weights (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null,
  weight_kg double precision not null check (weight_kg > 0 and weight_kg < 500),
  primary key (user_id, date)
);

-- การตั้งค่า: เป้าแคลอรี่ ข้อมูลร่างกาย โมเดลที่เลือก (คนละแถว)
create table if not exists public.settings (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb
);

-- ให้ผู้ที่ล็อกอินเรียกตารางผ่าน Data API ได้ (โปรเจกต์ที่ปิด "expose new tables" ไว้จะไม่ให้สิทธิ์เอง)
grant select, insert, update, delete on public.scans, public.weights, public.settings to authenticated;

alter table public.scans enable row level security;
alter table public.weights enable row level security;
alter table public.settings enable row level security;

-- (select auth.uid()) ในวงเล็บ = คำนวณครั้งเดียวต่อคำสั่ง เร็วกว่าเรียกทุกแถว
drop policy if exists "own scans" on public.scans;
create policy "own scans" on public.scans
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "own weights" on public.weights;
create policy "own weights" on public.weights
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "own settings" on public.settings;
create policy "own settings" on public.settings
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
