-- =============================================================================
-- Mt Barker Building — run once in Supabase: SQL Editor → New query → Run
-- (Combines schema.sql + seed.sql)
-- =============================================================================

-- --- schema (tables, RLS, storage bucket) -------------------------------------

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
  label_text_color text default '#f8fafc',
  label_font_size numeric default 2.1,
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

insert into storage.buckets (id, name, public)
values ('room-images', 'room-images', true)
on conflict (id) do nothing;

create policy "room_images_public_read" on storage.objects
  for select using (bucket_id = 'room-images');

-- --- seed (default floorplan + rooms) ---------------------------------------

insert into public.floorplans (id, name, slug, image_path, is_active)
values (
  '00000000-0000-4000-8000-000000000001',
  'Mt Barker Campus',
  'mt-barker',
  '/floorplans/mt-barker-base.svg',
  true
)
on conflict (id) do nothing;

insert into public.rooms (
  id, name, slug, svg_zone_id, status, color,
  label_x, label_y, shape_type,
  rect_x, rect_y, rect_width, rect_height, polygon_points, sort_order
) values
  ('00000000-0000-4000-8000-000000000011', 'Foyer', 'foyer', 'zone-foyer', 'confirmed', '#ca8a04',
   46, 88, 'rect', 34, 76, 24, 18, null, 10),
  ('00000000-0000-4000-8000-000000000012', 'Cafe', 'cafe', 'zone-cafe', 'in_progress', '#64748b',
   72, 70, 'rect', 60, 58, 22, 20, null, 20),
  ('00000000-0000-4000-8000-000000000013', 'Auditorium', 'auditorium', 'zone-auditorium', 'confirmed', '#ea580c',
   38, 42, 'polygon', null, null, null, null, '28,24 78,24 78,58 62,58 62,52 28,52', 30),
  ('00000000-0000-4000-8000-000000000014', 'Production', 'production', 'zone-production', 'pending', '#475569',
   88, 40, 'rect', 78, 22, 20, 36, null, 40),
  ('00000000-0000-4000-8000-000000000015', 'Parents Room', 'parents-room', 'zone-parents', 'confirmed', '#78716c',
   16, 69, 'rect', 6, 66, 20, 9, null, 50),
  ('00000000-0000-4000-8000-000000000016', 'Kids Opt 1', 'kids-opt-1', 'zone-kids-1', 'confirmed', '#166534',
   16, 30, 'rect', 6, 20, 20, 16, null, 60),
  ('00000000-0000-4000-8000-000000000017', 'Kids Opt 2', 'kids-opt-2', 'zone-kids-2', 'in_progress', '#15803d',
   16, 46, 'rect', 6, 38, 20, 14, null, 70),
  ('00000000-0000-4000-8000-000000000018', 'Kids Opt 3', 'kids-opt-3', 'zone-kids-3', 'pending', '#22c55e',
   16, 56, 'rect', 6, 54, 20, 10, null, 80),
  ('00000000-0000-4000-8000-000000000019', 'Female', 'female', 'zone-female', 'confirmed', '#d6d3d1',
   10, 84, 'rect', 6, 77, 9, 11, null, 90),
  ('00000000-0000-4000-8000-00000000001a', 'Male', 'male', 'zone-male', 'confirmed', '#a8a29e',
   21, 84, 'rect', 17, 77, 9, 11, null, 100),
  ('00000000-0000-4000-8000-00000000001b', 'Store', 'store', 'zone-store', 'pending', '#57534e',
   86, 72, 'rect', 82, 62, 16, 18, null, 110),
  ('00000000-0000-4000-8000-00000000001c', 'Alfresco', 'alfresco', 'zone-alfresco', 'confirmed', '#c2410c',
   50, 10, 'rect', 22, 4, 56, 12, null, 120)
on conflict (id) do nothing;
