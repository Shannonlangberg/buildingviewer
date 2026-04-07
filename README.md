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

### Before deploy (Supabase)

1. Create a project at [supabase.com](https://supabase.com).
2. **SQL Editor** → run `supabase/setup-all.sql` once (schema + seed).
3. **Project Settings → API** — keep this tab open; you’ll paste URL and keys into Railway.

### Railway steps

1. Push this folder to GitHub (the repo root should be **`mt-barker-building`** — the directory that contains `package.json` and `Dockerfile`).  
   If the repo root is the parent “Building Viewer” folder instead, open the service **Settings → Root Directory** and set **`mt-barker-building`**.
2. [railway.app](https://railway.app) → **New project** → **Deploy from GitHub** → pick the repo.
3. Railway detects **`Dockerfile`** + **`railway.toml`** and builds standalone Next.js (listens on **3000**; Railway maps **PORT**).
4. Open the service → **Variables** → add (use **exact** names):

   | Variable | Value |
   |----------|--------|
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase **Project URL** |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase **anon public** key |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase **service_role** secret (required for saves, uploads, zone CRUD) |
   | `NEXT_PUBLIC_STORAGE_BUCKET` | `room-images` |
   | `NEXT_PUBLIC_SHOW_FLOORPLAN_EDIT` | `true` if you want the layout editor in production; otherwise `false` |

   **Important:** `NEXT_PUBLIC_*` variables must be set **before** the Docker build finishes, or redeploy after adding them (Railway passes them into the build so the client bundle gets the Supabase URL).

5. **Settings → Networking** → generate a **public URL** (or attach a custom domain).
6. Trigger a fresh **Deploy** if you added/changed variables after the first failed build.

### After deploy

- Open your Railway URL with **`?edit=1`** (or set `NEXT_PUBLIC_SHOW_FLOORPLAN_EDIT=true`) to unlock **Layout tools** if needed.
- Uploads and gallery URLs use Supabase Storage bucket **`room-images`** (created by `setup-all.sql`).

If you prefer **Nixpacks** instead of Docker, remove or rename `railway.toml` and set **Root Directory** to this folder; use the same variables.

## Project layout

- `app/page.tsx` — server page, loads rooms/floorplan
- `app/api/*` — rooms, floorplans, images, upload
- `components/*` — floor plan, sidebar, gallery, lightbox, uploader, dev editor
- `lib/` — Supabase helpers, types, mock seed data
- `public/floorplans/` — default dark base SVG
