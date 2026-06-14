# Supabase History Setup

Gunakan Supabase untuk menyimpan `Sejarah Jana` secara kekal selepas deploy semula.

1. Buka Supabase project.
2. Buka SQL Editor.
3. Jalankan kandungan `supabase/schema.sql`.
4. Di Render, tambah environment variables:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
5. Jangan letak service role key dalam frontend atau GitHub.

Jika Supabase variables tidak ditetapkan, aplikasi akan kembali menggunakan fail tempatan `data/history.local.json`.
