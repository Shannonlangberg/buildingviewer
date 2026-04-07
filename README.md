# Mt Barker Building

Next.js 14 (App Router) floor plan viewer with Supabase-backed room zones and image galleries.

## Local development

```bash
npm install
cp .env.example .env.local
# Optional: leave Supabase empty to use built-in mock rooms + static SVG base.
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Run `supabase/schema.sql` in the SQL editor, then `supabase/seed.sql`.
3. Copy **Project URL**, **anon key**, and **service role key** into `.env.local` (see `.env.example`).
4. The `room-images` bucket is created by the schema; public read is enabled for gallery URLs.

## Layout editor

- **Local:** the “Edit layout” bar appears automatically in `next dev`.
- **Production:** set `NEXT_PUBLIC_SHOW_FLOORPLAN_EDIT=true` if you need it on a staging deploy.
- Drag labels; move rectangles; use corner/edge handles to resize; **drag polygon rooms** (e.g. Auditorium) to move the whole shape. **Save to Supabase** uses `SUPABASE_SERVICE_ROLE_KEY` via `/api/rooms`.
- **Upload base floor plan:** in layout edit, use **Upload base floor plan** → `POST /api/floorplans/upload` stores the file in the same storage bucket under `floorplans/` and sets the active row’s `image_path` (room overlays stay on top).

## Deploy on Railway

1. Push this repo to GitHub (or connect the folder in Railway).
2. **New project** → **Deploy from GitHub** → select the repo.
3. Railway will use `Dockerfile` + `railway.toml` (standalone Next.js on port 3000).
4. In **Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_STORAGE_BUCKET` = `room-images`
   - Optional: `NEXT_PUBLIC_SHOW_FLOORPLAN_EDIT` = `false` in production
5. Deploy. Railway sets `PORT`; the container listens on `3000` by default (mapped by Railway).

If you prefer **Nixpacks** instead of Docker, remove or rename `railway.toml` and set the **Root Directory** to this folder; add the same environment variables.

## Project layout

- `app/page.tsx` — server page, loads rooms/floorplan
- `app/api/*` — rooms, floorplans, images, upload
- `components/*` — floor plan, sidebar, gallery, lightbox, uploader, dev editor
- `lib/` — Supabase helpers, types, mock seed data
- `public/floorplans/` — default dark base SVG
