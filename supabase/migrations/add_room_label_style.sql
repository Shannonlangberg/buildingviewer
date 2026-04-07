-- Run once in Supabase SQL editor if your project was created before label style columns existed.
alter table public.rooms
  add column if not exists label_text_color text default '#f8fafc';

alter table public.rooms
  add column if not exists label_font_size numeric default 2.1;
