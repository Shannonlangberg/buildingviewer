-- Mt Barker Building — run in Supabase SQL editor (new project)

create extension if not exists "uuid-ossp";

create table if not exists public.floorplans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  image_path text,
  svg_content text,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  svg_zone_id text,
  status text not null default 'pending'
    check (status in ('pending', 'in_progress', 'confirmed')),
  color text not null default '#64748b',
  label_x numeric not null default 50,
  label_y numeric not null default 50,
  shape_type text not null default 'rect'
    check (shape_type in ('rect', 'polygon')),
  rect_x numeric,
  rect_y numeric,
  rect_width numeric,
  rect_height numeric,
  polygon_points text,
  sort_order int not null default 0,
  created_at timestamptz default now()
);

create table if not exists public.room_images (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  storage_path text not null,
  caption text,
  uploaded_at timestamptz default now(),
  uploader_name text,
  sort_order int not null default 0
);

create index if not exists room_images_room_id_idx on public.room_images (room_id);

alter table public.floorplans enable row level security;
alter table public.rooms enable row level security;
alter table public.room_images enable row level security;

create policy "floorplans_select_public" on public.floorplans
  for select using (true);

create policy "rooms_select_public" on public.rooms
  for select using (true);

create policy "room_images_select_public" on public.room_images
  for select using (true);

-- Writes go through Next.js API using the service role (bypasses RLS).

-- Storage bucket (public read for gallery URLs)
insert into storage.buckets (id, name, public)
values ('room-images', 'room-images', true)
on conflict (id) do nothing;

create policy "room_images_public_read" on storage.objects
  for select using (bucket_id = 'room-images');

-- Optional: allow authenticated uploads later; for now only service role uploads apply.
