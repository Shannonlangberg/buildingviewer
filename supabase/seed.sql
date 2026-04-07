-- Seed floorplan + rooms (IDs match lib/mock-data.ts for consistency)

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
