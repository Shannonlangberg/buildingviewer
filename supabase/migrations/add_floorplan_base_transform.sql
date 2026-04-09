-- Stores the base image scale/offset so all devices share the same alignment.
-- Run once in Supabase SQL editor.
alter table public.floorplans
  add column if not exists base_image_transform jsonb default '{"scale":1,"offsetX":0,"offsetY":0}'::jsonb;
